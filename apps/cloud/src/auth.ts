import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { Db } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { hashToken } from "./secrets.ts";
import { isUuid } from "./platform.ts";

export type Scope = "read" | "write" | "raw" | "admin";
export interface ApiAuth { tenantId: string; projectId: string; keyId: string; scopes: Scope[]; connectionId: string | null }

const bearer = (req: Request) => /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];

@Injectable()
export class Auth {
  constructor(private db: Db) {}

  async apiKey(req: Request, scope: Scope): Promise<ApiAuth> {
    const token = bearer(req);
    const row = token ? await this.db.one(
      `UPDATE api_key SET last_used_at = now() WHERE key_hash = $1 AND revoked_at IS NULL
       RETURNING id, tenant_id, project_id, scopes, connection_id`, [hashToken(token)]) : null;
    if (!row) throw new ApiError(401, "unauthorized", "Send a valid API key as Authorization: Bearer <key>.");
    const scopes = parseArray(row.scopes) as Scope[];
    if (!scopes.includes(scope)) throw new ApiError(403, "insufficient_scope", `This API key does not have the "${scope}" scope.`);
    return { tenantId: row.tenant_id, projectId: row.project_id, keyId: row.id, scopes, connectionId: row.connection_id };
  }

  /** A connection in another project looks exactly like one that does not exist. */
  async connection(auth: ApiAuth, id: string, opts: { allowInactive?: boolean } = {}): Promise<any> {
    if (!isUuid(id) || (auth.connectionId && auth.connectionId !== id)) throw notFound("No such connection.");
    const conn = await this.db.one("SELECT * FROM connection WHERE id = $1 AND project_id = $2", [id, auth.projectId]);
    if (!conn) throw notFound("No such connection.");
    if (!opts.allowInactive && conn.status === "revoked") throw new ApiError(403, "connection_revoked", "The customer or developer revoked this connection.");
    if (!opts.allowInactive && conn.status !== "active") throw new ApiError(409, "connection_not_active", `This connection is ${conn.status}.`);
    return conn;
  }

  async installation(req: Request): Promise<{ id: string }> {
    const token = bearer(req);
    const row = token ? await this.db.one("UPDATE installation SET last_seen_at = now() WHERE device_secret_hash = $1 RETURNING id", [hashToken(token)]) : null;
    if (!row) throw new ApiError(401, "unauthorized", "This connector is not enrolled.");
    return row;
  }

  async installationConnection(installationId: string, connectionId: string): Promise<any> {
    if (!isUuid(connectionId)) throw notFound();
    const conn = await this.db.one("SELECT * FROM connection WHERE id = $1 AND installation_id = $2", [connectionId, installationId]);
    if (!conn) throw notFound();
    return conn;
  }
}

/** pg returns custom enum arrays as "{read,write}" text. */
export function parseArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  return String(v ?? "").replace(/^\{|\}$/g, "").split(",").filter(Boolean);
}
