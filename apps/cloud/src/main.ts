/** One image, several roles: serve | worker | migrate | seed | keygen. */
import { randomBytes } from "node:crypto";
import { generateSigningKey } from "@hexspare/tally-engine";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { Db, migrate } from "./db.ts";
import { Hub } from "./hub.ts";
import { Webhooks } from "./webhooks.ts";
import { hashToken, randomToken } from "./secrets.ts";

const role = process.argv[2] ?? "serve";

/** Prints fresh secrets in .env form. Used once, when a deployment is first set up. */
function keygen(): void {
  const key = generateSigningKey();
  const b64 = (s: string) => Buffer.from(s).toString("base64");
  console.log(`POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`);
  console.log(`SECRETS_KEY=${randomBytes(32).toString("base64")}`);
  console.log(`SIGNING_KID=k${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`);
  console.log(`SIGNING_PRIVATE_KEY=${b64(key.privateKeyPem)}`);
  console.log(`SIGNING_PUBLIC_KEY=${b64(key.publicKeyPem)}`);
}

async function seed(): Promise<void> {
  const config = loadConfig();
  const db = new Db(config);
  const name = process.argv[3] ?? "Hexspare";
  const tenant = (await db.one("INSERT INTO tenant (name) VALUES ($1) RETURNING id", [name])).id;
  const project = (await db.one("INSERT INTO project (tenant_id, name) VALUES ($1, $2) RETURNING id", [tenant, process.argv[4] ?? `${name} project`])).id;
  const key = randomToken("hx_live_");
  await db.query(
    "INSERT INTO api_key (tenant_id, project_id, name, key_prefix, key_hash, scopes) VALUES ($1, $2, 'seed', $3, $4, '{read,write,admin}')",
    [tenant, project, key.slice(0, 12), hashToken(key)]);
  console.log(JSON.stringify({ tenantId: tenant, projectId: project, apiKey: key }, null, 2));
  await db.pool.end();
}

async function worker(): Promise<void> {
  const config = loadConfig();
  const db = new Db(config);
  const hooks = new Webhooks(db, config);
  let running = true;
  const stop = () => { running = false; };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  console.log("[worker] delivering webhooks");
  while (running) {
    let n = 0;
    try { n = await hooks.deliverDue(); } catch (e) { console.error("[worker]", (e as Error).message); }
    if (n === 0) await new Promise((r) => setTimeout(r, 1000));
  }
  await db.pool.end();
}

async function serve(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  await app.listen(config.port, "0.0.0.0");
  console.log(`[api] listening on ${config.port}`);
  const stop = async () => { await app.get(Hub).close(); await app.close(); process.exit(0); };
  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
}

if (role === "keygen") keygen();
else if (role === "migrate") {
  const config = loadConfig();
  const applied = await migrate(config.databaseUrl, config.migrationsDir);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Already up to date");
} else if (role === "seed") await seed();
else if (role === "worker") await worker();
else if (role === "serve") await serve();
else { console.error(`Unknown role ${role}`); process.exit(2); }
