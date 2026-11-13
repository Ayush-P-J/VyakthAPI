/**
 * Signed, retried, replayable webhooks. Events are written in the same transaction as the change
 * they describe; a separate worker delivers them.
 */
import { Inject, Injectable } from "@nestjs/common";
import { createHmac, randomUUID } from "node:crypto";
import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { CONFIG, type Config } from "./config.ts";
import { Db, type Tx } from "./db.ts";
import { ApiError } from "./errors.ts";
import { randomToken, seal, unseal } from "./secrets.ts";

export type WebhookEvent = "record.created" | "record.updated" | "record.deleted" | "write_job.completed" | "write_job.failed" | "connection.status_changed" | "schema.published";

const MAX_ATTEMPTS = 8;

export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

export function signPayload(secret: string, timestamp: number, body: string): string {
  return `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

@Injectable()
export class Webhooks {
  constructor(private db: Db, @Inject(CONFIG) private config: Config) {}

  async emit(c: Tx, tenantId: string, projectId: string, event: WebhookEvent, data: unknown): Promise<void> {
    await this.emitMany(c, tenantId, projectId, [{ event, data }]);
  }

  /** The secret goes back to the caller once; it is stored sealed, because signing needs the original. */
  async createEndpoint(tenantId: string, projectId: string, input: { url: string; events: string[] }) {
    const url = new URL(input.url);
    const host = url.hostname.replace(/[[\]]/g, "");
    if (!this.config.allowPrivateWebhooks) {
      if (url.protocol !== "https:") throw new ApiError(422, "webhook_must_be_https", "Webhook URLs must use HTTPS.");
      if (isIP(host) && isPrivateAddress(host)) throw new ApiError(422, "webhook_private_address", "Webhook URLs can't point at a private network address.");
    }
    const secret = randomToken("whsec_");
    const row = await this.db.one(
      "INSERT INTO webhook_endpoint (tenant_id, project_id, url, secret, events) VALUES ($1, $2, $3, $4, $5::webhook_event[]) RETURNING id, is_active, created_at",
      [tenantId, projectId, input.url, seal(secret, this.config.secretsKey), input.events]);
    return { id: row.id as string, url: input.url, events: input.events, secret, isActive: row.is_active as boolean, createdAt: row.created_at as Date };
  }

  /** Fans out to matching endpoints. A record batch can be large, so this is one statement. */
  async emitMany(c: Tx, tenantId: string, projectId: string, items: { event: WebhookEvent; data: unknown }[]): Promise<void> {
    if (items.length === 0) return;
    const rows = items.map((i) => { const id = randomUUID(); return { event: i.event, id, payload: JSON.stringify({ id, event: i.event, createdAt: new Date().toISOString(), data: i.data }) }; });
    await c.query(
      `INSERT INTO webhook_delivery (tenant_id, endpoint_id, event, payload, idempotency_id, next_retry_at)
       SELECT $1, e.id, x.event::webhook_event, x.payload::jsonb, x.id, now()
       FROM unnest($3::text[], $4::text[], $5::uuid[]) AS x(event, payload, id)
       JOIN webhook_endpoint e ON e.project_id = $2 AND e.is_active AND x.event::webhook_event = ANY(e.events)`,
      [tenantId, projectId, rows.map((r) => r.event), rows.map((r) => r.payload), rows.map((r) => r.id)],
    );
  }

  /** Delivers due webhooks. Returns how many it attempted. Several workers can run at once. A paused endpoint's deliveries wait until it resumes. */
  async deliverDue(limit = 50): Promise<number> {
    const due = await this.db.tx(async (c) => (await c.query(
      `UPDATE webhook_delivery d SET attempts = attempts + 1, next_retry_at = now() + make_interval(secs => 30 * power(2, attempts))
       FROM webhook_endpoint e
       WHERE d.endpoint_id = e.id AND d.id IN (
         SELECT w.id FROM webhook_delivery w JOIN webhook_endpoint a ON a.id = w.endpoint_id
         WHERE w.delivered_at IS NULL AND w.next_retry_at <= now() AND a.is_active ORDER BY w.next_retry_at LIMIT $1 FOR UPDATE OF w SKIP LOCKED)
       RETURNING d.id, d.payload, d.attempts, e.url, e.secret`, [limit])).rows);
    await Promise.all(due.map(async (d) => {
      const body = JSON.stringify(d.payload);
      let failure: string | null;
      try {
        failure = await this.post(d.url, body, unseal(d.secret, this.config.secretsKey), d.payload.id);
      } catch (e) {
        failure = describeFailure(e);
        console.warn(`[webhooks] delivery ${d.id} failed: ${(e as Error).message}`);
      }
      if (failure === null) await this.db.query("UPDATE webhook_delivery SET delivered_at = now(), next_retry_at = NULL, last_error = NULL WHERE id = $1", [d.id]);
      else await this.db.query("UPDATE webhook_delivery SET last_error = $2, next_retry_at = CASE WHEN $3 THEN NULL ELSE next_retry_at END WHERE id = $1", [d.id, failure, d.attempts >= MAX_ATTEMPTS]);
    }));
    return due.length;
  }

  /** Answers null when delivered, or why not. Resolving inside the socket's own lookup closes the gap where DNS changes after a check. */
  private post(url: string, body: string, secret: string, eventId: string): Promise<string | null> {
    const u = new URL(url);
    const allowPrivate = this.config.allowPrivateWebhooks;
    const guardedLookup: any = (host: string, opts: any, cb: any) => {
      dnsLookup(host, { ...opts, all: false }, (err, address, family) => {
        if (err) return cb(err);
        if (!allowPrivate && isPrivateAddress(address as string)) return cb(new Error(`Webhook host resolves to a private address`));
        cb(null, address, family);
      });
    };
    if (!allowPrivate && isIP(u.hostname.replace(/[[\]]/g, "")) && isPrivateAddress(u.hostname.replace(/[[\]]/g, ""))) return Promise.reject(new Error("Webhook URL is a private address"));
    const ts = Math.floor(Date.now() / 1000);
    return new Promise((resolve, reject) => {
      const send = u.protocol === "https:" ? httpsRequest : httpRequest;
      const req = send(u, {
        method: "POST", lookup: guardedLookup, timeout: 10_000,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), "x-hexspare-signature": signPayload(secret, ts, body), "x-hexspare-event-id": eventId, "user-agent": "Hexspare-Webhooks/1" },
      }, (res) => {
        res.resume();
        // Redirects are not followed: a redirect could point anywhere, including inside our network.
        const status = res.statusCode ?? 500;
        resolve(status >= 200 && status < 300 ? null : `Your server answered HTTP ${status}.`);
      });
      req.on("timeout", () => req.destroy(new Error("Webhook timed out")));
      req.on("error", reject);
      req.end(body);
    });
  }
}

/** Says what went wrong without passing on low-level network detail. */
function describeFailure(e: unknown): string {
  const { message, code } = e as { message?: string; code?: string };
  if (message?.startsWith("Webhook")) return `${message}.`;
  return `Couldn't connect to your server (${code ?? "network error"}).`;
}
