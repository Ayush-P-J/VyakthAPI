/** The developer API. Every path sits under /v1 and authenticates with a project API key. */
import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query, Req, Res } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { FIELD_TYPES, PRIVACY, suggestPrivacy } from "@hexspare/tally-engine";
import { Auth, parseArray } from "./auth.ts";
import { CONFIG, type Config } from "./config.ts";
import { Db } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { Platform, isUuid } from "./platform.ts";
import { hashToken, randomToken, seal } from "./secrets.ts";

const FieldInput = z.object({
  dataset: z.string(), name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/), expr: z.string().min(1).max(400), type: z.enum(FIELD_TYPES).default("text"),
  privacy: z.enum(PRIVACY).optional(), line: z.string().optional(), udfIndex: z.number().int().optional(), udfType: z.string().max(40).optional(), udfName: z.string().regex(/^[A-Za-z0-9_]{1,100}$/).optional(),
}).strict();
const httpUrl = z.string().url().max(2000).refine((u) => /^https?:\/\//.test(u), "Must be an http(s) URL");

const ConnectLink = z.object({ label: z.string().max(200).optional(), redirectUrl: httpUrl.optional(), requestedScopes: z.array(z.enum(["read", "write"])).default(["read"]), requestedFields: z.array(FieldInput).max(200).default([]), expiresInHours: z.number().int().min(1).max(24 * 30).default(72) }).strict();
const Webhook = z.object({ url: httpUrl, events: z.array(z.enum(["record.created", "record.updated", "record.deleted", "write_job.completed", "write_job.failed", "connection.status_changed", "schema.published"])).min(1) }).strict();
const ListQuery = z.object({
  cursor: z.string().max(500).optional(), limit: z.coerce.number().int().min(1).max(500).default(100), updatedSince: z.string().datetime({ offset: true }).optional(),
  fields: z.string().max(2000).optional(), live: z.enum(["true", "false"]).optional(), includeDeleted: z.enum(["true", "false"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const ymd = (s?: string) => (s ? Number(s.replaceAll("-", "")) : undefined);

@Controller("v1")
export class PublicController {
  constructor(@Inject(Auth) private auth: Auth, @Inject(Platform) private platform: Platform, @Inject(Db) private db: Db, @Inject(CONFIG) private config: Config) {}

  /** Every response about a connection says how fresh it is, so an app can tell synced from live. */
  private async withFreshness(res: Response, connectionId: string) {
    const s = await this.platform.status(connectionId);
    res.setHeader("X-Tally-Connection-Status", s.status);
    res.setHeader("X-Tally-Connector-Online", String(s.connectorOnline));
    res.setHeader("X-Tally-Open", String(s.tallyOpen));
    if (s.lastSyncAt) res.setHeader("X-Tally-Last-Sync", new Date(s.lastSyncAt).toISOString());
    return s;
  }

  @Post("connect-links")
  async createLink(@Req() req: Request, @Body() body: unknown) {
    const a = await this.auth.apiKey(req, "admin");
    const input = ConnectLink.parse(body ?? {});
    const token = randomToken("cl_");
    const row = await this.db.one(
      `INSERT INTO connect_link (tenant_id, project_id, token, label, requested_scopes, expires_at, redirect_url, requested_fields)
       VALUES ($1, $2, $3, $4, $5::api_scope[], now() + make_interval(hours => $6), $7, $8) RETURNING id, expires_at`,
      [a.tenantId, a.projectId, hashToken(token), input.label ?? null, input.requestedScopes, input.expiresInHours, input.redirectUrl ?? null, JSON.stringify(input.requestedFields)]);
    return { id: row.id, url: `${this.config.publicUrl}/connect/${token}`, token, expiresAt: row.expires_at };
  }

  @Get("connections")
  async listConnections(@Req() req: Request) {
    const a = await this.auth.apiKey(req, "read");
    const rows = (await this.db.query("SELECT id FROM connection WHERE project_id = $1 ORDER BY created_at", [a.projectId])).rows;
    return { data: await Promise.all(rows.map((r) => this.platform.status(r.id))) };
  }

  @Get("connections/:id")
  async getConnection(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string) {
    const a = await this.auth.apiKey(req, "read");
    await this.auth.connection(a, id, { allowInactive: true });
    return this.withFreshness(res, id);
  }

  @Delete("connections/:id")
  async revoke(@Req() req: Request, @Param("id") id: string) {
    const a = await this.auth.apiKey(req, "admin");
    const conn = await this.auth.connection(a, id, { allowInactive: true });
    await this.platform.revokeConnection(conn, "developer");
    return { id, status: "revoked" };
  }

  @Get("connections/:id/schema")
  async schema(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string) {
    const a = await this.auth.apiKey(req, "read");
    await this.auth.connection(a, id);
    await this.withFreshness(res, id);
    const { bundle, version, hash } = await this.platform.activeBundle(id);
    return {
      version, bundleHash: hash,
      datasets: bundle.datasets.map((d) => ({
        name: d.name, title: d.title, kind: d.kind,
        fields: d.fields.filter((f) => !["MASTERID", "ALTERID"].includes(f.tag)).map((f) => ({ name: f.name, type: f.type, privacy: f.privacy, custom: f.custom })),
        lines: d.lines.map((l) => l.name),
      })),
      openapi: bundle.openapi,
    };
  }

  @Post("connections/:id/schema/fields")
  async addFields(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const a = await this.auth.apiKey(req, "admin");
    const conn = await this.auth.connection(a, id);
    const fields = z.object({ fields: z.array(FieldInput).min(1).max(100) }).strict().parse(body).fields;
    return this.platform.addFields(conn, fields.map((f) => ({ ...f, privacy: f.privacy ?? suggestPrivacy(f.name) })) as never);
  }

  @Post("connections/:id/schema/rollback")
  @HttpCode(200)
  async rollback(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const a = await this.auth.apiKey(req, "admin");
    const conn = await this.auth.connection(a, id);
    return this.platform.rollback(conn, z.object({ version: z.number().int().positive() }).strict().parse(body).version);
  }

  @Get("connections/:id/discovery")
  async discovery(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string) {
    const a = await this.auth.apiKey(req, "read");
    const conn = await this.auth.connection(a, id);
    await this.withFreshness(res, id);
    const data = await this.platform.discover(conn);
    await this.platform.meter(a.tenantId, a.projectId, id, "live_read");
    return { data };
  }

  @Post("connections/:id/:target")
  async writeOrValidate(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string, @Param("target") target: string, @Body() body: unknown, @Headers("idempotency-key") key: string) {
    const a = await this.auth.apiKey(req, "write");
    const conn = await this.auth.connection(a, id);
    await this.withFreshness(res, id);
    if (target.endsWith(":validate")) {
      const dataset = target.slice(0, -":validate".length);
      await this.platform.dataset(id, dataset);
      const out = await this.platform.validate(conn, dataset, body);
      await this.platform.meter(a.tenantId, a.projectId, id, "live_read");
      res.status(200);
      return out;
    }
    await this.platform.dataset(id, target);
    const { job, replayed } = await this.platform.createWriteJob(a, conn, target, "create", null, key, body);
    res.status(202);
    if (replayed) res.setHeader("Idempotent-Replay", "true");
    return job;
  }

  @Patch("connections/:id/:dataset/:recordId")
  async alter(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string, @Param("dataset") dataset: string, @Param("recordId") recordId: string, @Body() body: unknown, @Headers("idempotency-key") key: string) {
    const a = await this.auth.apiKey(req, "write");
    const conn = await this.auth.connection(a, id);
    await this.withFreshness(res, id);
    await this.platform.dataset(id, dataset);
    await this.platform.getRecord(id, dataset, recordId);
    const { job, replayed } = await this.platform.createWriteJob(a, conn, dataset, "alter", recordId, key, body);
    res.status(202);
    if (replayed) res.setHeader("Idempotent-Replay", "true");
    return job;
  }

  @Get("connections/:id/:dataset")
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string, @Param("dataset") dataset: string, @Query() rawQuery: unknown) {
    const a = await this.auth.apiKey(req, "read");
    const conn = await this.auth.connection(a, id);
    const status = await this.withFreshness(res, id);
    const def = await this.platform.dataset(id, dataset);
    const q = ListQuery.parse(rawQuery);
    const fields = q.fields?.split(",").map((f) => f.trim()).filter(Boolean);
    if (q.live === "true") {
      const r = await this.platform.liveRead(conn, def, { limit: q.limit, ...(ymd(q.from) ? { from: ymd(q.from)! } : {}), ...(ymd(q.to) ? { to: ymd(q.to)! } : {}) });
      await this.platform.meter(a.tenantId, a.projectId, id, "live_read");
      return { data: r.records.map((x) => ({ id: x.id, alterId: x.alterId, ...x.body })), nextCursor: null, truncated: r.truncated, meta: { mode: "live" } };
    }
    const page = await this.platform.list(id, dataset, { limit: q.limit, includeDeleted: q.includeDeleted === "true", ...(q.cursor ? { cursor: q.cursor } : {}), ...(q.updatedSince ? { updatedSince: q.updatedSince } : {}), ...(fields ? { fields } : {}) });
    await this.platform.meter(a.tenantId, a.projectId, id, "synced_read");
    return { ...page, meta: { mode: "synced", lastSyncAt: status.lastSyncAt, tallyOpen: status.tallyOpen } };
  }

  @Get("connections/:id/:dataset/:recordId")
  async one(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string, @Param("dataset") dataset: string, @Param("recordId") recordId: string, @Query("live") live?: string, @Query("fields") fieldsRaw?: string) {
    const a = await this.auth.apiKey(req, "read");
    const conn = await this.auth.connection(a, id);
    await this.withFreshness(res, id);
    const def = await this.platform.dataset(id, dataset);
    if (live === "true") {
      if (!/^\d{1,18}$/.test(recordId)) throw notFound("No such record.");
      const r = await this.platform.liveRead(conn, def, { id: recordId, limit: 1 });
      await this.platform.meter(a.tenantId, a.projectId, id, "live_read");
      const x = r.records[0];
      if (!x) throw notFound("No such record in Tally.");
      return { id: x.id, alterId: x.alterId, ...x.body };
    }
    const record = await this.platform.getRecord(id, dataset, recordId, fieldsRaw?.split(",").map((f) => f.trim()).filter(Boolean));
    await this.platform.meter(a.tenantId, a.projectId, id, "synced_read");
    return record;
  }

  @Get("write-jobs/:jobId")
  async job(@Req() req: Request, @Param("jobId") jobId: string) {
    const a = await this.auth.apiKey(req, "read");
    return this.platform.getJob(a.projectId, jobId);
  }

  @Post("webhooks")
  async createWebhook(@Req() req: Request, @Body() body: unknown) {
    const a = await this.auth.apiKey(req, "admin");
    const input = Webhook.parse(body);
    const url = new URL(input.url);
    if (url.protocol !== "https:" && !this.config.allowPrivateWebhooks) throw new ApiError(422, "webhook_must_be_https", "Webhook URLs must use HTTPS.");
    const secret = randomToken("whsec_");
    const row = await this.db.one(
      "INSERT INTO webhook_endpoint (tenant_id, project_id, url, secret, events) VALUES ($1, $2, $3, $4, $5::webhook_event[]) RETURNING id",
      [a.tenantId, a.projectId, input.url, seal(secret, this.config.secretsKey), input.events]);
    return { id: row.id, url: input.url, events: input.events, secret };
  }

  @Get("webhooks")
  async listWebhooks(@Req() req: Request) {
    const a = await this.auth.apiKey(req, "read");
    const rows = (await this.db.query("SELECT id, url, events, is_active, created_at FROM webhook_endpoint WHERE project_id = $1 ORDER BY created_at", [a.projectId])).rows;
    return { data: rows.map((r) => ({ ...r, events: parseArray(r.events) })) };
  }

  private async endpoint(projectId: string, id: string) {
    if (!isUuid(id) || !(await this.db.one("SELECT 1 FROM webhook_endpoint WHERE id = $1 AND project_id = $2", [id, projectId]))) throw notFound("No such webhook.");
  }

  /** The delivery log. A subscriber that was down reads from its last cursor, or asks for a replay. */
  @Get("webhooks/:id/events")
  async events(@Req() req: Request, @Param("id") id: string, @Query("cursor") cursor?: string, @Query("limit") limitRaw?: string) {
    const a = await this.auth.apiKey(req, "read");
    await this.endpoint(a.projectId, id);
    const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 500);
    const after = cursor ? decodeEventCursor(cursor) : null;
    const rows = (await this.db.query(
      `SELECT id, event, payload, attempts, delivered_at, created_at::text AS created_text FROM webhook_delivery
       WHERE endpoint_id = $1 ${after ? "AND (created_at, id) > ($3::timestamptz, $4::uuid)" : ""} ORDER BY created_at, id LIMIT $2`,
      after ? [id, limit, after[0], after[1]] : [id, limit])).rows;
    const last = rows.at(-1);
    return {
      data: rows.map((r) => ({ deliveryId: r.id, event: r.event, payload: r.payload, attempts: r.attempts, deliveredAt: r.delivered_at })),
      nextCursor: last ? Buffer.from(JSON.stringify([last.created_text, last.id])).toString("base64url") : cursor ?? null,
    };
  }

  @Post("webhooks/:id/replay")
  @HttpCode(200)
  async replay(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const a = await this.auth.apiKey(req, "admin");
    await this.endpoint(a.projectId, id);
    const { cursor } = z.object({ cursor: z.string().max(500).optional() }).strict().parse(body ?? {});
    const after = cursor ? decodeEventCursor(cursor) : null;
    const r = await this.db.query(
      `UPDATE webhook_delivery SET delivered_at = NULL, attempts = 0, next_retry_at = now()
       WHERE endpoint_id = $1 ${after ? "AND (created_at, id) > ($2::timestamptz, $3::uuid)" : ""}`, after ? [id, after[0], after[1]] : [id]);
    return { replaying: r.rowCount };
  }

  @Get("usage")
  async usage(@Req() req: Request, @Query("from") from?: string, @Query("to") to?: string) {
    const a = await this.auth.apiKey(req, "read");
    const q = z.object({ from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional() }).parse({ from, to });
    const rows = (await this.db.query(
      `SELECT connection_id, kind, count(*)::int AS calls, sum(weight)::int AS weighted FROM usage_event
       WHERE project_id = $1 AND occurred_at >= coalesce($2::timestamptz, date_trunc('month', now())) AND occurred_at < coalesce($3::timestamptz, now() + interval '1 second')
       GROUP BY connection_id, kind ORDER BY connection_id, kind`, [a.projectId, q.from ?? null, q.to ?? null])).rows;
    return { data: rows.map((r) => ({ connectionId: r.connection_id, kind: r.kind, calls: r.calls, weighted: r.weighted })), activeConnections: (await this.db.one("SELECT count(*)::int AS n FROM connection WHERE project_id = $1 AND status = 'active'", [a.projectId])).n };
  }
}

function decodeEventCursor(c: string): [string, string] {
  try {
    const [ts, id] = JSON.parse(Buffer.from(c, "base64url").toString());
    if (typeof ts === "string" && isUuid(id)) return [ts, id];
  } catch { /* falls through */ }
  throw new ApiError(400, "invalid_cursor", "This cursor is not valid.");
}
