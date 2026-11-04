/** The connector's API. Separate from the public API: a device secret here, an API key there. */
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Auth } from "./auth.ts";
import { Db } from "./db.ts";
import { ApiError } from "./errors.ts";
import { Platform } from "./platform.ts";
import { hashToken, randomToken } from "./secrets.ts";

const digits = z.string().regex(/^\d{1,18}$/);
const Enroll = z.object({
  linkToken: z.string().min(10).max(200), appVersion: z.string().max(40).optional(),
  companies: z.array(z.object({ name: z.string().min(1).max(300), guid: z.string().max(200), serial: z.string().max(64).nullable(), booksFrom: z.string().max(20).nullable() })).max(200),
}).strict();
const Batch = z.object({
  batchId: z.string().uuid(), dataset: z.string().max(64), bundleHash: z.string().length(64), mode: z.enum(["initial", "delta", "repair"]),
  records: z.array(z.object({ id: digits, alterId: digits, body: z.record(z.string(), z.unknown()) })).max(5000),
  commit: z.object({ watermark: z.number().int().min(0) }).optional(),
}).strict();
const Keys = z.object({ dataset: z.string().max(64), ids: z.array(digits).max(5_000_000), maxAlterId: z.number().int().min(0) }).strict();
const Result = z.object({
  status: z.enum(["completed", "failed", "rejected"]), tallyId: z.string().max(64).nullable(), created: z.number().int(), altered: z.number().int(),
  errors: z.array(z.object({ code: z.string().max(64), message: z.string().max(2000), path: z.string().max(200).optional() })).max(500), deduplicated: z.boolean().optional(),
}).strict();
const Issue = z.object({ kind: z.string().max(64), message: z.string().max(2000), dataset: z.string().max(64).optional() }).strict();

@Controller("connector/v1")
export class ConnectorController {
  constructor(@Inject(Auth) private auth: Auth, @Inject(Platform) private platform: Platform, @Inject(Db) private db: Db) {}

  /**
   * Joins a connect link. The cloud creates the installation identity itself: a client can never
   * claim an existing installation by naming it. A connector already enrolled sends its secret.
   */
  @Post("enroll")
  @HttpCode(200)
  async enroll(@Req() req: Request, @Body() body: unknown) {
    const input = Enroll.parse(body);
    const link = await this.db.one(
      "SELECT id FROM connect_link WHERE token = $1 AND consumed_at IS NULL AND (expires_at IS NULL OR expires_at > now())", [hashToken(input.linkToken)]);
    if (!link) throw new ApiError(404, "invalid_link", "This connect link is invalid, expired, or already used.");
    let installationId: string;
    let deviceSecret: string | undefined;
    if (req.headers.authorization) {
      installationId = (await this.auth.installation(req)).id;
    } else {
      deviceSecret = randomToken("hxd_");
      installationId = (await this.db.one(
        "INSERT INTO installation (installation_key, device_secret_hash, app_version, last_seen_at) VALUES ($1, $2, $3, now()) RETURNING id",
        [randomUUID(), hashToken(deviceSecret), input.appVersion ?? null])).id;
    }
    await this.db.query("UPDATE connect_link SET installation_id = $2, companies = $3 WHERE id = $1", [link.id, installationId, JSON.stringify(input.companies)]);
    return { installationId, ...(deviceSecret ? { deviceSecret } : {}) };
  }

  @Get("connections")
  async connections(@Req() req: Request) {
    const inst = await this.auth.installation(req);
    const rows = (await this.db.query(
      `SELECT c.id, c.company_name, c.status, c.consent, s.bundle_hash, s.version
       FROM connection c LEFT JOIN schema_version s ON s.id = c.active_schema_version_id WHERE c.installation_id = $1`, [inst.id])).rows;
    return rows.map((r) => ({ id: r.id, company: r.company_name, status: r.status, consent: r.consent, bundleHash: r.bundle_hash, schemaVersion: r.version }));
  }

  @Get("connections/:id/bundle")
  async bundle(@Req() req: Request, @Param("id") id: string) {
    const inst = await this.auth.installation(req);
    await this.activeConnection(inst.id, id);
    return (await this.platform.activeBundle(id)).envelope;
  }

  private async activeConnection(installationId: string, id: string) {
    const conn = await this.auth.installationConnection(installationId, id);
    if (conn.status === "revoked") throw new ApiError(403, "connection_revoked", "This connection was revoked.");
    return conn;
  }

  @Post("connections/:id/batches")
  @HttpCode(200)
  async batch(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const inst = await this.auth.installation(req);
    const conn = await this.activeConnection(inst.id, id);
    return this.platform.ingest(conn, Batch.parse(body) as never);
  }

  @Post("connections/:id/keys")
  @HttpCode(200)
  async keys(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const inst = await this.auth.installation(req);
    const conn = await this.activeConnection(inst.id, id);
    return this.platform.reconcile(conn, Keys.parse(body));
  }

  @Post("connections/:id/issues")
  @HttpCode(200)
  async issue(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const inst = await this.auth.installation(req);
    const conn = await this.auth.installationConnection(inst.id, id);
    const i = Issue.parse(body);
    await this.db.query("INSERT INTO sync_issue (tenant_id, connection_id, kind, dataset_name, message) VALUES ($1, $2, $3, $4, $5)", [conn.tenant_id, id, i.kind, i.dataset ?? null, i.message]);
    return { ok: true };
  }

  /** The customer's revoke, from the connector. Reads and writes stop at once. */
  @Post("connections/:id/revoke")
  @HttpCode(200)
  async revoke(@Req() req: Request, @Param("id") id: string) {
    const inst = await this.auth.installation(req);
    const conn = await this.auth.installationConnection(inst.id, id);
    await this.platform.revokeConnection(conn, "customer");
    return { id, status: "revoked" };
  }

  @Post("jobs/claim")
  @HttpCode(200)
  async claim(@Req() req: Request) {
    const inst = await this.auth.installation(req);
    return this.platform.claimJobs(inst.id);
  }

  @Post("jobs/:id/result")
  @HttpCode(200)
  async result(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const inst = await this.auth.installation(req);
    await this.platform.finishJob(inst.id, id, Result.parse(body) as never);
    return { ok: true };
  }
}
