/**
 * The live channel. Connectors dial out over a WebSocket, so the customer opens no port.
 * Connections live in this process, so the API runs as one replica in v1; see the ADR.
 */
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { CONFIG, type Config } from "./config.ts";
import { Db } from "./db.ts";
import { hashToken } from "./secrets.ts";
import { ApiError } from "./errors.ts";

interface Peer { ws: WebSocket; alive: boolean }
interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout; installationId: string }

@Injectable()
export class Hub {
  private peers = new Map<string, Peer>();
  private pending = new Map<string, Pending>();
  private wss: WebSocketServer | null = null;
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private db: Db, @Inject(CONFIG) private config: Config) {}

  async attach(server: Server): Promise<void> {
    // Whatever the previous process believed is stale.
    await this.db.query("UPDATE installation SET channel_online = false WHERE channel_online");
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 * 1024 });
    server.on("upgrade", (req, socket, head) => {
      void (async () => {
        const reject = (code: string) => { socket.write(`HTTP/1.1 ${code}\r\nConnection: close\r\n\r\n`); socket.destroy(); };
        if (new URL(req.url ?? "/", "http://x").pathname !== "/connector/v1/channel") return reject("404 Not Found");
        const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
        const row = token ? await this.db.one("SELECT id FROM installation WHERE device_secret_hash = $1", [hashToken(token)]) : null;
        if (!row) return reject("401 Unauthorized");
        this.wss!.handleUpgrade(req, socket, head, (ws) => this.onConnect(row.id, ws));
      })().catch(() => socket.destroy());
    });
    this.heartbeat = setInterval(() => {
      for (const [, peer] of this.peers) {
        if (!peer.alive) { peer.ws.terminate(); continue; }
        peer.alive = false;
        peer.ws.ping();
      }
    }, 30_000);
  }

  private onConnect(installationId: string, ws: WebSocket) {
    this.peers.get(installationId)?.ws.close(4000, "replaced");
    const peer: Peer = { ws, alive: true };
    this.peers.set(installationId, peer);
    this.touch("UPDATE installation SET channel_online = true, last_seen_at = now() WHERE id = $1", [installationId]);
    ws.on("pong", () => { peer.alive = true; });
    ws.on("message", (data) => this.onMessage(installationId, data.toString()));
    ws.on("error", () => {});
    ws.on("close", () => {
      if (this.peers.get(installationId) !== peer) return;
      this.peers.delete(installationId);
      this.touch("UPDATE installation SET channel_online = false WHERE id = $1", [installationId]);
      for (const [id, p] of this.pending) {
        if (p.installationId === installationId) {
          clearTimeout(p.timer);
          this.pending.delete(id);
          p.reject(new ApiError(503, "tally_unavailable", "The connector disconnected before answering."));
        }
      }
    });
  }

  /** Presence is best effort: a lost update must not crash the process, including during shutdown. */
  private touch(sql: string, params: unknown[]) {
    this.db.query(sql, params).catch((e) => console.warn(`[hub] presence update failed: ${(e as Error).message}`));
  }

  private onMessage(installationId: string, text: string) {
    let msg: { t?: string; id?: string; ok?: boolean; data?: unknown; error?: { code: string; message: string }; tallyOpen?: boolean };
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.t === "status") {
      this.touch("UPDATE installation SET tally_open = $2, last_seen_at = now() WHERE id = $1", [installationId, Boolean(msg.tallyOpen)]);
    } else if (msg.t === "reply" && msg.id) {
      const p = this.pending.get(msg.id);
      // A reply from a different installation must not resolve someone else's call.
      if (!p || p.installationId !== installationId) return;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.data);
      else if (msg.error?.code === "tally_unavailable") p.reject(new ApiError(503, "tally_unavailable", "Tally is not open on the customer's PC. Synced reads still work."));
      else p.reject(new ApiError(502, msg.error?.code ?? "connector_error", msg.error?.message ?? "The connector could not complete this call."));
    }
  }

  isOnline(installationId: string): boolean {
    return this.peers.has(installationId);
  }

  call(installationId: string, envelope: unknown, timeoutMs = this.config.liveTimeoutMs): Promise<any> {
    const peer = this.peers.get(installationId);
    if (!peer) throw new ApiError(503, "tally_unavailable", "The connector is offline, so live calls are unavailable. Synced reads still work.", { reason: "connector_offline" });
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ApiError(504, "live_timeout", "Tally did not answer in time."));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, installationId });
      peer.ws.send(JSON.stringify({ t: "call", id, envelope }));
    });
  }

  nudge(installationId: string, what: "jobs" | "sync"): void {
    const peer = this.peers.get(installationId);
    if (peer?.ws.readyState === WebSocket.OPEN) peer.ws.send(JSON.stringify({ t: "nudge", what }));
  }

  async close(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const p of this.peers.values()) p.ws.terminate();
    this.peers.clear();
    this.wss?.close();
  }
}
