/**
 * End to end, with nothing in the platform mocked: real Postgres, the real API over HTTP, the real
 * connector runtime and its SQLite ledger, and the connector's real builder requests. Only Tally
 * itself is simulated, so nothing here proves how a real TallyPrime behaves.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { randomBytes, createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { generateSigningKey, signEnvelope, type Envelope } from "@hexspare/tally-engine";
import { ConnectorRuntime, type JobPayload } from "@hexspare/connector";
import { FakeTally, seedDemoCompany, type Company } from "@hexspare/fake-tally";
import { createApp } from "../src/app.ts";
import type { Config } from "../src/config.ts";
import { Db, migrate } from "../src/db.ts";
import { Webhooks, isPrivateAddress } from "../src/webhooks.ts";
import { hashToken, randomToken, seal, unseal } from "../src/secrets.ts";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://hexspare:hexspare_dev@127.0.0.1:55432/tally_platform";
const dbName = `t_${randomBytes(6).toString("hex")}`;
const signing = generateSigningKey();
const KID = "ktest";
const SYNCED = ["ledgers", "ledger_groups", "voucher_types", "receipts", "payments"];

let app: Awaited<ReturnType<typeof createApp>>;
let base = "";
let db: Db;
let config: Config;
const servers: Server[] = [];

type Project = { tenant: string; project: string; key: string };
async function makeProject(name: string, scopes = "{read,write,admin}"): Promise<Project> {
  const tenant = (await db.one("INSERT INTO tenant (name) VALUES ($1) RETURNING id", [name])).id;
  const project = (await db.one("INSERT INTO project (tenant_id, name) VALUES ($1, $2) RETURNING id", [tenant, name])).id;
  const key = randomToken("hx_live_");
  await db.query("INSERT INTO api_key (tenant_id, project_id, name, key_prefix, key_hash, scopes) VALUES ($1, $2, 'k', 'hx', $3, $4)", [tenant, project, hashToken(key), scopes]);
  return { tenant, project, key };
}

async function call(p: { key: string } | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method, headers: { ...(p ? { authorization: `Bearer ${p.key}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

interface World { tally: FakeTally; company: Company; rt: ConnectorRuntime; dev: Project; connectionId: string; dataPath: string; trusted: Record<string, string> }

function runtime(tally: FakeTally, dataPath: string, over: Partial<ConstructorParameters<typeof ConnectorRuntime>[0]> = {}) {
  const rt = new ConnectorRuntime({ cloudUrl: base, tallyPort: tally.port, dataPath, trustedKeys: { [KID]: signing.publicKeyPem }, batchSize: 2, keysIntervalMs: 0, ...over });
  rt.datasetFilter = (n) => SYNCED.includes(n);
  return rt;
}

/** The whole connect flow, the way a developer and a customer go through it. */
async function connect(opts: { rules?: Record<string, string>; customDefault?: string; requestedFields?: unknown[]; dev?: Project; label?: string } = {}): Promise<World> {
  const tally = new FakeTally();
  const company = seedDemoCompany(tally);
  await tally.start();
  const dev = opts.dev ?? await makeProject(`dev-${randomBytes(3).toString("hex")}`);
  const link = await call(dev, "POST", "/v1/connect-links", { label: opts.label ?? "Acme", redirectUrl: "https://app.example/cb?x=1", requestedScopes: ["read", "write"], requestedFields: opts.requestedFields ?? [] });
  expect(link.status).toBe(201);
  const token = link.body.token as string;
  const dataPath = join(mkdtempSync(join(tmpdir(), "hxconn-")), "c.sqlite");
  const rt = runtime(tally, dataPath);
  await rt.enroll(token);
  const state = await call(null, "GET", `/connect/${token}/state`);
  expect(state.body.status).toBe("awaiting_approval");
  expect(state.body.companies[0].name).toBe(company.name);
  const approve = await call(null, "POST", `/connect/${token}/approve`, { companyGuid: company.guid, rules: opts.rules ?? {}, customDefault: opts.customDefault ?? "public" });
  expect(approve.status).toBe(200);
  expect(approve.body.redirect).toContain(`connection_id=${approve.body.connectionId}`);
  await rt.startChannel();
  return { tally, company, rt, dev, connectionId: approve.body.connectionId, dataPath, trusted: { [KID]: signing.publicKeyPem } };
}

async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 5000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - start > ms) throw new Error(`Timed out waiting; last value ${JSON.stringify(v)}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

const receipt = (n: string, over: object = {}) => ({
  date: "2026-11-03", narration: `Instalment ${n}`,
  entries: [{ ledger: "HDFC Bank", side: "Dr", amountPaise: 25000000 }, { ledger: "A-1203 Customer", side: "Cr", amountPaise: 25000000 }], ...over,
});

const worlds: World[] = [];
beforeAll(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  config = {
    databaseUrl: url.toString(), publicUrl: "http://localhost", consoleUrl: "http://localhost:3001", allowSignup: true, port: 0,
    signing: { kid: KID, privateKeyPem: signing.privateKeyPem }, secretsKey: randomBytes(32), allowPrivateWebhooks: true,
    migrationsDir: join(process.cwd(), "../../db/migrations"), publicDir: join(process.cwd(), "public"), liveTimeoutMs: 8000,
  };
  await migrate(config.databaseUrl, config.migrationsDir);
  app = await createApp(config);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  base = base.replace("[::1]", "127.0.0.1");
  db = new Db(config);
});
afterAll(async () => {
  for (const w of worlds) { await w.rt.stop(); w.rt.close(); await w.tally.stop(); }
  for (const s of servers) s.close();
  await app?.close();
  await db?.pool.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.end();
});

describe("migrations", () => {
  it("are idempotent", async () => expect(await migrate(config.databaseUrl, config.migrationsDir)).toEqual([]));
  it("a second project can link the same company on the same install (R1)", async () => {
    const c = await db.one("SELECT conname FROM pg_constraint WHERE conname = 'connection_project_install_company_key'");
    expect(c).toBeTruthy();
  });
});

describe("connect flow and synced reads", () => {
  let w: World;
  beforeAll(async () => {
    w = await connect({ requestedFields: [{ dataset: "ledgers", name: "apartmentNo", expr: "$LEDAppartmentNo", type: "text" }], rules: { "ledgers.incomeTaxNumber": "masked", "ledgers.ledgerMobile": "excluded", "ledgers.apartmentNo": "public" } });
    worlds.push(w);
    await w.rt.syncOnce();
  });

  it("the link token is stored only as a hash", async () => {
    const rows = (await db.query("SELECT token FROM connect_link")).rows;
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.token))).toBe(true);
  });

  it("a used link cannot be used again", async () => {
    const link = await call(w.dev, "POST", "/v1/connect-links", {});
    const rt2 = runtime(w.tally, join(mkdtempSync(join(tmpdir(), "hx-")), "c.sqlite"));
    await rt2.enroll(link.body.token);
    const first = await call(null, "POST", `/connect/${link.body.token}/approve`, { companyGuid: "guid-other" });
    expect(first.status).toBe(422);
    const ok = await call(null, "POST", `/connect/${link.body.token}/approve`, { companyGuid: w.company.guid });
    expect(ok.status).toBe(200);
    expect((await call(null, "POST", `/connect/${link.body.token}/approve`, { companyGuid: w.company.guid })).status).toBe(409);
    await expect(rt2.enroll(link.body.token)).rejects.toThrow(/invalid, expired, or already used/);
    rt2.close();
  });

  it("the page reads as connected, and serves HTML", async () => {
    expect((await call(null, "GET", "/connect/not-a-token/state")).status).toBe(404);
    const page = await fetch(`${base}/connect/anything`);
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await page.text()).toContain("Connect your Tally");
  });

  it("reads a ledger with its custom field, without any TDL from the developer (the PRD's goal)", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=100`);
    expect(r.status).toBe(200);
    const a = r.body.data.find((x: any) => x.name === "A-1203 Customer");
    expect(a.apartmentNo).toBe("A-1203");
    expect(a.parent).toBe("Sundry Debtors");
    expect(a.openingBalance).toEqual({ paise: 25000000, side: "Cr" });
    expect(a.id).toMatch(/^\d+$/);
    expect(a).not.toHaveProperty("tallySerial");
  });

  it("keeps double spaces in names, and strips Tally's &#4; marker", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=100`);
    expect(r.body.data.map((x: any) => x.name)).toContain("EAGLE  TRADERS");
  });

  it("every response carries freshness", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers`);
    expect(r.headers.get("x-tally-connection-status")).toBe("active");
    expect(r.headers.get("x-tally-last-sync")).toBeTruthy();
    expect(r.headers.get("x-tally-connector-online")).toBe("true");
    expect(r.body.meta.mode).toBe("synced");
  });

  it("reads vouchers with nested lines and exact money", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/receipts`);
    expect(r.body.data).toHaveLength(2);
    const v = r.body.data.find((x: any) => x.voucherNumber === "2");
    expect(v.date).toBe("2026-06-15");
    const bank = v.ledgerEntries.find((e: any) => e.ledgerName === "HDFC Bank");
    expect(bank.amount).toEqual({ paise: 5000029, side: "Dr" });
    const first = r.body.data.find((x: any) => x.voucherNumber === "1");
    const party = first.ledgerEntries.find((e: any) => e.ledgerName === "A-1203 Customer");
    expect(party.billAllocations[0].billNo ?? party.billAllocations[0].name).toBeDefined();
  });

  it("pages with a stable cursor and never repeats or skips", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const r: any = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=1${cursor ? `&cursor=${cursor}` : ""}`);
      expect(r.status).toBe(200);
      seen.push(...r.body.data.map((x: any) => x.id));
      cursor = r.body.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(4);
  });

  it("rejects a forged cursor", async () => {
    expect((await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?cursor=${Buffer.from('["x; drop","1"]').toString("base64url")}`)).status).toBe(400);
  });

  it("selects fields and fetches one record", async () => {
    const list = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?fields=name`);
    expect(Object.keys(list.body.data[0]).sort()).toEqual(["alterId", "id", "name", "updatedAt"]);
    const one = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers/${list.body.data[0].id}`);
    expect(one.body.name).toBe(list.body.data[0].name);
    expect((await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers/999999`)).status).toBe(404);
    expect((await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers/1;drop`)).status).toBe(404);
  });

  it("an unknown dataset is a 404 that points to the schema", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/nope`);
    expect(r.status).toBe(404);
    expect(r.body.error.message).toContain("schema");
  });

  it("publishes a versioned schema and OpenAPI document (R3)", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/schema`);
    expect(r.body.version).toBe(1);
    expect(r.body.openapi.openapi).toBe("3.1.0");
    expect(r.body.openapi.paths[`/v1/connections/{id}/receipts`].post).toBeDefined();
    expect(r.body.datasets.find((d: any) => d.name === "ledgers").fields.find((f: any) => f.name === "apartmentNo").custom).toBe(true);
  });
});

describe("privacy (R1): what the customer keeps private never reaches the cloud", () => {
  it("masked and excluded fields, at rest in the database", async () => {
    const w = await connect({
      requestedFields: [{ dataset: "ledgers", name: "panNo", expr: "$LEDPANNO", type: "text" }],
      rules: { "ledgers.incomeTaxNumber": "excluded", "ledgers.panNo": "masked" },
    });
    worlds.push(w);
    await w.rt.syncOnce();
    const dump = JSON.stringify((await db.query("SELECT body FROM record WHERE connection_id = $1", [w.connectionId])).rows);
    expect(dump).not.toContain("ABCDE1234F");
    expect(dump).not.toContain("SECRETPAN99");
    const a = (await db.one("SELECT body FROM record WHERE connection_id = $1 AND body->>'name' = 'A-1203 Customer'", [w.connectionId])).body;
    expect(a.panNo).toBe("*******AN99");
    expect(a).not.toHaveProperty("incomeTaxNumber");
    expect((await db.query("SELECT 1 FROM record WHERE connection_id = $1 AND raw IS NOT NULL", [w.connectionId])).rowCount).toBe(0);
  });

  it("an excluded field is not even requested from Tally", async () => {
    const w = await connect({ rules: { "ledgers.incomeTaxNumber": "excluded" } });
    worlds.push(w);
    w.tally.requests = [];
    await w.rt.syncOnce();
    const ledgerRequest = w.tally.requests.find((x) => x.includes("LedgerXML"))!;
    expect(/<LINE NAME="LedgerXML"[^>]*><LEFTFIELDS>([^<]*)/.exec(ledgerRequest)![1]).not.toContain("MBI_LEDPAN");
  });

  it("a field the cloud adds later takes the customer's default, even if the cloud says public", async () => {
    const w = await connect({ customDefault: "masked" });
    worlds.push(w);
    await w.rt.syncOnce();
    const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/fields`, { fields: [{ dataset: "ledgers", name: "secretCode", expr: "$LEDPANNO", type: "text", privacy: "public" }] });
    expect(r.status).toBe(201);
    await w.rt.syncOnce();
    const a = (await db.one("SELECT body FROM record WHERE connection_id = $1 AND body->>'name' = 'A-1203 Customer'", [w.connectionId])).body;
    expect(a.secretCode).toBe("*******AN99");
  });

  it("the customer can tighten locally, and the cloud cannot loosen it", async () => {
    const w = await connect({ customDefault: "public" });
    worlds.push(w);
    await w.rt.syncOnce();
    w.rt.tighten(w.connectionId, "ledgers.parent", "excluded");
    w.company.masters.ledger![0]!.alterid = w.tally.next();
    await w.rt.syncOnce();
    const row = (await db.one("SELECT body FROM record WHERE connection_id = $1 AND body->>'name' = 'HDFC Bank'", [w.connectionId])).body;
    expect(row).not.toHaveProperty("parent");
  });
});

describe("custom-field discovery (R4)", () => {
  let w: World;
  beforeAll(async () => { w = await connect({ customDefault: "public" }); worlds.push(w); await w.rt.syncOnce(); });

  it("finds UDFs, with masked samples only", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/discovery`);
    expect(r.status).toBe(200);
    const apt = r.body.data.find((u: any) => u.udfName === "LEDAPPARTMENTNO");
    expect(apt).toMatchObject({ tallyType: "Ledger", index: 1010, type: "text", suggestedExpr: "$LEDAPPARTMENTNO" });
    expect(apt.samples).toContain("**1203");
    expect(JSON.stringify(r.body)).not.toContain("SECRETPAN99");
    expect(JSON.stringify((await db.query("SELECT sample_values FROM discovered_field")).rows)).not.toContain("SECRETPAN99");
  });

  it("a mapped UDF appears on the next schema version, backfilled, with no connector rebuild", async () => {
    const before = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers`);
    expect(before.body.data[0]).not.toHaveProperty("apartmentNo");
    const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/fields`, { fields: [{ dataset: "ledgers", name: "apartmentNo", expr: "$LEDAPPARTMENTNO", type: "text", udfName: "LEDAPPARTMENTNO", udfIndex: 1010 }] });
    expect(r.status).toBe(201);
    expect(r.body.version).toBe(2);
    await w.rt.syncOnce();
    const after = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=100`);
    expect(after.body.data.find((x: any) => x.name === "A-1203 Customer").apartmentNo).toBe("A-1203");
    expect((await db.one("SELECT is_mapped FROM discovered_field WHERE connection_id = $1 AND udf_name = 'LEDAPPARTMENTNO'", [w.connectionId])).is_mapped).toBe(true);
  });

  it("refuses an expression that could run an action", async () => {
    for (const expr of ["$$ExecuteAction:x", "$$Call:y", "$Name</SET><FUNCTION>"]) {
      const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/fields`, { fields: [{ dataset: "ledgers", name: "evil", expr, type: "text" }] });
      expect(r.status).toBe(422);
    }
  });

  it("rollback re-pins the earlier bundle", async () => {
    const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/rollback`, { version: 1 });
    expect(r.status).toBe(200);
    expect((await call(w.dev, "GET", `/v1/connections/${w.connectionId}/schema`)).body.version).toBe(1);
    await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/rollback`, { version: 2 });
  });
});

describe("incremental sync and deletions (R5)", () => {
  let w: World;
  beforeEach(async () => {
    w = await connect({});
    worlds.push(w);
    await w.rt.syncOnce();
  });
  const ledgers = async () => (await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=100&includeDeleted=true`)).body.data;

  it("a second sync asks only for what changed, and changes nothing", async () => {
    const before = await ledgers();
    w.tally.requests = [];
    await w.rt.syncOnce();
    expect(w.tally.requests.some((x) => /DeltaSyncFilter/.test(x))).toBe(true);
    expect((await ledgers()).map((x: any) => x.updatedAt)).toEqual(before.map((x: any) => x.updatedAt));
  });

  it("an altered record updates, and updatedSince returns only it", async () => {
    const t0 = (await db.one("SELECT now()::text AS t")).t;
    await new Promise((r) => setTimeout(r, 20));
    const hdfc = w.company.masters.ledger!.find((l) => l.name === "HDFC Bank")!;
    w.tally.touch(hdfc, { parent: "Current Assets" });
    await w.rt.syncOnce();
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?updatedSince=${encodeURIComponent(new Date(t0).toISOString())}`);
    expect(r.body.data.map((x: any) => x.name)).toEqual(["HDFC Bank"]);
    expect(r.body.data[0].parent).toBe("Current Assets");
  });

  it("the watermark moves only after the cloud commits, so a failed upload loses nothing", async () => {
    const hdfc = w.company.masters.ledger!.find((l) => l.name === "HDFC Bank")!;
    w.tally.touch(hdfc, { parent: "Changed While Cloud Down" });
    const savedSecret = w.rt.store.get("device_secret")!;
    const realFetch = globalThis.fetch;
    let block = true;
    globalThis.fetch = (async (input: any, init: any) => {
      if (block && String(input).includes("/batches")) throw new Error("network down");
      return realFetch(input, init);
    }) as typeof fetch;
    const wmBefore = w.rt.store.dataset(w.connectionId, "ledgers").watermark;
    await expect(w.rt.syncOnce()).rejects.toThrow();
    expect(w.rt.store.dataset(w.connectionId, "ledgers").watermark).toBe(wmBefore);
    block = false;
    globalThis.fetch = realFetch;
    await w.rt.syncOnce();
    expect((await ledgers()).find((x: any) => x.name === "HDFC Bank").parent).toBe("Changed While Cloud Down");
    expect(savedSecret).toBeTruthy();
  });

  it("a record deleted in Tally is soft-deleted, and comes back if restored", async () => {
    const list = w.company.masters.ledger!;
    const gone = list.splice(list.findIndex((l) => l.name === "Sales"), 1)[0]!;
    await w.rt.syncOnce();
    const row = (await ledgers()).find((x: any) => x.name === "Sales");
    expect(row.deleted).toBe(true);
    const visible = (await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=100`)).body.data;
    expect(visible.map((x: any) => x.name)).not.toContain("Sales");
    list.push(gone);
    w.tally.touch(gone);
    await w.rt.syncOnce();
    expect((await ledgers()).find((x: any) => x.name === "Sales").deleted).toBeUndefined();
  });

  it("an empty key list is never believed", async () => {
    const before = (await ledgers()).filter((x: any) => !x.deleted).length;
    const saved = w.company.masters.ledger!;
    w.company.masters.ledger = [];
    await w.rt.syncOnce();
    expect((await ledgers()).filter((x: any) => !x.deleted).length).toBe(before);
    w.company.masters.ledger = saved;
  });

  it("a mass deletion is held for an operator rather than applied", async () => {
    for (let i = 0; i < 20; i++) w.tally.addMaster(w.company, "ledger", { name: `Extra ${i}`, parent: "Sundry Debtors" });
    await w.rt.syncOnce();
    const kept = w.company.masters.ledger!.slice(0, 3);
    w.company.masters.ledger = kept;
    w.tally.touch(kept[0]!);
    await w.rt.syncOnce();
    expect((await ledgers()).filter((x: any) => x.deleted).length).toBe(0);
    const issue = await db.one("SELECT message, severity FROM sync_issue WHERE connection_id = $1 AND kind = 'deletion_held'", [w.connectionId]);
    expect(issue.severity).toBe("warning");
    expect(issue.message).toContain("Nothing was deleted");
  });

  it("a failed Tally response during the deletion check deletes nothing", async () => {
    const before = (await ledgers()).filter((x: any) => !x.deleted).length;
    w.tally.options.nextResponseOverride = "<RESPONSE>Unknown Request, cannot be processed</RESPONSE>";
    await w.rt.syncOnce().catch(() => {});
    expect((await ledgers()).filter((x: any) => !x.deleted).length).toBe(before);
  });

  it("AlterIDs going backwards (a restored backup) triggers a repair that reaches the new data", async () => {
    const hdfc = w.company.masters.ledger!.find((l) => l.name === "HDFC Bank")!;
    for (const l of w.company.masters.ledger!) l.alterid = 5;
    hdfc.parent = "Restored From Backup";
    await w.rt.syncOnce();
    expect(w.rt.store.dataset(w.connectionId, "ledgers").repair).toBe(true);
    await w.rt.syncOnce();
    expect((await ledgers()).find((x: any) => x.name === "HDFC Bank").parent).toBe("Restored From Backup");
    expect(w.rt.store.dataset(w.connectionId, "ledgers").repair).toBe(false);
  });

  it("a record altered during a paged first sync is picked up by the next delta, not missed", async () => {
    const fresh = await connect({});
    worlds.push(fresh);
    fresh.rt.datasetFilter = (n) => n === "receipts";
    // April's voucher is altered right after April's page is read, while later months are still to come.
    const april = fresh.company.vouchers.find((v) => v.date === "20260410")!;
    const realPost = fresh.rt.tally.post.bind(fresh.rt.tally);
    let altered = false;
    fresh.rt.tally.post = (async (xml: string, p: never, t: never) => {
      const out = await realPost(xml, p, t);
      if (!altered && xml.includes("&gt;= 20260401")) {
        altered = true;
        fresh.tally.touch(april, { narration: "Altered mid-sync" });
      }
      return out;
    }) as never;
    await fresh.rt.syncOnce();
    expect(altered).toBe(true);
    const list = async () => (await call(fresh.dev, "GET", `/v1/connections/${fresh.connectionId}/receipts`)).body.data.map((x: any) => x.narration);
    expect(await list()).not.toContain("Altered mid-sync");
    await fresh.rt.syncOnce();
    expect(await list()).toContain("Altered mid-sync");
  });

  it("Tally only ever sees one request at a time", async () => {
    w.tally.options.latencyMs = 3;
    w.tally.maxInFlight = 0;
    await Promise.all([
      w.rt.syncOnce(),
      call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?live=true`),
      call(w.dev, "GET", `/v1/connections/${w.connectionId}/receipts?live=true`),
    ]);
    w.tally.options.latencyMs = 0;
    expect(w.tally.maxInFlight).toBe(1);
  });
});

describe("live reads (R6)", () => {
  let w: World;
  beforeAll(async () => { w = await connect({ rules: { "ledgers.incomeTaxNumber": "masked" } }); worlds.push(w); await w.rt.syncOnce(); });

  it("reads through the channel, with privacy still applied", async () => {
    w.tally.touch(w.company.masters.ledger![0]!, { parent: "Only In Tally Yet" });
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?live=true`);
    expect(r.status).toBe(200);
    expect(r.body.meta.mode).toBe("live");
    expect(r.body.data.find((x: any) => x.name === "HDFC Bank").parent).toBe("Only In Tally Yet");
    const a = r.body.data.find((x: any) => x.name === "A-1203 Customer");
    expect(a.incomeTaxNumber).toBe("******234F");
    expect(JSON.stringify(r.body)).not.toContain("ABCDE1234F");
  });

  it("enforces the record limit", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?live=true&limit=1`);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.truncated).toBe(true);
    expect((await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?limit=99999`)).status).toBe(400);
  });

  it("fetches one record live", async () => {
    const id = String(w.company.masters.ledger![0]!.masterid);
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers/${id}?live=true`);
    expect(r.body.id).toBe(id);
  });

  it("scopes a live voucher read to a date window", async () => {
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/receipts?live=true&from=2026-06-01&to=2026-06-30`);
    expect(r.body.data.map((x: any) => x.voucherNumber)).toEqual(["2"]);
  });

  it("with Tally closed: 503 within 5 seconds, and synced reads still work (R1)", async () => {
    await w.tally.stop();
    const start = Date.now();
    const r = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers?live=true`);
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("tally_unavailable");
    expect(Date.now() - start).toBeLessThan(5000);
    const synced = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/ledgers`);
    expect(synced.status).toBe(200);
    const s = await until(() => call(w.dev, "GET", `/v1/connections/${w.connectionId}`), (x) => x.body.tallyOpen === false);
    expect(s.body.connectorOnline).toBe(true);
    await w.tally.start();
  });

  it("with the connector offline: 503 at once", async () => {
    const other = await connect({});
    worlds.push(other);
    await other.rt.stop();
    await until(() => call(other.dev, "GET", `/v1/connections/${other.connectionId}`), (x) => x.body.connectorOnline === false);
    const r = await call(other.dev, "GET", `/v1/connections/${other.connectionId}/ledgers?live=true`);
    expect(r.status).toBe(503);
    expect(r.body.error.details.reason).toBe("connector_offline");
  });
});

describe("write jobs (R7)", () => {
  let w: World;
  beforeEach(async () => { w = await connect({}); worlds.push(w); await w.rt.syncOnce(); });
  const post = (key: string, body: object = receipt(key), dataset = "receipts") => call(w.dev, "POST", `/v1/connections/${w.connectionId}/${dataset}`, body, { "idempotency-key": key });
  const job = async (id: string, ok = (j: any) => !["queued", "sent"].includes(j.status)) => (await until(() => call(w.dev, "GET", `/v1/write-jobs/${id}`), (r) => ok(r.body))).body;
  const posted = (narration: string) => w.company.vouchers.filter((v) => v.narration === `Instalment ${narration}`).length;

  it("posts a receipt, and the signs and amounts reach Tally correctly", async () => {
    const r = await post("k1");
    expect(r.status).toBe(202);
    const done = await job(r.body.id);
    expect(done).toMatchObject({ status: "completed", created: 1, errors: [] });
    const v = w.company.vouchers.find((x) => x.narration === "Instalment k1")!;
    expect(String(v.masterid)).toBe(done.tallyId);
    expect(v.ledgerentries[0]).toMatchObject({ ledgername: "HDFC Bank", amount: "-250000.00" });
    expect(v.ledgerentries[1]).toMatchObject({ ledgername: "A-1203 Customer", amount: "250000.00" });
  });

  it("requires an idempotency key", async () => {
    const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/receipts`, receipt("x"));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("idempotency_key_required");
  });

  it("the same key returns the same job and posts once, however many times it is sent", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => post("same")));
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    await job(results[0]!.body.id);
    await w.rt.runJobsOnce();
    expect(posted("same")).toBe(1);
    const again = await post("same");
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.status).toBe("completed");
  });

  it("the same key with a different body is refused", async () => {
    await post("conflict");
    const r = await post("conflict", receipt("something else"));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("idempotency_conflict");
  });

  describe("the crash window: Tally commits, the answer is lost, the connector retries", () => {
    it("a retry finds the voucher instead of posting again, across a connector restart", async () => {
      w.tally.options.crashAfterCommit = 1;
      const r = await post("crash");
      await until(async () => w.company.vouchers.length, (n) => n === 3);
      await new Promise((res) => setTimeout(res, 100));
      expect((await call(w.dev, "GET", `/v1/write-jobs/${r.body.id}`)).body.status).toBe("sent");
      await w.rt.stop();
      w.rt.close();
      const restarted = runtime(w.tally, w.dataPath);
      w.rt = restarted;
      await restarted.runJobsOnce();
      const done = await job(r.body.id);
      expect(done).toMatchObject({ status: "completed", deduplicated: true });
      expect(posted("crash")).toBe(1);
    });

    it("zero duplicates even if Tally's REMOTEID does not dedupe (the open question)", async () => {
      w.tally.options.remoteIdBehavior = "duplicate";
      w.tally.options.crashAfterCommit = 1;
      const r = await post("crash2");
      await until(async () => posted("crash2"), (n) => n === 1);
      await new Promise((res) => setTimeout(res, 100));
      await w.rt.runJobsOnce();
      await job(r.body.id);
      expect(posted("crash2")).toBe(1);
    });

    it("if the lookup cannot see REMOTEID either, Tally's own dedupe is the second line of defence", async () => {
      w.tally.options.guidMatchesRemoteId = false;
      w.tally.options.crashAfterCommit = 1;
      const r = await post("crash3");
      await until(async () => posted("crash3"), (n) => n === 1);
      await new Promise((res) => setTimeout(res, 100));
      await w.rt.runJobsOnce();
      await job(r.body.id);
      expect(posted("crash3")).toBe(1);
    });

    it("documents the one unsafe combination, which is why the Tally test must run before Phase 2", async () => {
      w.tally.options.remoteIdBehavior = "duplicate";
      w.tally.options.guidMatchesRemoteId = false;
      w.tally.options.crashAfterCommit = 1;
      const r = await post("crash4");
      await until(async () => posted("crash4"), (n) => n === 1);
      await new Promise((res) => setTimeout(res, 100));
      await w.rt.runJobsOnce();
      await job(r.body.id);
      expect(posted("crash4")).toBe(2);
    });
  });

  it("with Tally closed a job stays queued, then runs when Tally opens", async () => {
    await w.tally.stop();
    const r = await post("later");
    expect(r.status).toBe(202);
    await w.rt.runJobsOnce();
    expect((await call(w.dev, "GET", `/v1/write-jobs/${r.body.id}`)).body.status).toBe("sent");
    await w.tally.start();
    await w.rt.runJobsOnce();
    expect((await job(r.body.id)).status).toBe("completed");
    expect(posted("later")).toBe(1);
  });

  it("an unknown ledger is reported per line by :validate, and again at run time, in plain words", async () => {
    const bad = receipt("bad", { entries: [{ ledger: "HDFC Bank", side: "Dr", amountPaise: 100 }, { ledger: "Ghost Ledger", side: "Cr", amountPaise: 100 }] });
    const v = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/receipts:validate`, bad);
    expect(v.status).toBe(200);
    expect(v.body.valid).toBe(false);
    expect(v.body.issues[0]).toMatchObject({ code: "unknown_ledger", path: "entries[1].ledger" });
    const r = await post("bad", bad);
    const done = await job(r.body.id);
    expect(done.status).toBe("rejected");
    expect(done.errors[0].message).toContain('Ledger "Ghost Ledger" does not exist');
    expect(w.tally.requests.some((x) => x.includes("Instalment bad"))).toBe(false);
  });

  it(":validate catches every known rejection cause, and passes a good voucher", async () => {
    const v = (body: object) => call(w.dev, "POST", `/v1/connections/${w.connectionId}/receipts:validate`, body);
    expect((await v(receipt("ok"))).body).toEqual({ valid: true, issues: [] });
    expect((await v(receipt("x", { date: "2020-01-01" }))).body.issues[0].code).toBe("date_before_books");
    expect((await v(receipt("x", { voucherType: "Nope" }))).body.issues[0].code).toBe("unknown_voucher_type");
    expect((await v(receipt("x", { entries: [{ ledger: " HDFC Bank", side: "Dr", amountPaise: 1 }, { ledger: "Sales", side: "Cr", amountPaise: 1 }] }))).body.issues[0].code).toBe("ledger_name_spaces");
    expect((await v(receipt("x", { entries: [{ ledger: "HDFC Bank", side: "Dr", amountPaise: 2 }, { ledger: "Sales", side: "Cr", amountPaise: 1 }] }))).body.issues[0].code).toBe("unbalanced_voucher");
    w.company.masters.vouchertype!.find((t) => t.name === "Receipt")!.numberingmethod = "Manual";
    expect((await v(receipt("x"))).body.issues[0].code).toBe("voucher_number_required");
  });

  it("Tally's own rejection comes back in plain words", async () => {
    const r = await post("race");
    // The ledger disappears between the preflight and the post, which only Tally can catch.
    const realPost = w.rt.tally.post.bind(w.rt.tally);
    w.rt.tally.post = (async (xml: string, p: never, t: never) => {
      if (xml.includes("Import Data")) w.company.masters.ledger = w.company.masters.ledger!.filter((l) => l.name !== "HDFC Bank");
      return realPost(xml, p, t);
    }) as never;
    await w.rt.runJobsOnce();
    const done = await job(r.body.id);
    expect(done.status).toBe("failed");
    expect(done.errors[0]).toMatchObject({ code: "unknown_ledger" });
    expect(done.errors[0].message).toContain("Tally said");
    const issue = await db.one("SELECT kind FROM sync_issue WHERE write_job_id = $1", [r.body.id]);
    expect(issue.kind).toBe("write_rejected");
  });

  it("logs every write with key, payload hash and result", async () => {
    const r = await post("audit");
    await job(r.body.id);
    const row = await db.one("SELECT idempotency_key, payload_hash, result, project_id FROM write_job WHERE id = $1", [r.body.id]);
    expect(row.idempotency_key).toBe("audit");
    expect(row.payload_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.result.created).toBe(1);
    expect(row.project_id).toBe(w.dev.project);
  });

  it("alters a voucher by record ID", async () => {
    const list = await call(w.dev, "GET", `/v1/connections/${w.connectionId}/receipts`);
    const id = list.body.data[0].id;
    const r = await call(w.dev, "PATCH", `/v1/connections/${w.connectionId}/receipts/${id}`, receipt("altered"), { "idempotency-key": "alter-1" });
    expect(r.status).toBe(202);
    const done = await job(r.body.id);
    expect(done).toMatchObject({ status: "completed", altered: 1 });
    expect(w.company.vouchers.find((v) => String(v.masterid) === id)!.narration).toBe("Instalment altered");
    expect(w.company.vouchers).toHaveLength(2);
  });

  it("creates a ledger, and masters run before vouchers that need them", async () => {
    await w.rt.stop();
    const v = await post("needs-ledger", receipt("n", { entries: [{ ledger: "HDFC Bank", side: "Dr", amountPaise: 100 }, { ledger: "New Party", side: "Cr", amountPaise: 100 }] }));
    const l = await post("the-ledger", { name: "New Party", parent: "Sundry Debtors" }, "ledgers");
    await w.rt.runJobsOnce();
    expect((await job(l.body.id)).status).toBe("completed");
    await w.rt.runJobsOnce();
    expect((await job(v.body.id)).status).toBe("completed");
  });

  it("writes a discovered UDF on a voucher", async () => {
    await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/fields`, { fields: [{ dataset: "receipts", name: "stage", expr: "$VCHSTAGE", type: "text", privacy: "public", udfName: "VCHSTAGE", udfIndex: 1020, udfType: "String" }] });
    const r = await post("udf", receipt("udf", { customFields: { stage: "Plinth" } }));
    await job(r.body.id);
    expect(w.company.vouchers.find((v) => v.narration === "Instalment udf")!.vchstage).toBe("Plinth");
    expect(w.tally.requests.find((x) => x.includes("Instalment udf") && x.includes("Import Data"))).toContain('xmlns:UDF="TallyUDF"');
    const bad = await post("udf2", receipt("udf2", { customFields: { nope: "x" } }));
    expect(bad.status).toBe(422);
    expect(bad.body.error.details[0].code).toBe("unknown_custom_field");
  });

  it("refuses a dataset not yet writable, and rejects delete fields in the body", async () => {
    expect((await post("s", receipt("s"), "sales")).status).toBe(405);
    expect((await post("e", { ...receipt("e"), action: "Delete" })).status).toBe(400);
    expect((await post("s2", receipt("s2"), "ledger_groups")).status).toBe(405);
  });

  it("XML in a developer's values stays data", async () => {
    const evil = "</NARRATION></VOUCHER><VOUCHER ACTION=\"Delete\"><X>";
    const r = await post("xml", receipt("xml", { narration: evil }));
    const done = await job(r.body.id);
    expect(done.status).toBe("completed");
    expect(w.company.vouchers.find((v) => v.narration === evil)).toBeDefined();
  });
});

describe("the connector refuses what it should not run", () => {
  let w: World;
  beforeAll(async () => { w = await connect({}); worlds.push(w); await w.rt.syncOnce(); });
  const importXml = () => `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${w.company.name.replace("&", "&amp;")}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE><VOUCHER REMOTEID="r" VCHTYPE="Receipt" ACTION="Delete"><DATE>20261103</DATE></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;

  /** Injects a job straight into the queue, as a compromised cloud could. */
  async function inject(envelope: unknown) {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO write_job (id, tenant_id, project_id, connection_id, dataset_name, action, idempotency_key, request_body, payload_hash, envelope)
       VALUES ($1, $2, $3, $4, 'receipts', 'create', $5, '{}', 'x', $6)`, [id, w.dev.tenant, w.dev.project, w.connectionId, id, JSON.stringify(envelope)]);
    return id;
  }
  const base = (id: string): JobPayload => ({ jobId: id, connectionId: w.connectionId, scope: "write", dataset: "receipts", action: "create", company: w.company.name, kind: "voucher", importXml: importXml(), lookupXml: null, preflight: { ledgers: "", voucherTypes: "", companies: "" }, input: {}, defaultType: "Receipt" });

  it("a validly signed Delete", async () => {
    const id = crypto.randomUUID();
    const dbId = await inject(signEnvelope("job", { ...base(id) }, { kid: KID, privateKeyPem: signing.privateKeyPem }));
    await db.query("UPDATE write_job SET envelope = $2 WHERE id = $1", [dbId, JSON.stringify(signEnvelope("job", { ...base(dbId) }, { kid: KID, privateKeyPem: signing.privateKeyPem }))]);
    const count = w.tally.requests.length;
    await w.rt.runJobsOnce();
    expect(w.tally.requests.slice(count).filter((x) => x.includes("Import Data"))).toEqual([]);
    expect((await db.one("SELECT status, result FROM write_job WHERE id = $1", [dbId])).status).toBe("rejected");
  });

  it("a job signed by the wrong key", async () => {
    const other = generateSigningKey();
    const dbId = await inject({});
    const env = signEnvelope("job", { ...base(dbId) }, { kid: KID, privateKeyPem: other.privateKeyPem });
    await db.query("UPDATE write_job SET envelope = $2 WHERE id = $1", [dbId, JSON.stringify(env)]);
    const count = w.tally.requests.length;
    await w.rt.runJobsOnce();
    expect(w.tally.requests.length).toBe(count);
    expect((await db.one("SELECT status FROM write_job WHERE id = $1", [dbId])).status).toBe("rejected");
  });

  it("a tampered job body", async () => {
    const dbId = await inject({});
    const env = signEnvelope("job", { ...base(dbId), scope: "read" as never }, { kid: KID, privateKeyPem: signing.privateKeyPem });
    const tampered: Envelope<JobPayload> = { ...env, payload: { ...env.payload, scope: "write" } };
    await db.query("UPDATE write_job SET envelope = $2 WHERE id = $1", [dbId, JSON.stringify(tampered)]);
    await w.rt.runJobsOnce();
    expect((await db.one("SELECT status FROM write_job WHERE id = $1", [dbId])).status).toBe("rejected");
  });

  it("an import smuggled into a read probe, and an expired probe", async () => {
    const sign = (p: object) => signEnvelope("probe", p, { kid: KID, privateKeyPem: signing.privateKeyPem }) as never;
    const payload = { connectionId: w.connectionId, op: "read", dataset: "ledgers", requestXml: importXml(), limit: 1, fields: [], lines: [], rowTag: "X" };
    await expect(w.rt.handleProbe(sign({ ...payload, exp: Date.now() + 60_000 }))).rejects.toThrow(/Only Export/);
    await expect(w.rt.handleProbe(sign({ ...payload, exp: Date.now() - 1 }))).rejects.toThrow(/expired/);
  });

  it("refuses a plain-http remote backend, as the Vyakth connector does", () => {
    expect(() => new ConnectorRuntime({ cloudUrl: "http://api.example.com", dataPath: ":memory:", trustedKeys: {} })).toThrow(/HTTPS/);
  });
});

describe("keys, scopes and tenancy (R8)", () => {
  let a: World, b: World;
  beforeAll(async () => {
    a = await connect({}); b = await connect({});
    worlds.push(a, b);
    await a.rt.syncOnce(); await b.rt.syncOnce();
  });

  it("no key, a bad key, or a revoked key gets 401", async () => {
    const path = `/v1/connections/${a.connectionId}/ledgers`;
    expect((await call(null, "GET", path)).status).toBe(401);
    expect((await call({ key: "hx_live_wrong" }, "GET", path)).status).toBe(401);
    await db.query("UPDATE api_key SET revoked_at = now() WHERE key_hash = $1", [hashToken(a.dev.key)]);
    expect((await call(a.dev, "GET", path)).status).toBe(401);
    await db.query("UPDATE api_key SET revoked_at = NULL WHERE key_hash = $1", [hashToken(a.dev.key)]);
  });

  it("the API key is stored only as a hash", async () => {
    const rows = (await db.query("SELECT key_hash FROM api_key")).rows;
    expect(rows.every((r) => r.key_hash !== a.dev.key && /^[0-9a-f]{64}$/.test(r.key_hash))).toBe(true);
  });

  it("another project's connection looks like it does not exist, on every route", async () => {
    const id = a.connectionId;
    const checks = [
      call(b.dev, "GET", `/v1/connections/${id}`), call(b.dev, "GET", `/v1/connections/${id}/ledgers`), call(b.dev, "GET", `/v1/connections/${id}/ledgers?live=true`),
      call(b.dev, "GET", `/v1/connections/${id}/schema`), call(b.dev, "GET", `/v1/connections/${id}/discovery`), call(b.dev, "DELETE", `/v1/connections/${id}`),
      call(b.dev, "POST", `/v1/connections/${id}/receipts`, receipt("x"), { "idempotency-key": "x" }), call(b.dev, "POST", `/v1/connections/${id}/schema/fields`, { fields: [{ dataset: "ledgers", name: "x", expr: "$X" }] }),
    ];
    for (const r of await Promise.all(checks)) expect(r.status).toBe(404);
    expect((await call(b.dev, "GET", "/v1/connections")).body.data.map((c: any) => c.id)).not.toContain(id);
  });

  it("another project's write job is not visible", async () => {
    const r = await call(a.dev, "POST", `/v1/connections/${a.connectionId}/receipts`, receipt("t"), { "idempotency-key": "t" });
    expect((await call(b.dev, "GET", `/v1/write-jobs/${r.body.id}`)).status).toBe(404);
  });

  it("one connector cannot touch another's connection", async () => {
    const secret = b.rt.store.get("device_secret");
    const res = await fetch(`${base}/connector/v1/connections/${a.connectionId}/bundle`, { headers: { authorization: `Bearer ${secret}` } });
    expect(res.status).toBe(404);
  });

  it("scopes are enforced", async () => {
    const add = async (scopes: string, connectionId: string | null = null) => {
      const key = randomToken("hx_live_");
      await db.query("INSERT INTO api_key (tenant_id, project_id, name, key_prefix, key_hash, scopes, connection_id) VALUES ($1, $2, 'r', 'hx', $3, $4, $5)", [a.dev.tenant, a.dev.project, hashToken(key), scopes, connectionId]);
      return { key };
    };
    const read = await add("{read}");
    const path = `/v1/connections/${a.connectionId}`;
    expect((await call(read, "GET", `${path}/ledgers`)).status).toBe(200);
    const denied = await call(read, "POST", `${path}/receipts`, receipt("r"), { "idempotency-key": "r" });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("insufficient_scope");
    expect((await call(read, "POST", "/v1/connect-links", {})).status).toBe(403);
    const pinned = await add("{read}", crypto.randomUUID());
    expect((await call(pinned, "GET", `${path}/ledgers`)).status).toBe(404);
  });

  it("errors never leak internals", async () => {
    const r = await fetch(`${base}/v1/connect-links`, { method: "POST", headers: { authorization: `Bearer ${a.dev.key}`, "content-type": "application/json" }, body: "{not json" });
    const body = await r.json();
    expect(r.status).toBe(400);
    expect(JSON.stringify(body)).not.toMatch(/stack|node_modules|\.ts/);
  });

  it("two projects can share one company on one install (R1)", async () => {
    const dev2 = await makeProject("second-app");
    const link = await call(dev2, "POST", "/v1/connect-links", {});
    await a.rt.enroll(link.body.token);
    const ok = await call(null, "POST", `/connect/${link.body.token}/approve`, { companyGuid: a.company.guid });
    expect(ok.status).toBe(200);
    a.rt.datasetFilter = (n) => n === "ledger_groups";
    await a.rt.syncOnce();
    a.rt.datasetFilter = (n) => SYNCED.includes(n);
    const r = await call(dev2, "GET", `/v1/connections/${ok.body.connectionId}/ledger_groups`);
    expect(r.body.data.length).toBeGreaterThan(0);
    expect((await call(a.dev, "GET", `/v1/connections/${ok.body.connectionId}`)).status).toBe(404);
  });
});

describe("body limits", () => {
  it("the connector's large-body routes refuse an unauthenticated caller before parsing the body", async () => {
    const big = JSON.stringify({ pad: "x".repeat(3_000_000) });
    const res = await fetch(`${base}/connector/v1/connections/${crypto.randomUUID()}/batches`, { method: "POST", headers: { "content-type": "application/json" }, body: big });
    expect(res.status).toBe(401);
  });
  it("everything else stops at 1 MB", async () => {
    const big = JSON.stringify({ linkToken: "x".repeat(3_000_000), companies: [] });
    expect((await fetch(`${base}/connector/v1/enroll`, { method: "POST", headers: { "content-type": "application/json" }, body: big })).status).toBe(413);
  });
});

describe("revocation (R2)", () => {
  it("the customer revokes from the connector, and reads and writes stop at once", async () => {
    const w = await connect({});
    worlds.push(w);
    await w.rt.syncOnce();
    await w.rt.stop();
    const queued = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/receipts`, receipt("q"), { "idempotency-key": "q" });
    await w.rt.revoke(w.connectionId);
    const path = `/v1/connections/${w.connectionId}`;
    expect((await call(w.dev, "GET", `${path}/ledgers`)).status).toBe(403);
    expect((await call(w.dev, "GET", `${path}/ledgers`)).body.error.code).toBe("connection_revoked");
    expect((await call(w.dev, "POST", `${path}/receipts`, receipt("z"), { "idempotency-key": "z" })).status).toBe(403);
    expect((await call(w.dev, "GET", path)).body.status).toBe("revoked");
    expect((await call(w.dev, "GET", `/v1/write-jobs/${queued.body.id}`)).body.status).toBe("rejected");
    const count = w.tally.requests.length;
    await w.rt.syncOnce();
    await w.rt.runJobsOnce();
    expect(w.tally.requests.filter((x, i) => i >= count && x.includes("Import Data"))).toEqual([]);
    expect(w.company.vouchers.find((v) => v.narration === "Instalment q")).toBeUndefined();
  });
});

describe("webhooks (R8)", () => {
  let w: World;
  let got: { headers: any; body: string }[] = [];
  let failNext = 0;
  let hooks: Webhooks;
  let hook: any;
  beforeAll(async () => {
    const sink = createServer((req, res) => {
      const c: Buffer[] = [];
      req.on("data", (d) => c.push(d));
      req.on("end", () => {
        if (failNext > 0) { failNext--; res.writeHead(500); res.end(); return; }
        got.push({ headers: req.headers, body: Buffer.concat(c).toString() });
        res.writeHead(200); res.end();
      });
    });
    await new Promise<void>((r) => sink.listen(0, "127.0.0.1", r));
    servers.push(sink);
    const port = (sink.address() as { port: number }).port;
    const dev = await makeProject("hooks");
    hook = (await call(dev, "POST", "/v1/webhooks", { url: `http://127.0.0.1:${port}/h`, events: ["record.created", "record.updated", "record.deleted", "write_job.completed", "write_job.failed", "connection.status_changed", "schema.published"] })).body;
    w = await connect({ dev });
    worlds.push(w);
    hooks = new Webhooks(db, config);
  });
  const drain = async () => { for (let i = 0; i < 20; i++) if ((await hooks.deliverDue()) === 0) break; };
  const events = () => got.map((g) => JSON.parse(g.body));

  it("delivers the connection event, signed, and the signature verifies", async () => {
    await drain();
    const e = events().find((x) => x.event === "connection.status_changed");
    expect(e.data).toMatchObject({ connectionId: w.connectionId, status: "active" });
    const g = got.find((x) => JSON.parse(x.body).event === "connection.status_changed")!;
    const [t, v1] = g.headers["x-hexspare-signature"].split(",").map((p: string) => p.split("=")[1]);
    expect(v1).toBe(createHmac("sha256", hook.secret).update(`${t}.${g.body}`).digest("hex"));
  });

  it("the secret is encrypted at rest, and decrypts", async () => {
    const row = await db.one("SELECT secret FROM webhook_endpoint WHERE id = $1", [hook.id]);
    expect(row.secret).not.toContain(hook.secret);
    expect(unseal(row.secret, config.secretsKey)).toBe(hook.secret);
    expect(() => unseal(seal("x", randomBytes(32)), config.secretsKey)).toThrow();
  });

  it("a first sync does not send a webhook per record", async () => {
    got = [];
    await w.rt.syncOnce();
    await drain();
    expect(events().filter((e) => e.event.startsWith("record."))).toEqual([]);
  });

  it("sends record.updated, record.created and record.deleted afterwards, once each", async () => {
    got = [];
    w.tally.touch(w.company.masters.ledger![0]!, { parent: "Changed" });
    w.tally.addMaster(w.company, "ledger", { name: "Brand New", parent: "Sundry Debtors" });
    const list = w.company.masters.ledger!;
    list.splice(list.findIndex((l) => l.name === "Sales"), 1);
    await w.rt.syncOnce();
    await drain();
    const names = events().filter((e) => e.event.startsWith("record.")).map((e) => e.event).sort();
    expect(names).toEqual(["record.created", "record.deleted", "record.updated"]);
    got = [];
    await w.rt.syncOnce();
    await drain();
    expect(events()).toEqual([]);
  });

  it("write_job.completed arrives once, even if the connector reports twice", async () => {
    got = [];
    const r = await call(w.dev, "POST", `/v1/connections/${w.connectionId}/receipts`, receipt("hook"), { "idempotency-key": "hook" });
    await until(() => call(w.dev, "GET", `/v1/write-jobs/${r.body.id}`), (x) => x.body.status === "completed");
    const res = await fetch(`${base}/connector/v1/jobs/${r.body.id}/result`, { method: "POST", headers: { authorization: `Bearer ${w.rt.store.get("device_secret")}`, "content-type": "application/json" }, body: JSON.stringify({ status: "failed", tallyId: null, created: 0, altered: 0, errors: [] }) });
    expect(res.status).toBe(200);
    await drain();
    expect(events().filter((e) => e.event.startsWith("write_job")).map((e) => e.event)).toEqual(["write_job.completed"]);
    expect((await call(w.dev, "GET", `/v1/write-jobs/${r.body.id}`)).body.status).toBe("completed");
  });

  it("retries a failed delivery, with the attempt pushed into the future", async () => {
    got = [];
    failNext = 1;
    await call(w.dev, "POST", `/v1/connections/${w.connectionId}/schema/fields`, { fields: [{ dataset: "ledgers", name: "retryField", expr: "$X", type: "text" }] });
    await drain();
    expect(events()).toEqual([]);
    const pending = await db.one("SELECT attempts, next_retry_at > now() AS future FROM webhook_delivery WHERE delivered_at IS NULL AND endpoint_id = $1", [hook.id]);
    expect(pending).toMatchObject({ attempts: 1, future: true });
    await db.query("UPDATE webhook_delivery SET next_retry_at = now() WHERE delivered_at IS NULL AND endpoint_id = $1", [hook.id]);
    await drain();
    expect(events().map((e) => e.event)).toEqual(["schema.published"]);
  });

  it("replays from a cursor, with the same event ID so a subscriber can dedupe", async () => {
    const page = await call(w.dev, "GET", `/v1/webhooks/${hook.id}/events?limit=2`);
    expect(page.body.data).toHaveLength(2);
    const totalAfter = (await call(w.dev, "GET", `/v1/webhooks/${hook.id}/events?limit=500&cursor=${page.body.nextCursor}`)).body.data;
    got = [];
    const r = await call(w.dev, "POST", `/v1/webhooks/${hook.id}/replay`, { cursor: page.body.nextCursor });
    expect(r.body.replaying).toBe(totalAfter.length);
    await drain();
    expect(got.length).toBe(totalAfter.length);
    expect(events().map((e) => e.id).sort()).toEqual(totalAfter.map((e: any) => e.payload.id).sort());
  });

  it("delivery refuses private addresses in production mode", async () => {
    const strict = new Webhooks(db, { ...config, allowPrivateWebhooks: false });
    await db.query("UPDATE webhook_delivery SET delivered_at = NULL, next_retry_at = now(), attempts = 0 WHERE id = (SELECT id FROM webhook_delivery WHERE endpoint_id = $1 LIMIT 1)", [hook.id]);
    got = [];
    await strict.deliverDue();
    expect(got).toEqual([]);
    await db.query("UPDATE webhook_delivery SET delivered_at = now(), next_retry_at = NULL WHERE endpoint_id = $1", [hook.id]);
    for (const ip of ["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1", "100.64.0.1", "0.0.0.0"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1"]) expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("metering (R9)", () => {
  it("counts every call and write, per connection, with heavier weights for live and writes", async () => {
    const w = await connect({});
    worlds.push(w);
    await w.rt.syncOnce();
    const path = `/v1/connections/${w.connectionId}`;
    await call(w.dev, "GET", `${path}/ledgers`);
    await call(w.dev, "GET", `${path}/ledgers`);
    await call(w.dev, "GET", `${path}/ledgers?live=true`);
    await call(w.dev, "POST", `${path}/receipts`, receipt("m"), { "idempotency-key": "m" });
    await call(w.dev, "POST", `${path}/receipts`, receipt("m"), { "idempotency-key": "m" });
    const r = await call(w.dev, "GET", "/v1/usage");
    const by = Object.fromEntries(r.body.data.map((x: any) => [x.kind, x]));
    expect(by.synced_read).toMatchObject({ calls: 2, weighted: 2, connectionId: w.connectionId });
    expect(by.live_read).toMatchObject({ calls: 1, weighted: 5 });
    expect(by.write).toMatchObject({ calls: 1, weighted: 10 });
    expect(r.body.activeConnections).toBe(1);
  });
});
