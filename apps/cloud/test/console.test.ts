/** Accounts and sessions for the developer console, over HTTP, against real Postgres. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { generateSigningKey } from "@hexspare/tally-engine";
import { createApp } from "../src/app.ts";
import type { Config } from "../src/config.ts";
import { Db, migrate } from "../src/db.ts";
import { Webhooks } from "../src/webhooks.ts";
import { createServer, type Server } from "node:http";
import { Throttle, hashPassword, verifyPassword } from "../src/console-auth.ts";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://hexspare:hexspare_dev@127.0.0.1:55432/tally_platform";
const dbName = `c_${randomBytes(6).toString("hex")}`;
const CONSOLE = "http://localhost:3001";
let app: Awaited<ReturnType<typeof createApp>>;
let base = "";
let db: Db;
let hooks: Webhooks;

const email = () => `dev-${randomBytes(4).toString("hex")}@example.com`;
const PASSWORD = "correct horse battery";

async function send(method: string, path: string, opts: { body?: unknown; cookie?: string; origin?: string; ip?: string } = {}) {
  const res = await fetch(`${base}/console/v1${path}`, {
    method,
    headers: {
      ...(opts.body === undefined ? {} : { "content-type": "application/json" }),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
      ...(opts.origin ? { origin: opts.origin } : {}),
      "x-forwarded-for": opts.ip ?? `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.1`,
    },
    ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie: res.headers.get("set-cookie") ?? "" };
}
const cookieOf = (setCookie: string) => setCookie.split(";")[0]!;
const signup = (e = email(), company = "Acme") => send("POST", "/auth/signup", { body: { name: "Asha", company, email: e, password: PASSWORD } });

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  const key = generateSigningKey();
  const config: Config = {
    databaseUrl: url.toString(), publicUrl: "http://localhost", consoleUrl: CONSOLE, allowSignup: true, port: 0,
    signing: { kid: "k", privateKeyPem: key.privateKeyPem }, secretsKey: randomBytes(32), allowPrivateWebhooks: true,
    migrationsDir: join(process.cwd(), "../../db/migrations"), liveTimeoutMs: 1000,
  };
  await migrate(config.databaseUrl, config.migrationsDir);
  app = await createApp(config);
  await app.listen(0, "127.0.0.1");
  base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
  db = new Db(config);
  hooks = new Webhooks(db, config);
});
afterAll(async () => {
  await app?.close();
  await db?.pool.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.end();
});

describe("passwords", () => {
  it("verifies the right password and refuses the wrong one", async () => {
    const h = await hashPassword(PASSWORD);
    expect(h).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword(PASSWORD, "garbage")).toBe(false);
  });
  it("salts, so two hashes of one password differ", async () => expect(await hashPassword("x")).not.toBe(await hashPassword("x")));
});

describe("throttle", () => {
  it("blocks at the limit and resets after the window", () => {
    const t = new Throttle(2, 1000);
    t.record("a", 0); expect(t.blocked("a", 1)).toBe(false);
    t.record("a", 2); expect(t.blocked("a", 3)).toBe(true);
    expect(t.blocked("b", 3)).toBe(false);
    expect(t.blocked("a", 1001)).toBe(false);
  });
});

describe("signup", () => {
  it("creates a tenant, a user and a first project, and signs in", async () => {
    const e = email();
    const r = await signup(e, "Shanoor Realtors");
    expect(r.status).toBe(201);
    expect(r.body.user.email).toBe(e);
    expect(r.body.tenant.name).toBe("Shanoor Realtors");
    expect(r.body.projects).toHaveLength(1);
    expect(r.setCookie).toMatch(/^hx_session=hxs_/);
    expect(r.setCookie).toMatch(/HttpOnly/i);
    expect(r.setCookie).toMatch(/SameSite=Lax/i);
    expect((await send("GET", "/me", { cookie: cookieOf(r.setCookie) })).body.user.email).toBe(e);
  });
  it("stores neither the password nor the session token", async () => {
    const e = email();
    const r = await signup(e);
    const row = await db.one("SELECT password_hash FROM app_user WHERE email = $1", [e]);
    expect(row.password_hash).toMatch(/^scrypt\$/);
    const token = cookieOf(r.setCookie).split("=")[1]!;
    const sessions = JSON.stringify((await db.query("SELECT token_hash FROM user_session")).rows);
    expect(sessions).not.toContain(token);
    expect(JSON.stringify(r.body)).not.toContain("scrypt");
  });
  it("treats email case as the same account, and refuses a duplicate", async () => {
    const e = email();
    expect((await signup(e)).status).toBe(201);
    const again = await signup(e.toUpperCase());
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("email_taken");
  });
  it.each([
    ["a short password", { name: "A", company: "B", email: "a@example.com", password: "short" }],
    ["a bad email", { name: "A", company: "B", email: "nope", password: PASSWORD }],
    ["a blank company", { name: "A", company: "  ", email: "a@example.com", password: PASSWORD }],
    ["an unknown field", { name: "A", company: "B", email: "a@example.com", password: PASSWORD, tenantId: "x" }],
  ])("refuses %s", async (_n, body) => expect((await send("POST", "/auth/signup", { body })).status).toBe(400));
  it("a failed signup leaves nothing behind", async () => {
    const before = (await db.one("SELECT count(*)::int AS n FROM tenant")).n;
    const e = email();
    await signup(e);
    await signup(e);
    expect((await db.one("SELECT count(*)::int AS n FROM tenant")).n).toBe(before + 1);
  });
});

describe("login and logout", () => {
  it("signs in, and logging out ends that session on the server", async () => {
    const e = email();
    await signup(e);
    const r = await send("POST", "/auth/login", { body: { email: e, password: PASSWORD } });
    expect(r.status).toBe(200);
    const cookie = cookieOf(r.setCookie);
    expect((await send("GET", "/me", { cookie })).status).toBe(200);
    expect((await send("POST", "/auth/logout", { cookie })).status).toBe(204);
    expect((await send("GET", "/me", { cookie })).status).toBe(401);
  });
  it("gives the same answer for a wrong password and an unknown email", async () => {
    const e = email();
    await signup(e);
    const wrong = await send("POST", "/auth/login", { body: { email: e, password: "wrong password" } });
    const unknown = await send("POST", "/auth/login", { body: { email: email(), password: "wrong password" } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
  it("blocks repeated failures, even with the right password, then only for that address", async () => {
    const e = email();
    await signup(e);
    const ip = "203.0.113.7";
    for (let i = 0; i < 5; i++) expect((await send("POST", "/auth/login", { body: { email: e, password: "wrong" }, ip })).status).toBe(401);
    expect((await send("POST", "/auth/login", { body: { email: e, password: PASSWORD }, ip })).status).toBe(429);
    expect((await send("POST", "/auth/login", { body: { email: e, password: PASSWORD }, ip: "203.0.113.8" })).status).toBe(200);
  });
  it("faking a new address on every attempt cannot get past the limit", async () => {
    const e = email();
    await signup(e);
    for (let i = 0; i < 20; i++) expect((await send("POST", "/auth/login", { body: { email: e, password: "wrong" }, ip: `198.51.100.${i}` })).status).toBe(401);
    expect((await send("POST", "/auth/login", { body: { email: e, password: "wrong" }, ip: "198.51.100.200" })).status).toBe(429);
    expect((await send("POST", "/auth/login", { body: { email: e, password: PASSWORD }, ip: "198.51.100.201" })).status).toBe(429);
  });
  it("refuses an expired session, a forged cookie, and no cookie", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    await db.query("UPDATE user_session SET expires_at = now() - interval '1 second' WHERE user_id = $1", [r.body.user.id]);
    expect((await send("GET", "/me", { cookie })).status).toBe(401);
    expect((await send("GET", "/me", { cookie: "hx_session=hxs_forged" })).status).toBe(401);
    expect((await send("GET", "/me")).status).toBe(401);
  });
  it("refuses a request from another site", async () => {
    const e = email();
    await signup(e);
    const bad = await send("POST", "/auth/login", { body: { email: e, password: PASSWORD }, origin: "https://evil.example" });
    expect(bad.status).toBe(403);
    expect(bad.body.error.code).toBe("bad_origin");
    expect((await send("POST", "/auth/login", { body: { email: e, password: PASSWORD }, origin: CONSOLE })).status).toBe(200);
  });
  it("a session cookie is not an API key, and an API route does not accept it", async () => {
    const r = await signup();
    const res = await fetch(`${base}/v1/connections`, { headers: { cookie: cookieOf(r.setCookie) } });
    expect(res.status).toBe(401);
  });
});

describe("overview", () => {
  it("counts this project's connections and keys", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    const p = r.body.projects[0].id;
    const empty = await send("GET", `/projects/${p}/overview`, { cookie });
    expect(empty.body).toMatchObject({ connections: { total: 0, active: 0, online: 0, tallyOpen: 0 }, apiKeys: 0 });
    await db.query("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active'), ($1, $2, 'revoked')", [r.body.tenant.id, p]);
    expect((await send("GET", `/projects/${p}/overview`, { cookie })).body.connections).toMatchObject({ total: 1, active: 1 });
  });
  it("another account's project looks like it does not exist", async () => {
    const a = await signup();
    const b = await signup();
    const r = await send("GET", `/projects/${a.body.projects[0].id}/overview`, { cookie: cookieOf(b.setCookie) });
    expect(r.status).toBe(404);
    expect((await send("GET", `/projects/not-a-uuid/overview`, { cookie: cookieOf(b.setCookie) })).status).toBe(404);
    expect((await send("GET", `/projects/${a.body.projects[0].id}/overview`)).status).toBe(401);
  });
});

describe("projects", () => {
  it("creates a project in the signed-in account", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    const made = await send("POST", "/projects", { cookie, body: { name: "  Second app " } });
    expect(made.status).toBe(201);
    expect(made.body.name).toBe("Second app");
    expect((await send("GET", "/me", { cookie })).body.projects.map((p: any) => p.name)).toContain("Second app");
  });
  it("refuses a blank name, no session, and another site", async () => {
    const { setCookie } = await signup();
    const cookie = cookieOf(setCookie);
    expect((await send("POST", "/projects", { cookie, body: { name: "  " } })).status).toBe(400);
    expect((await send("POST", "/projects", { body: { name: "X" } })).status).toBe(401);
    expect((await send("POST", "/projects", { cookie, body: { name: "X" }, origin: "https://evil.example" })).status).toBe(403);
  });
});

describe("API keys", () => {
  const setup = async () => {
    const r = await signup();
    return { cookie: cookieOf(r.setCookie), p: r.body.projects[0].id as string, tenant: r.body.tenant.id as string };
  };
  const v1 = (key: string, path = "/v1/connections") => fetch(`${base}${path}`, { headers: { authorization: `Bearer ${key}` } });

  it("returns the key once, stores only a hash, and the key really works", async () => {
    const { cookie, p } = await setup();
    const made = await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "Prod", scopes: ["read"] } });
    expect(made.status).toBe(201);
    expect(made.body.key).toMatch(/^hx_live_/);
    expect(made.body.keyPrefix).toBe(made.body.key.slice(0, 12));
    const list = await send("GET", `/projects/${p}/api-keys`, { cookie });
    expect(list.body.data).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain(made.body.key);
    expect(list.body.data[0]).not.toHaveProperty("keyHash");
    expect(JSON.stringify((await db.query("SELECT * FROM api_key WHERE id = $1", [made.body.id])).rows)).not.toContain(made.body.key);
    expect((await v1(made.body.key)).status).toBe(200);
    const after = await send("GET", `/projects/${p}/api-keys`, { cookie });
    expect(after.body.data[0].lastUsedAt).not.toBeNull();
  });
  it("gives a key only the scopes chosen", async () => {
    const { cookie, p } = await setup();
    const read = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "R", scopes: ["read"] } })).body.key;
    const res = await fetch(`${base}/v1/connect-links`, { method: "POST", headers: { authorization: `Bearer ${read}`, "content-type": "application/json" }, body: "{}" });
    expect(res.status).toBe(403);
    const admin = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "A", scopes: ["read", "write", "admin", "admin"] } })).body;
    expect(admin.scopes).toEqual(["read", "write", "admin"]);
  });
  it.each([
    ["no scopes", { name: "K", scopes: [] }],
    ["the raw scope, which is not built", { name: "K", scopes: ["raw"] }],
    ["a blank name", { name: " ", scopes: ["read"] }],
    ["a connection limit, which is not offered yet", { name: "K", scopes: ["read"], connectionId: "00000000-0000-4000-8000-000000000000" }],
  ])("refuses %s", async (_n, body) => {
    const { cookie, p } = await setup();
    expect((await send("POST", `/projects/${p}/api-keys`, { cookie, body })).status).toBe(400);
  });
  it("a revoked key stops working at once, and revoking twice keeps the first time", async () => {
    const { cookie, p } = await setup();
    const made = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "K", scopes: ["read"] } })).body;
    expect((await send("DELETE", `/projects/${p}/api-keys/${made.id}`, { cookie })).status).toBe(204);
    expect((await v1(made.key)).status).toBe(401);
    const first = (await send("GET", `/projects/${p}/api-keys`, { cookie })).body.data[0].revokedAt;
    expect(first).not.toBeNull();
    await new Promise((r) => setTimeout(r, 5));
    expect((await send("DELETE", `/projects/${p}/api-keys/${made.id}`, { cookie })).status).toBe(204);
    expect((await send("GET", `/projects/${p}/api-keys`, { cookie })).body.data[0].revokedAt).toBe(first);
  });
  it("another account cannot see, create or revoke keys, nor reach them through its own project", async () => {
    const a = await setup();
    const b = await setup();
    const made = (await send("POST", `/projects/${a.p}/api-keys`, { cookie: a.cookie, body: { name: "K", scopes: ["read"] } })).body;
    expect((await send("GET", `/projects/${a.p}/api-keys`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("POST", `/projects/${a.p}/api-keys`, { cookie: b.cookie, body: { name: "K", scopes: ["read"] } })).status).toBe(404);
    expect((await send("DELETE", `/projects/${a.p}/api-keys/${made.id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("DELETE", `/projects/${b.p}/api-keys/${made.id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await v1(made.key)).status).toBe(200);
  });
  it("a key in one project of an account cannot be revoked through another of its projects", async () => {
    const a = await setup();
    const other = (await send("POST", "/projects", { cookie: a.cookie, body: { name: "Other" } })).body.id;
    const made = (await send("POST", `/projects/${a.p}/api-keys`, { cookie: a.cookie, body: { name: "K", scopes: ["read"] } })).body;
    expect((await send("DELETE", `/projects/${other}/api-keys/${made.id}`, { cookie: a.cookie })).status).toBe(404);
  });
  it("refuses changes from another site", async () => {
    const { cookie, p } = await setup();
    const made = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "K", scopes: ["read"] } })).body;
    const origin = "https://evil.example";
    expect((await send("POST", `/projects/${p}/api-keys`, { cookie, origin, body: { name: "K", scopes: ["read"] } })).status).toBe(403);
    expect((await send("DELETE", `/projects/${p}/api-keys/${made.id}`, { cookie, origin })).status).toBe(403);
    expect((await v1(made.key)).status).toBe(200);
  });
});

describe("connections", () => {
  it("lists status, and revoking stops the API and tells the webhook once", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    const p = r.body.projects[0].id, t = r.body.tenant.id;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status, company_name) VALUES ($1, $2, 'active', 'Acme Ltd') RETURNING id", [t, p])).id;
    const hook = (await db.one("INSERT INTO webhook_endpoint (tenant_id, project_id, url, secret, events) VALUES ($1, $2, 'http://127.0.0.1:9/h', 'x', '{connection.status_changed}') RETURNING id", [t, p])).id;
    const list = await send("GET", `/projects/${p}/connections`, { cookie });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: conn, company: "Acme Ltd", status: "active", connectorOnline: false, tallyOpen: false });
    const key = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "K", scopes: ["read"] } })).body.key;
    expect((await fetch(`${base}/v1/connections/${conn}`, { headers: { authorization: `Bearer ${key}` } })).status).toBe(200);
    expect((await send("DELETE", `/projects/${p}/connections/${conn}`, { cookie })).status).toBe(204);
    expect((await send("DELETE", `/projects/${p}/connections/${conn}`, { cookie })).status).toBe(204);
    expect((await send("GET", `/projects/${p}/connections`, { cookie })).body.data[0].status).toBe("revoked");
    expect((await fetch(`${base}/v1/connections/${conn}/ledgers`, { headers: { authorization: `Bearer ${key}` } })).status).toBe(403);
    expect((await db.one("SELECT count(*)::int AS n FROM webhook_delivery WHERE endpoint_id = $1", [hook])).n).toBe(1);
  });
  it("another account's connection looks like it does not exist", async () => {
    const a = await signup();
    const b = await signup();
    const pa = a.body.projects[0].id, pb = b.body.projects[0].id;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active') RETURNING id", [a.body.tenant.id, pa])).id;
    const cookie = cookieOf(b.setCookie);
    expect((await send("GET", `/projects/${pa}/connections`, { cookie })).status).toBe(404);
    expect((await send("DELETE", `/projects/${pa}/connections/${conn}`, { cookie })).status).toBe(404);
    expect((await send("DELETE", `/projects/${pb}/connections/${conn}`, { cookie })).status).toBe(404);
    expect((await db.one("SELECT status FROM connection WHERE id = $1", [conn])).status).toBe("active");
  });
  it("refuses a revoke from another site", async () => {
    const r = await signup();
    const p = r.body.projects[0].id;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active') RETURNING id", [r.body.tenant.id, p])).id;
    expect((await send("DELETE", `/projects/${p}/connections/${conn}`, { cookie: cookieOf(r.setCookie), origin: "https://evil.example" })).status).toBe(403);
    expect((await db.one("SELECT status FROM connection WHERE id = $1", [conn])).status).toBe("active");
  });
});

describe("connect links", () => {
  const body = { label: "Acme Industries", requestedScopes: ["read", "write"], expiresInHours: 72 };
  const setup = async () => {
    const r = await signup();
    return { cookie: cookieOf(r.setCookie), p: r.body.projects[0].id as string, tenant: r.body.tenant.id as string };
  };
  const tokenOf = (url: string) => url.split("/connect/")[1]!;
  const state = async (url: string) => (await (await fetch(`${base}/connect/${tokenOf(url)}/state`)).json()).status;

  it("returns a working link once, and the list never shows the secret", async () => {
    const { cookie, p } = await setup();
    const made = await send("POST", `/projects/${p}/connect-links`, { cookie, body });
    expect(made.status).toBe(201);
    expect(made.body.url).toContain("/connect/cl_");
    expect(made.body).not.toHaveProperty("token");
    expect(await state(made.body.url)).toBe("awaiting_connector");
    const list = await send("GET", `/projects/${p}/connect-links`, { cookie });
    expect(list.body.data[0]).toMatchObject({ label: "Acme Industries", requestedScopes: ["read", "write"], status: "awaiting_connector", company: null });
    expect(JSON.stringify(list.body)).not.toContain(tokenOf(made.body.url));
    expect(JSON.stringify((await db.query("SELECT * FROM connect_link WHERE id = $1", [made.body.id])).rows)).not.toContain(tokenOf(made.body.url));
  });
  it.each([
    ["the admin scope", { ...body, requestedScopes: ["admin"] }],
    ["a script address to return to", { ...body, redirectUrl: "javascript:alert(1)" }],
    ["too long a life", { ...body, expiresInHours: 24 * 31 }],
    ["custom fields, which come in a later step", { ...body, requestedFields: [] }],
  ])("refuses %s", async (_n, b) => {
    const { cookie, p } = await setup();
    expect((await send("POST", `/projects/${p}/connect-links`, { cookie, body: b })).status).toBe(400);
  });
  it("cancelling an unused link makes it dead for the customer and the connector", async () => {
    const { cookie, p } = await setup();
    const made = (await send("POST", `/projects/${p}/connect-links`, { cookie, body })).body;
    expect((await send("DELETE", `/projects/${p}/connect-links/${made.id}`, { cookie })).status).toBe(204);
    await new Promise((r) => setTimeout(r, 5));
    expect(await state(made.url)).toBe("expired");
    expect((await send("GET", `/projects/${p}/connect-links`, { cookie })).body.data[0].status).toBe("expired");
    const enrol = await fetch(`${base}/connector/v1/enroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ linkToken: tokenOf(made.url), companies: [] }) });
    expect(enrol.status).toBe(404);
    expect((await enrol.json()).error.code).toBe("invalid_link");
  });
  it("a used link cannot be cancelled, and shows the company it connected", async () => {
    const { cookie, p, tenant } = await setup();
    const made = (await send("POST", `/projects/${p}/connect-links`, { cookie, body })).body;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status, company_name) VALUES ($1, $2, 'active', 'Acme Ltd') RETURNING id", [tenant, p])).id;
    await db.query("UPDATE connect_link SET consumed_at = now(), connection_id = $2 WHERE id = $1", [made.id, conn]);
    const r = await send("DELETE", `/projects/${p}/connect-links/${made.id}`, { cookie });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("link_used");
    expect((await send("GET", `/projects/${p}/connect-links`, { cookie })).body.data[0]).toMatchObject({ status: "used", company: "Acme Ltd" });
  });
  it("another account cannot list, create or cancel links", async () => {
    const a = await setup();
    const b = await setup();
    const made = (await send("POST", `/projects/${a.p}/connect-links`, { cookie: a.cookie, body })).body;
    expect((await send("GET", `/projects/${a.p}/connect-links`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("POST", `/projects/${a.p}/connect-links`, { cookie: b.cookie, body })).status).toBe(404);
    expect((await send("DELETE", `/projects/${a.p}/connect-links/${made.id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("DELETE", `/projects/${b.p}/connect-links/${made.id}`, { cookie: b.cookie })).status).toBe(404);
    expect(await state(made.url)).toBe("awaiting_connector");
  });
  it("refuses changes from another site", async () => {
    const { cookie, p } = await setup();
    const made = (await send("POST", `/projects/${p}/connect-links`, { cookie, body })).body;
    const origin = "https://evil.example";
    expect((await send("POST", `/projects/${p}/connect-links`, { cookie, origin, body })).status).toBe(403);
    expect((await send("DELETE", `/projects/${p}/connect-links/${made.id}`, { cookie, origin })).status).toBe(403);
    expect(await state(made.url)).toBe("awaiting_connector");
  });
});

describe("write job log", () => {
  const setup = async () => {
    const r = await signup();
    const p = r.body.projects[0].id as string, t = r.body.tenant.id as string;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status, company_name) VALUES ($1, $2, 'active', 'Acme Ltd') RETURNING id", [t, p])).id as string;
    return { cookie: cookieOf(r.setCookie), p, t, conn };
  };
  const job = async (t: string, p: string, conn: string, key: string, extra: { status?: string; error?: string } = {}) => (await db.one(
    `INSERT INTO write_job (tenant_id, project_id, connection_id, dataset_name, action, idempotency_key, request_body, status, error_message)
     VALUES ($1, $2, $3, 'voucher_receipt', 'create', $4, '{"narration":"secret-body"}', $5, $6) RETURNING id`, [t, p, conn, key, extra.status ?? "queued", extra.error ?? null])).id as string;

  it("lists newest first without what the app sent, and shows it only for one job", async () => {
    const { cookie, p, t, conn } = await setup();
    await job(t, p, conn, "first");
    const second = await job(t, p, conn, "second", { status: "failed", error: "Ledger not found" });
    const list = await send("GET", `/projects/${p}/jobs`, { cookie });
    expect(list.body.data.map((j: any) => j.idempotencyKey)).toEqual(["second", "first"]);
    expect(list.body.data[0]).toMatchObject({ company: "Acme Ltd", status: "failed", errors: [{ message: "Ledger not found" }] });
    expect(JSON.stringify(list.body)).not.toContain("secret-body");
    expect(JSON.stringify(list.body)).not.toContain("envelope");
    const one = await send("GET", `/projects/${p}/jobs/${second}`, { cookie });
    expect(one.body.requestBody).toEqual({ narration: "secret-body" });
    expect(one.body).not.toHaveProperty("envelope");
  });
  it("filters by status and connection, and pages without repeats or gaps", async () => {
    const { cookie, p, t, conn } = await setup();
    const other = (await db.one("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active') RETURNING id", [t, p])).id;
    await job(t, p, conn, "failed-one", { status: "failed" });
    await job(t, p, other, "other-company");
    for (let i = 0; i < 55; i++) await job(t, p, conn, `k${i}`);
    expect((await send("GET", `/projects/${p}/jobs?status=failed`, { cookie })).body.data.map((j: any) => j.idempotencyKey)).toEqual(["failed-one"]);
    expect((await send("GET", `/projects/${p}/jobs?connectionId=${other}`, { cookie })).body.data.map((j: any) => j.idempotencyKey)).toEqual(["other-company"]);
    const a = (await send("GET", `/projects/${p}/jobs`, { cookie })).body;
    expect(a.data).toHaveLength(50);
    const b = (await send("GET", `/projects/${p}/jobs?cursor=${a.nextCursor}`, { cookie })).body;
    expect(b.data).toHaveLength(7);
    expect(b.nextCursor).toBeNull();
    expect(new Set([...a.data, ...b.data].map((j: any) => j.id)).size).toBe(57);
  });
  it.each(["status=nope", "connectionId=x", "cursor=abc", "cursor=1;drop", "extra=1"])("refuses the filter %s", async (query) => {
    const { cookie, p } = await setup();
    expect((await send("GET", `/projects/${p}/jobs?${query}`, { cookie })).status).toBe(400);
  });
  it("another account cannot list or read jobs, even through its own project", async () => {
    const a = await setup();
    const b = await setup();
    const id = await job(a.t, a.p, a.conn, "k");
    expect((await send("GET", `/projects/${a.p}/jobs`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("GET", `/projects/${a.p}/jobs/${id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("GET", `/projects/${b.p}/jobs/${id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await send("GET", `/projects/${b.p}/jobs?connectionId=${a.conn}`, { cookie: b.cookie })).body.data).toEqual([]);
    expect((await send("GET", `/projects/${a.p}/jobs`)).status).toBe(401);
  });
});

describe("webhooks", () => {
  const setup = async () => {
    const r = await signup();
    return { cookie: cookieOf(r.setCookie), p: r.body.projects[0].id as string, t: r.body.tenant.id as string };
  };
  const EVENTS = ["write_job.failed", "connection.status_changed"];
  let server: Server;
  let url = "";
  let answer = 200;
  const received: { id: string; signature: string }[] = [];
  beforeAll(async () => {
    server = createServer((req, res) => {
      received.push({ id: String(req.headers["x-hexspare-event-id"]), signature: String(req.headers["x-hexspare-signature"]) });
      req.resume();
      res.statusCode = answer;
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}/hook`;
  });
  afterAll(() => { server.close(); });
  const makeHook = async (cookie: string, p: string) => (await send("POST", `/projects/${p}/webhooks`, { cookie, body: { url, events: EVENTS } })).body;
  /** A real event, through the same path a revoke takes. */
  const fire = async (cookie: string, p: string, t: string) => {
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active') RETURNING id", [t, p])).id;
    expect((await send("DELETE", `/projects/${p}/connections/${conn}`, { cookie })).status).toBe(204);
  };
  const deliveries = async (cookie: string, p: string, id: string) => (await send("GET", `/projects/${p}/webhooks/${id}/deliveries`, { cookie })).body.data;
  const drain = async () => { while (await hooks.deliverDue(500) > 0) { /* until nothing is due */ } };

  it("returns the secret once, stores it sealed, and signs deliveries with it", async () => {
    const { cookie, p, t } = await setup();
    const made = await makeHook(cookie, p);
    expect(made.secret).toMatch(/^whsec_/);
    const list = await send("GET", `/projects/${p}/webhooks`, { cookie });
    expect(list.body.data[0]).toMatchObject({ url, events: EVENTS, isActive: true, pending: 0, failed: 0 });
    expect(JSON.stringify(list.body)).not.toContain("whsec_");
    expect(JSON.stringify((await db.one("SELECT secret FROM webhook_endpoint WHERE id = $1", [made.id])))).not.toContain(made.secret);
    answer = 200;
    await fire(cookie, p, t);
    await drain();
    const [d] = await deliveries(cookie, p, made.id);
    expect(d).toMatchObject({ status: "delivered", event: "connection.status_changed", attempts: 1, lastError: null });
    const got = received.find((x) => x.id === d.payload.id)!;
    const { signPayload } = await import("../src/webhooks.ts");
    const ts = Number(/t=(\d+)/.exec(got.signature)![1]);
    expect(got.signature).toBe(signPayload(made.secret, ts, JSON.stringify(d.payload)));
  });
  it("shows why a delivery failed, and a resend delivers the same event id", async () => {
    const { cookie, p, t } = await setup();
    const made = await makeHook(cookie, p);
    answer = 500;
    await fire(cookie, p, t);
    await hooks.deliverDue(500);
    const [failed] = await deliveries(cookie, p, made.id);
    expect(failed).toMatchObject({ status: "retrying", attempts: 1, lastError: "Your server answered HTTP 500." });
    expect((await send("GET", `/projects/${p}/webhooks`, { cookie })).body.data[0].pending).toBe(1);
    answer = 200;
    expect((await send("POST", `/projects/${p}/webhooks/${made.id}/deliveries/${failed.id}/resend`, { cookie })).status).toBe(204);
    await drain();
    const [done] = await deliveries(cookie, p, made.id);
    expect(done).toMatchObject({ status: "delivered", lastError: null, id: failed.id });
    expect(done.payload.id).toBe(failed.payload.id);
  });
  it("reports an unreachable server, and gives up after the last attempt", async () => {
    const { cookie, p, t } = await setup();
    const dead = (await send("POST", `/projects/${p}/webhooks`, { cookie, body: { url: "http://127.0.0.1:9/h", events: EVENTS } })).body;
    await fire(cookie, p, t);
    await hooks.deliverDue(500);
    expect((await deliveries(cookie, p, dead.id))[0].lastError).toBe("Couldn't connect to your server (ECONNREFUSED).");
    await db.query("UPDATE webhook_delivery SET attempts = 7, next_retry_at = now() WHERE endpoint_id = $1", [dead.id]);
    await hooks.deliverDue(500);
    expect((await deliveries(cookie, p, dead.id))[0]).toMatchObject({ status: "failed", attempts: 8, nextRetryAt: null });
    expect((await send("GET", `/projects/${p}/webhooks`, { cookie })).body.data[0].failed).toBe(1);
  });
  it("pausing holds waiting deliveries and records no new events; resuming sends what waited", async () => {
    const { cookie, p, t } = await setup();
    const made = await makeHook(cookie, p);
    answer = 200;
    await fire(cookie, p, t);
    expect((await send("PATCH", `/projects/${p}/webhooks/${made.id}`, { cookie, body: { isActive: false } })).status).toBe(204);
    await drain();
    const [held] = await deliveries(cookie, p, made.id);
    expect(held.status).toBe("pending");
    await fire(cookie, p, t);
    expect(await deliveries(cookie, p, made.id)).toHaveLength(1);
    const blocked = await send("POST", `/projects/${p}/webhooks/${made.id}/deliveries/${held.id}/resend`, { cookie });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("webhook_paused");
    expect((await send("PATCH", `/projects/${p}/webhooks/${made.id}`, { cookie, body: { isActive: true } })).status).toBe(204);
    await drain();
    expect((await deliveries(cookie, p, made.id))[0].status).toBe("delivered");
  });
  it("deleting removes the webhook and its waiting deliveries", async () => {
    const { cookie, p, t } = await setup();
    const made = await makeHook(cookie, p);
    answer = 500;
    await fire(cookie, p, t);
    expect((await send("DELETE", `/projects/${p}/webhooks/${made.id}`, { cookie })).status).toBe(204);
    expect((await send("GET", `/projects/${p}/webhooks`, { cookie })).body.data).toEqual([]);
    expect((await db.one("SELECT count(*)::int AS n FROM webhook_delivery WHERE endpoint_id = $1", [made.id])).n).toBe(0);
    answer = 200;
  });
  it.each([
    ["no events", { url: "https://example.com/h", events: [] }],
    ["an unknown event", { url: "https://example.com/h", events: ["nope"] }],
    ["a script address", { url: "javascript:alert(1)", events: EVENTS }],
    ["an unknown field", { url: "https://example.com/h", events: EVENTS, secret: "mine" }],
  ])("refuses %s", async (_n, body) => {
    const { cookie, p } = await setup();
    expect((await send("POST", `/projects/${p}/webhooks`, { cookie, body })).status).toBe(400);
  });
  it("another account cannot reach any webhook route", async () => {
    const a = await setup();
    const b = await setup();
    const made = await makeHook(a.cookie, a.p);
    answer = 200;
    await fire(a.cookie, a.p, a.t);
    const [d] = await deliveries(a.cookie, a.p, made.id);
    const cookie = b.cookie;
    for (const project of [a.p, b.p]) {
      expect((await send("PATCH", `/projects/${project}/webhooks/${made.id}`, { cookie, body: { isActive: false } })).status).toBe(404);
      expect((await send("DELETE", `/projects/${project}/webhooks/${made.id}`, { cookie })).status).toBe(404);
      expect((await send("GET", `/projects/${project}/webhooks/${made.id}/deliveries`, { cookie })).status).toBe(404);
      expect((await send("POST", `/projects/${project}/webhooks/${made.id}/deliveries/${d.id}/resend`, { cookie })).status).toBe(404);
    }
    expect((await send("GET", `/projects/${a.p}/webhooks`, { cookie })).status).toBe(404);
    expect((await send("POST", `/projects/${a.p}/webhooks`, { cookie, body: { url, events: EVENTS } })).status).toBe(404);
    expect((await send("GET", `/projects/${a.p}/webhooks`, { cookie: a.cookie })).body.data).toHaveLength(1);
  });
  it("a delivery cannot be resent through a different webhook", async () => {
    const { cookie, p, t } = await setup();
    const one = await makeHook(cookie, p);
    const two = await makeHook(cookie, p);
    answer = 200;
    await fire(cookie, p, t);
    const [d] = await deliveries(cookie, p, one.id);
    await db.query("DELETE FROM webhook_delivery WHERE endpoint_id = $1", [two.id]);
    expect((await send("POST", `/projects/${p}/webhooks/${two.id}/deliveries/${d.id}/resend`, { cookie })).status).toBe(404);
  });
  it("refuses changes from another site", async () => {
    const { cookie, p, t } = await setup();
    const made = await makeHook(cookie, p);
    await fire(cookie, p, t);
    const [d] = await deliveries(cookie, p, made.id);
    const origin = "https://evil.example";
    expect((await send("POST", `/projects/${p}/webhooks`, { cookie, origin, body: { url, events: EVENTS } })).status).toBe(403);
    expect((await send("PATCH", `/projects/${p}/webhooks/${made.id}`, { cookie, origin, body: { isActive: false } })).status).toBe(403);
    expect((await send("DELETE", `/projects/${p}/webhooks/${made.id}`, { cookie, origin })).status).toBe(403);
    expect((await send("POST", `/projects/${p}/webhooks/${made.id}/deliveries/${d.id}/resend`, { cookie, origin })).status).toBe(403);
  });
  it("in production, refuses plain http and private addresses", async () => {
    const { p, t } = await setup();
    const strict = new Webhooks(db, { allowPrivateWebhooks: false, secretsKey: randomBytes(32) } as Config);
    await expect(strict.createEndpoint(t, p, { url: "http://example.com/h", events: EVENTS })).rejects.toMatchObject({ code: "webhook_must_be_https" });
    await expect(strict.createEndpoint(t, p, { url: "https://10.0.0.1/h", events: EVENTS })).rejects.toMatchObject({ code: "webhook_private_address" });
    await expect(strict.createEndpoint(t, p, { url: "https://[::1]/h", events: EVENTS })).rejects.toMatchObject({ code: "webhook_private_address" });
  });
});

describe("usage", () => {
  const event = (t: string, p: string, c: string | null, kind: string, weight: number, at: string) =>
    db.query("INSERT INTO usage_event (tenant_id, project_id, connection_id, kind, weight, occurred_at) VALUES ($1, $2, $3, $4, $5, $6)", [t, p, c, kind, weight, at]);
  it("adds up one month per company, and months follow India time", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    const p = r.body.projects[0].id, t = r.body.tenant.id;
    const conn = (await db.one("INSERT INTO connection (tenant_id, project_id, status, company_name) VALUES ($1, $2, 'active', 'Acme Ltd') RETURNING id", [t, p])).id;
    await event(t, p, conn, "synced_read", 1, "2026-03-10T00:00:00Z");
    await event(t, p, conn, "synced_read", 1, "2026-03-11T00:00:00Z");
    await event(t, p, conn, "write", 10, "2026-03-12T00:00:00Z");
    await event(t, p, null, "live_read", 5, "2026-03-13T00:00:00Z");
    await event(t, p, conn, "write", 10, "2026-03-31T18:29:00Z"); // 23:59 on 31 March in India
    await event(t, p, conn, "write", 10, "2026-03-31T18:31:00Z"); // 00:01 on 1 April in India
    const march = (await send("GET", `/projects/${p}/usage?month=2026-03`, { cookie })).body;
    expect(march.month).toBe("2026-03");
    expect(march.totals).toEqual({ calls: { synced_read: 2, live_read: 1, write: 2 }, units: 27 });
    expect(march.connections).toEqual([
      { connectionId: conn, company: "Acme Ltd", calls: { synced_read: 2, live_read: 0, write: 2 }, units: 22 },
      { connectionId: null, company: null, calls: { synced_read: 0, live_read: 1, write: 0 }, units: 5 },
    ]);
    expect((await send("GET", `/projects/${p}/usage?month=2026-04`, { cookie })).body.totals.units).toBe(10);
  });
  it("answers an empty month with zeros, and defaults to this month", async () => {
    const r = await signup();
    const cookie = cookieOf(r.setCookie);
    const p = r.body.projects[0].id;
    const empty = (await send("GET", `/projects/${p}/usage?month=2020-01`, { cookie })).body;
    expect(empty).toEqual({ month: "2020-01", totals: { calls: { synced_read: 0, live_read: 0, write: 0 }, units: 0 }, connections: [] });
    await event(r.body.tenant.id, p, null, "write", 10, new Date().toISOString());
    const now = (await send("GET", `/projects/${p}/usage`, { cookie })).body;
    expect(now.totals.units).toBe(10);
    expect(now.month).toBe(new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 7));
  });
  it("refuses a bad month, and another account", async () => {
    const a = await signup();
    const b = await signup();
    const p = a.body.projects[0].id;
    await event(a.body.tenant.id, p, null, "write", 10, "2026-03-10T00:00:00Z");
    for (const m of ["2026-13", "2026", "x", "2026-3"]) expect((await send("GET", `/projects/${p}/usage?month=${m}`, { cookie: cookieOf(a.setCookie) })).status).toBe(400);
    expect((await send("GET", `/projects/${p}/usage`, { cookie: cookieOf(b.setCookie) })).status).toBe(404);
    expect((await send("GET", `/projects/${b.body.projects[0].id}/usage?month=2026-03`, { cookie: cookieOf(b.setCookie) })).body.totals.units).toBe(0);
  });
});

describe("the OpenAPI file the console's types are generated from", () => {
  const doc = JSON.parse(readFileSync(join(process.cwd(), "../console/openapi/console.openapi.json"), "utf8"));
  const check = (value: any, schema: any, at: string) => {
    if (schema.required) for (const k of schema.required) expect(value, `${at} needs ${k}`).toHaveProperty(k);
    for (const [k, sub] of Object.entries<any>(schema.properties ?? {})) if (value?.[k] !== undefined && sub.type === "object") check(value[k], sub, `${at}.${k}`);
    for (const k of Object.keys(value ?? {})) if (schema.properties) expect(Object.keys(schema.properties), `${at}.${k} is undocumented`).toContain(k);
    if (schema.items && Array.isArray(value)) value.forEach((v, i) => check(v, schema.items, `${at}[${i}]`));
    for (const [k, sub] of Object.entries<any>(schema.properties ?? {})) if (sub.type === "array" && value?.[k]) check(value[k], sub, `${at}.${k}`);
  };
  const schemas = doc.components.schemas;
  it("matches what the API really returns", async () => {
    const r = await signup();
    check(r.body, schemas.Profile, "signup");
    const cookie = cookieOf(r.setCookie);
    check((await send("GET", "/me", { cookie })).body, schemas.Profile, "me");
    check((await send("GET", `/projects/${r.body.projects[0].id}/overview`, { cookie })).body, schemas.ProjectOverview, "overview");
    check((await send("GET", "/me")).body, schemas.ApiError, "error");
    const p = r.body.projects[0].id;
    check((await send("POST", "/projects", { cookie, body: { name: "Two" } })).body, schemas.Project, "project");
    const key = (await send("POST", `/projects/${p}/api-keys`, { cookie, body: { name: "K", scopes: ["read"] } })).body;
    check(key, schemas.CreatedApiKey, "created key");
    const items = (name: string) => ({ properties: { data: { type: "array", items: schemas[name] } } });
    check((await send("GET", `/projects/${p}/api-keys`, { cookie })).body, items("ApiKey"), "keys");
    const link = await send("POST", `/projects/${p}/connect-links`, { cookie, body: { requestedScopes: ["read"], expiresInHours: 1 } });
    check(link.body, schemas.CreatedConnectLink, "created link");
    check((await send("GET", `/projects/${p}/connect-links`, { cookie })).body, items("ConnectLink"), "links");
    await db.query("INSERT INTO connection (tenant_id, project_id, status) VALUES ($1, $2, 'active')", [r.body.tenant.id, p]);
    check((await send("GET", `/projects/${p}/connections`, { cookie })).body, items("Connection"), "connections");
    const conn = (await db.one("SELECT id FROM connection WHERE project_id = $1", [p])).id;
    const job = (await db.one("INSERT INTO write_job (tenant_id, project_id, connection_id, dataset_name, action, idempotency_key, request_body, status, error_message) VALUES ($1, $2, $3, 'voucher_receipt', 'create', 'k', '{}', 'failed', 'x') RETURNING id", [r.body.tenant.id, p, conn])).id;
    const jobItem = { ...schemas.WriteJob, properties: { ...schemas.WriteJob.properties, errors: { type: "array" } } };
    check((await send("GET", `/projects/${p}/jobs`, { cookie })).body, { properties: { data: { type: "array", items: jobItem }, nextCursor: {} } }, "jobs");
    check((await send("GET", `/projects/${p}/jobs/${job}`, { cookie })).body, { ...schemas.WriteJobDetail, properties: { ...schemas.WriteJobDetail.properties, errors: { type: "array" } } }, "job");
    const hook = (await send("POST", `/projects/${p}/webhooks`, { cookie, body: { url: "http://127.0.0.1:9/h", events: ["connection.status_changed"] } })).body;
    check(hook, schemas.CreatedWebhook, "created webhook");
    check((await send("GET", `/projects/${p}/webhooks`, { cookie })).body, items("Webhook"), "webhooks");
    await send("DELETE", `/projects/${p}/connections/${conn}`, { cookie });
    check((await send("GET", `/projects/${p}/webhooks/${hook.id}/deliveries`, { cookie })).body, { properties: { data: { type: "array", items: { ...schemas.WebhookDelivery, properties: { ...schemas.WebhookDelivery.properties, payload: {} } } } } }, "deliveries");
    const usage = { ...schemas.Usage, properties: { month: {}, totals: {}, connections: {} } };
    check((await send("GET", `/projects/${p}/usage`, { cookie })).body, usage, "usage");
  });
});
