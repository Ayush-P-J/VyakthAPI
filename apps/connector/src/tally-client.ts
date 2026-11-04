/**
 * Talks to the local Tally. TallyPrime serves one request at a time, so every request goes through
 * one queue, and live calls and writes overtake waiting sync pages.
 */
import { request } from "node:http";

export class TallyUnavailableError extends Error { override name = "TallyUnavailableError"; }
/** The request may or may not have reached Tally. For a write this means "look before retrying". */
export class TallyAmbiguousError extends Error { override name = "TallyAmbiguousError"; }

export enum Priority { Live = 0, Job = 1, Sync = 2 }

interface Queued { xml: string; priority: Priority; timeoutMs: number; resolve: (s: string) => void; reject: (e: Error) => void }

export class TallyClient {
  private queue: Queued[] = [];
  private busy = false;
  lastOpen = false;

  constructor(private host: string, private port: number) {}

  post(xml: string, priority: Priority, timeoutMs = 120_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const item = { xml, priority, timeoutMs, resolve, reject };
      const at = this.queue.findIndex((q) => q.priority > priority);
      if (at === -1) this.queue.push(item); else this.queue.splice(at, 0, item);
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.busy) return;
    const item = this.queue.shift();
    if (!item) return;
    this.busy = true;
    try {
      item.resolve(await this.send(item.xml, item.timeoutMs));
      this.lastOpen = true;
    } catch (e) {
      if (e instanceof TallyUnavailableError) this.lastOpen = false;
      item.reject(e as Error);
    } finally {
      this.busy = false;
      void this.pump();
    }
  }

  private send(xml: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = Buffer.from(xml, "utf8");
      let sent = false;
      const req = request({
        hostname: this.host, port: this.port, method: "POST", path: "/", timeout: timeoutMs,
        headers: { "Content-Type": "text/xml; charset=utf-8", "Content-Length": body.length },
      }, (res) => {
        if ((res.statusCode ?? 500) >= 400) { res.resume(); reject(new TallyAmbiguousError(`Tally HTTP ${res.statusCode}`)); return; }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", (e) => reject(new TallyAmbiguousError(`Tally connection dropped: ${e.message}`)));
      });
      req.on("socket", (s) => s.once("connect", () => { sent = true; }));
      req.on("timeout", () => req.destroy(new TallyAmbiguousError(`Tally did not answer within ${timeoutMs} ms`)));
      req.on("error", (e: NodeJS.ErrnoException) => {
        if (e instanceof TallyAmbiguousError) return reject(e);
        const refused = e.code === "ECONNREFUSED" || e.code === "EHOSTUNREACH" || e.code === "ENOTFOUND" || !sent;
        reject(refused ? new TallyUnavailableError("Tally is not running or its HTTP server is off") : new TallyAmbiguousError(`Tally connection dropped: ${e.message}`));
      });
      req.end(body);
    });
  }
}
