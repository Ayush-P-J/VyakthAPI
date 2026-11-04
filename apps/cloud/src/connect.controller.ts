/** The hosted connect page. The link token in the URL is the customer's only credential. */
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PRIVACY, standardPack, suggestPrivacy } from "@hexspare/tally-engine";
import { CONFIG, type Config } from "./config.ts";
import { Db } from "./db.ts";
import { ApiError } from "./errors.ts";
import { Hub } from "./hub.ts";
import { Platform, initialDatasets } from "./platform.ts";
import { Webhooks } from "./webhooks.ts";
import { hashToken } from "./secrets.ts";

const Approve = z.object({
  companyGuid: z.string().max(200),
  rules: z.record(z.string().max(200), z.enum(PRIVACY)).default({}),
  customDefault: z.enum(PRIVACY).default("masked"),
}).strict();

/** Fields worth a decision on the consent screen. The full list stays one click away for the developer. */
function sensitiveStandardFields() {
  const out: { dataset: string; name: string; suggested: string }[] = [];
  for (const d of standardPack.datasets) for (const f of d.fields) {
    const suggested = suggestPrivacy(f.name);
    if (suggested !== "public" || /mobile|phone|email|gstin/i.test(f.name)) out.push({ dataset: d.name, name: f.name, suggested });
  }
  return out;
}

@Controller()
export class ConnectController {
  constructor(@Inject(Db) private db: Db, @Inject(Platform) private platform: Platform, @Inject(Hub) private hub: Hub, @Inject(Webhooks) private webhooks: Webhooks, @Inject(CONFIG) private config: Config) {}

  private async link(token: string) {
    const link = await this.db.one(
      `SELECT l.*, p.name AS project_name FROM connect_link l JOIN project p ON p.id = l.project_id WHERE l.token = $1`, [hashToken(token)]);
    if (!link) throw new ApiError(404, "invalid_link", "This connect link is not valid.");
    return link;
  }

  @Get("connect/:token")
  page(@Res() res: Response) {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.type("html").send(readFileSync(join(this.config.publicDir, "connect.html"), "utf8"));
  }

  @Get("connect/:token/state")
  async state(@Param("token") token: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    const link = await this.link(token);
    const expired = link.expires_at && new Date(link.expires_at) < new Date();
    const status = link.consumed_at ? "connected" : expired ? "expired" : link.installation_id ? "awaiting_approval" : "awaiting_connector";
    const safeRedirect = link.consumed_at && link.redirect_url ? withConnection(link.redirect_url, link.connection_id) : null;
    return {
      status, project: link.project_name, label: link.label,
      requestedScopes: String(link.requested_scopes).replace(/[{}]/g, "").split(","),
      companies: status === "awaiting_approval" ? (link.companies ?? []).map((c: any) => ({ name: c.name, guid: c.guid })) : [],
      requestedFields: status === "awaiting_approval" ? link.requested_fields.map((f: any) => ({ dataset: f.dataset, name: f.name, suggested: suggestPrivacy(f.name) })) : [],
      standardFields: status === "awaiting_approval" ? sensitiveStandardFields() : [],
      redirect: safeRedirect,
    };
  }

  @Post("connect/:token/approve")
  @HttpCode(200)
  async approve(@Param("token") token: string, @Body() body: unknown) {
    const input = Approve.parse(body);
    const link = await this.link(token);
    if (!link.installation_id) throw new ApiError(409, "connector_not_ready", "Install and start the connector first.");
    if (link.expires_at && new Date(link.expires_at) < new Date()) throw new ApiError(410, "link_expired", "This connect link has expired.");
    const company = (link.companies ?? []).find((c: any) => c.guid === input.companyGuid);
    if (!company) throw new ApiError(422, "unknown_company", "Pick a company reported by your connector.");
    const consent = { rules: input.rules, customDefault: input.customDefault };
    const connectionId = await this.db.tx(async (c) => {
      // Single use, decided atomically: two tabs cannot both approve one link.
      const claimed = (await c.query("UPDATE connect_link SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id", [link.id])).rows[0];
      if (!claimed) throw new ApiError(409, "link_used", "This link has already been used.");
      const conn = (await c.query(
        `INSERT INTO connection (tenant_id, project_id, installation_id, tally_company_guid, company_name, tally_serial, status, consent)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
         ON CONFLICT (project_id, installation_id, tally_company_guid) DO UPDATE SET status = 'active', consent = EXCLUDED.consent RETURNING *`,
        [link.tenant_id, link.project_id, link.installation_id, company.guid, company.name, company.serial, JSON.stringify(consent)])).rows[0];
      await c.query("UPDATE connect_link SET connection_id = $2 WHERE id = $1", [link.id, conn.id]);
      await this.platform.publish(c, conn, initialDatasets(consent, link.requested_fields));
      await this.webhooks.emit(c, link.tenant_id, link.project_id, "connection.status_changed", { connectionId: conn.id, status: "active", company: company.name, label: link.label });
      return conn.id as string;
    });
    this.hub.nudge(link.installation_id, "sync");
    return { connectionId, redirect: link.redirect_url ? withConnection(link.redirect_url, connectionId) : null };
  }
}

function withConnection(url: string, connectionId: string): string {
  const u = new URL(url);
  u.searchParams.set("connection_id", connectionId);
  return u.toString();
}
