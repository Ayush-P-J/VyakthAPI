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
import { Throttle, hashPassword, verifyPassword } from "../src/console-auth.ts";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://hexspare:hexspare_dev@127.0.0.1:55432/tally_platform";
const dbName = `c_${randomBytes(6).toString("hex")}`;
const CONSOLE = "http://localhost:3001";
let app: Awaited<ReturnType<typeof createApp>>;
let base = "";
let db: Db;

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
    migrationsDir: join(process.cwd(), "../../db/migrations"), publicDir: join(process.cwd(), "public"), liveTimeoutMs: 1000,
  };
  await migrate(config.databaseUrl, config.migrationsDir);
  app = await createApp(config);
  await app.listen(0, "127.0.0.1");
  base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
  db = new Db(config);
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
  });
});
