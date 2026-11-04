/** The API behind the developer console. Signed in with a session cookie, never an API key. */
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { CONFIG, type Config } from "./config.ts";
import { ConsoleAuth, SESSION_COOKIE, SESSION_DAYS, Throttle, burnPasswordCheck, hashPassword, verifyPassword } from "./console-auth.ts";
import { Db } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { isUuid } from "./platform.ts";

const email = z.string().trim().toLowerCase().email().max(254);
const Signup = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  email,
  password: z.string().min(10, "Use at least 10 characters.").max(200),
}).strict();
const Login = z.object({ email, password: z.string().min(1).max(200) }).strict();

const FIFTEEN_MINUTES = 15 * 60_000;
const HOUR = 60 * 60_000;

@Controller("console/v1")
export class ConsoleController {
  private loginFailures = new Throttle(5, FIFTEEN_MINUTES);
  private ipFailures = new Throttle(50, FIFTEEN_MINUTES);
  /** Ignores the address entirely, because a client can fake one when no trusted proxy overwrites it. */
  private accountFailures = new Throttle(20, FIFTEEN_MINUTES);
  private signups = new Throttle(20, HOUR);

  constructor(@Inject(ConsoleAuth) private auth: ConsoleAuth, @Inject(Db) private db: Db, @Inject(CONFIG) private config: Config) {}

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
    const s = await this.auth.current(req);
    if (!isUuid(id)) throw notFound("No such project.");
    const project = await this.db.one("SELECT id, name FROM project WHERE id = $1 AND tenant_id = $2", [id, s.tenantId]);
    if (!project) throw notFound("No such project.");
    const c = await this.db.one(
      `SELECT count(*) FILTER (WHERE c.status <> 'revoked')::int AS total,
              count(*) FILTER (WHERE c.status = 'active')::int AS active,
              count(*) FILTER (WHERE c.status = 'active' AND i.channel_online)::int AS online,
              count(*) FILTER (WHERE c.status = 'active' AND i.channel_online AND i.tally_open)::int AS tally_open
       FROM connection c LEFT JOIN installation i ON i.id = c.installation_id WHERE c.project_id = $1`, [id]);
    const keys = await this.db.one("SELECT count(*)::int AS n FROM api_key WHERE project_id = $1 AND revoked_at IS NULL", [id]);
    return { project: { id: project.id, name: project.name }, connections: { total: c.total, active: c.active, online: c.online, tallyOpen: c.tally_open }, apiKeys: keys.n };
  }
}
