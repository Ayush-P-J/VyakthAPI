/** Accounts and sessions for the developer console. Separate from API keys and connector secrets. */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
import { Db } from "./db.ts";
import { ApiError } from "./errors.ts";
import { hashToken, randomToken } from "./secrets.ts";

const scryptAsync = promisify<string, Buffer, number, { N: number; r: number; p: number; maxmem: number }, Buffer>(scrypt as never);
const N = 32768, R = 8, P = 1, KEY_LENGTH = 32;
const MAXMEM = 128 * N * R * 2;

export const SESSION_COOKIE = "hx_session";
export const SESSION_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM });
  return timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown, so timing does not reveal which emails have accounts.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));
export const burnPasswordCheck = async (password: string) => { await verifyPassword(password, await DUMMY_HASH); };

/** Counts events per key in a time window. In memory: the API runs as one replica in v1 (ADR-2). */
export class Throttle {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private limit: number, private windowMs: number) {}

  blocked(key: string, now = Date.now()): boolean {
    const hit = this.hits.get(key);
    return Boolean(hit && hit.resetAt > now && hit.count >= this.limit);
  }

  record(key: string, now = Date.now()): void {
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    const hit = this.hits.get(key);
    if (!hit || hit.resetAt <= now) this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    else hit.count++;
  }

  clear(key: string): void { this.hits.delete(key); }
}

export interface SessionUser { sessionId: string; userId: string; tenantId: string; email: string; name: string | null; tenantName: string }

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return null;
}

export class ConsoleAuth {
  constructor(private db: Db) {}

  async createSession(c: { query: Db["query"] } | Db, tenantId: string, userId: string): Promise<string> {
    const token = randomToken("hxs_");
    await (c as Db).query(
      "INSERT INTO user_session (tenant_id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
      [tenantId, userId, hashToken(token), SESSION_DAYS]);
    return token;
  }

  async current(req: Request): Promise<SessionUser> {
    const token = readCookie(req, SESSION_COOKIE);
    const row = token ? await this.db.one(
      `SELECT s.id AS session_id, u.id AS user_id, u.tenant_id, u.email, u.name, t.name AS tenant_name
       FROM user_session s JOIN app_user u ON u.id = s.user_id JOIN tenant t ON t.id = u.tenant_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`, [hashToken(token)]) : null;
    if (!row) throw new ApiError(401, "not_signed_in", "Sign in to continue.");
    return { sessionId: row.session_id, userId: row.user_id, tenantId: row.tenant_id, email: row.email, name: row.name, tenantName: row.tenant_name };
  }

  async end(req: Request): Promise<void> {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await this.db.query("DELETE FROM user_session WHERE token_hash = $1", [hashToken(token)]);
  }
}
