/** The API behind the developer console. Signed in with a session cookie, never an API key. */
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { CONFIG, type Config } from "./config.ts";
import { ConsoleAuth, SESSION_COOKIE, SESSION_DAYS, Throttle, burnPasswordCheck, hashPassword, verifyPassword } from "./console-auth.ts";
import { Db } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { parseArray } from "./auth.ts";
import { Platform, isUuid } from "./platform.ts";
import { ConnectLink } from "./public.controller.ts";
import { hashToken, randomToken } from "./secrets.ts";

const email = z.string().trim().toLowerCase().email().max(254);
const Signup = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  email,
  password: z.string().min(10, "Use at least 10 characters.").max(200),
}).strict();
const Login = z.object({ email, password: z.string().min(1).max(200) }).strict();

const NewProject = z.object({ name: z.string().trim().min(1, "Enter a project name.").max(120) }).strict();
// Limiting a key to one connection stays out until every project-wide route honours that limit.
const NewApiKey = z.object({ name: z.string().trim().min(1, "Enter a name for this key.").max(120), scopes: z.array(z.enum(["read", "write", "admin"])).min(1) }).strict();
const NewConnectLink = ConnectLink.omit({ requestedFields: true });

const FIFTEEN_MINUTES = 15 * 60_000;
const HOUR = 60 * 60_000;

@Controller("console/v1")
export class ConsoleController {
  private loginFailures = new Throttle(5, FIFTEEN_MINUTES);
  private ipFailures = new Throttle(50, FIFTEEN_MINUTES);
  /** Ignores the address entirely, because a client can fake one when no trusted proxy overwrites it. */
  private accountFailures = new Throttle(20, FIFTEEN_MINUTES);
  private signups = new Throttle(20, HOUR);

  constructor(@Inject(ConsoleAuth) private auth: ConsoleAuth, @Inject(Db) private db: Db, @Inject(CONFIG) private config: Config, @Inject(Platform) private platform: Platform) {}

  /** Another account's project looks exactly like one that does not exist. */
  private async project(req: Request, id: string): Promise<{ id: string; name: string; tenantId: string }> {
    const s = await this.auth.current(req);
    const project = isUuid(id) ? await this.db.one("SELECT id, name FROM project WHERE id = $1 AND tenant_id = $2", [id, s.tenantId]) : null;
    if (!project) throw notFound("No such project.");
    return { id: project.id, name: project.name, tenantId: s.tenantId };
  }

  /** SameSite cookies stop most cross-site posts; this also refuses any browser request from another site. */
  private checkOrigin(req: Request): void {
    const origin = req.headers.origin;
    if (origin && origin !== new URL(this.config.consoleUrl).origin) throw new ApiError(403, "bad_origin", "This request came from another site.");
  }

  private setCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86_400_000,
      secure: this.config.consoleUrl.startsWith("https://"),
    });
  }

  private async profile(tenantId: string, user: { id: string; email: string; name: string | null }, tenantName: string) {
    const projects = (await this.db.query("SELECT id, name, is_sandbox FROM project WHERE tenant_id = $1 ORDER BY created_at", [tenantId])).rows;
    return {
      user, tenant: { id: tenantId, name: tenantName },
      projects: projects.map((p) => ({ id: p.id as string, name: p.name as string, isSandbox: p.is_sandbox as boolean })),
    };
  }

  @Post("auth/signup")
  async signup(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) {
    this.checkOrigin(req);
    if (!this.config.allowSignup) throw new ApiError(403, "signup_closed", "New accounts are not open yet.");
    const ip = req.ip ?? "unknown";
    if (this.signups.blocked(ip)) throw new ApiError(429, "too_many_attempts", "Too many new accounts from this address. Try again in an hour.");
    const input = Signup.parse(body);
    this.signups.record(ip);
    const passwordHash = await hashPassword(input.password);
    let created: { tenantId: string; userId: string; token: string };
    try {
      created = await this.db.tx(async (c) => {
        const tenantId = (await c.query("INSERT INTO tenant (name) VALUES ($1) RETURNING id", [input.company])).rows[0].id as string;
        const userId = (await c.query("INSERT INTO app_user (tenant_id, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id", [tenantId, input.email, passwordHash, input.name])).rows[0].id as string;
        await c.query("INSERT INTO project (tenant_id, name) VALUES ($1, $2)", [tenantId, input.company]);
        const token = await this.auth.createSession(c as never, tenantId, userId);
        return { tenantId, userId, token };
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new ApiError(409, "email_taken", "An account with this email already exists. Sign in instead.");
      throw e;
    }
    this.setCookie(res, created.token);
    return this.profile(created.tenantId, { id: created.userId, email: input.email, name: input.name }, input.company);
  }

  @Post("auth/login")
  @HttpCode(200)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) {
    this.checkOrigin(req);
    const input = Login.parse(body);
    const ip = req.ip ?? "unknown";
    const key = `${input.email}|${ip}`;
    if (this.loginFailures.blocked(key) || this.ipFailures.blocked(ip) || this.accountFailures.blocked(input.email)) throw new ApiError(429, "too_many_attempts", "Too many failed attempts. Try again in 15 minutes.");
    const user = await this.db.one(
      "SELECT u.id, u.tenant_id, u.email, u.name, u.password_hash, t.name AS tenant_name FROM app_user u JOIN tenant t ON t.id = u.tenant_id WHERE u.email = $1", [input.email]);
    let ok = false;
    if (user?.password_hash) ok = await verifyPassword(input.password, user.password_hash);
    else await burnPasswordCheck(input.password);
    if (!ok) {
      this.loginFailures.record(key);
      this.ipFailures.record(ip);
      this.accountFailures.record(input.email);
      throw new ApiError(401, "invalid_credentials", "That email and password don't match.");
    }
    this.loginFailures.clear(key);
    this.accountFailures.clear(input.email);
    this.setCookie(res, await this.auth.createSession(this.db, user.tenant_id, user.id));
    return this.profile(user.tenant_id, { id: user.id, email: user.email, name: user.name }, user.tenant_name);
  }

  @Post("auth/logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    await this.auth.end(req);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
  }

  @Get("me")
  async me(@Req() req: Request) {
    const s = await this.auth.current(req);
    return this.profile(s.tenantId, { id: s.userId, email: s.email, name: s.name }, s.tenantName);
  }

  @Get("projects/:id/overview")
  async overview(@Req() req: Request, @Param("id") id: string) {
    const project = await this.project(req, id);
    const c = await this.db.one(
      `SELECT count(*) FILTER (WHERE c.status <> 'revoked')::int AS total,
              count(*) FILTER (WHERE c.status = 'active')::int AS active,
              count(*) FILTER (WHERE c.status = 'active' AND i.channel_online)::int AS online,
              count(*) FILTER (WHERE c.status = 'active' AND i.channel_online AND i.tally_open)::int AS tally_open
       FROM connection c LEFT JOIN installation i ON i.id = c.installation_id WHERE c.project_id = $1`, [id]);
    const keys = await this.db.one("SELECT count(*)::int AS n FROM api_key WHERE project_id = $1 AND revoked_at IS NULL", [id]);
    return { project: { id: project.id, name: project.name }, connections: { total: c.total, active: c.active, online: c.online, tallyOpen: c.tally_open }, apiKeys: keys.n };
  }

  @Post("projects")
  async createProject(@Req() req: Request, @Body() body: unknown) {
    this.checkOrigin(req);
    const s = await this.auth.current(req);
    const input = NewProject.parse(body);
    const row = await this.db.one("INSERT INTO project (tenant_id, name) VALUES ($1, $2) RETURNING id, name, is_sandbox", [s.tenantId, input.name]);
    return { id: row.id as string, name: row.name as string, isSandbox: row.is_sandbox as boolean };
  }

  // -- API keys ------------------------------------------------------------------------------
  @Get("projects/:id/api-keys")
  async listKeys(@Req() req: Request, @Param("id") id: string) {
    const project = await this.project(req, id);
    const rows = (await this.db.query(
      "SELECT id, name, key_prefix, scopes, created_at, last_used_at, revoked_at FROM api_key WHERE project_id = $1 ORDER BY revoked_at IS NOT NULL, created_at DESC", [project.id])).rows;
    return { data: rows.map(apiKeyView) };
  }

  /** The only response that ever contains the key. */
  @Post("projects/:id/api-keys")
  async createKey(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    this.checkOrigin(req);
    const project = await this.project(req, id);
    const input = NewApiKey.parse(body);
    const key = randomToken("hx_live_");
    const row = await this.db.one(
      `INSERT INTO api_key (tenant_id, project_id, name, key_prefix, key_hash, scopes) VALUES ($1, $2, $3, $4, $5, $6::api_scope[])
       RETURNING id, name, key_prefix, scopes, created_at, last_used_at, revoked_at`,
      [project.tenantId, project.id, input.name, key.slice(0, 12), hashToken(key), [...new Set(input.scopes)]]);
    return { ...apiKeyView(row), key };
  }

  @Delete("projects/:id/api-keys/:keyId")
  @HttpCode(204)
  async revokeKey(@Req() req: Request, @Param("id") id: string, @Param("keyId") keyId: string) {
    this.checkOrigin(req);
    const project = await this.project(req, id);
    const row = isUuid(keyId) ? await this.db.one("UPDATE api_key SET revoked_at = coalesce(revoked_at, now()) WHERE id = $1 AND project_id = $2 RETURNING id", [keyId, project.id]) : null;
    if (!row) throw notFound("No such API key.");
  }

  // -- Connections ---------------------------------------------------------------------------
  @Get("projects/:id/connections")
  async listConnections(@Req() req: Request, @Param("id") id: string) {
    const project = await this.project(req, id);
    const rows = (await this.db.query("SELECT id FROM connection WHERE project_id = $1 ORDER BY status = 'revoked', created_at DESC", [project.id])).rows;
    const data = await Promise.all(rows.map((r) => this.platform.status(r.id)));
    return { data };
  }

  @Delete("projects/:id/connections/:connectionId")
  @HttpCode(204)
  async revokeConnection(@Req() req: Request, @Param("id") id: string, @Param("connectionId") connectionId: string) {
    this.checkOrigin(req);
    const project = await this.project(req, id);
    const conn = isUuid(connectionId) ? await this.db.one("SELECT * FROM connection WHERE id = $1 AND project_id = $2", [connectionId, project.id]) : null;
    if (!conn) throw notFound("No such connection.");
    // Revoking twice must not tell the developer's webhook twice.
    if (conn.status !== "revoked") await this.platform.revokeConnection(conn, "developer");
  }

  // -- Connect links -------------------------------------------------------------------------
  @Get("projects/:id/connect-links")
  async listLinks(@Req() req: Request, @Param("id") id: string) {
    const project = await this.project(req, id);
    const rows = (await this.db.query(
      `SELECT l.id, l.label, l.requested_scopes, l.created_at, l.expires_at, c.company_name,
              CASE WHEN l.consumed_at IS NOT NULL THEN 'used'
                   WHEN l.expires_at <= now() THEN 'expired'
                   WHEN l.installation_id IS NOT NULL THEN 'awaiting_approval'
                   ELSE 'awaiting_connector' END AS status
       FROM connect_link l LEFT JOIN connection c ON c.id = l.connection_id
       WHERE l.project_id = $1 ORDER BY l.created_at DESC LIMIT 50`, [project.id])).rows;
    return {
      data: rows.map((r) => ({
        id: r.id as string, label: r.label as string | null, requestedScopes: parseArray(r.requested_scopes), status: r.status as string,
        company: r.company_name as string | null, createdAt: r.created_at as Date, expiresAt: r.expires_at as Date,
      })),
    };
  }

  /** The only response that ever contains the link: the database keeps just a hash of it. */
  @Post("projects/:id/connect-links")
  async createLink(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    this.checkOrigin(req);
    const project = await this.project(req, id);
    const { id: linkId, url, expiresAt } = await this.platform.createConnectLink(project.tenantId, project.id, NewConnectLink.parse(body));
    return { id: linkId, url, expiresAt };
  }

  /** Expiring it now is enough: enrolment, the customer's page and approval all check the expiry. */
  @Delete("projects/:id/connect-links/:linkId")
  @HttpCode(204)
  async cancelLink(@Req() req: Request, @Param("id") id: string, @Param("linkId") linkId: string) {
    this.checkOrigin(req);
    const project = await this.project(req, id);
    if (!isUuid(linkId) || !(await this.db.one("SELECT 1 FROM connect_link WHERE id = $1 AND project_id = $2", [linkId, project.id]))) throw notFound("No such connect link.");
    const cancelled = await this.db.one("UPDATE connect_link SET expires_at = least(expires_at, now()) WHERE id = $1 AND consumed_at IS NULL RETURNING id", [linkId]);
    if (!cancelled) throw new ApiError(409, "link_used", "This link has already been used. Revoke the connection instead.");
  }
}

function apiKeyView(r: any) {
  return {
    id: r.id as string, name: r.name as string, keyPrefix: r.key_prefix as string, scopes: parseArray(r.scopes),
    createdAt: r.created_at as Date, lastUsedAt: r.last_used_at as Date | null, revokedAt: r.revoked_at as Date | null,
  };
}
