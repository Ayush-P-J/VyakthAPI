/**
 * Durable local state. In the Electron connector this moves to its better-sqlite3 database; the
 * statements are plain SQLite, so only this file's connection line changes.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Policy, Privacy } from "@hexspare/tally-engine";

export type JobState = "seen" | "posting" | "done";
export interface OutboxRow { id: string; connectionId: string; dataset: string; payload: string }
export interface DatasetState { watermark: number; defHash: string; lastKeysAt: number; repair: boolean }

export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS policy (connection_id TEXT PRIMARY KEY, rules TEXT NOT NULL, custom_default TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS dataset_state (connection_id TEXT, dataset TEXT, watermark INTEGER NOT NULL DEFAULT 0, def_hash TEXT NOT NULL DEFAULT '', last_keys_at INTEGER NOT NULL DEFAULT 0, repair INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (connection_id, dataset));
      CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, connection_id TEXT NOT NULL, dataset TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS job_ledger (job_id TEXT PRIMARY KEY, state TEXT NOT NULL, result TEXT);
      CREATE TABLE IF NOT EXISTS revoked (connection_id TEXT PRIMARY KEY);
    `);
  }

  get(k: string): string | null {
    return (this.db.prepare("SELECT v FROM kv WHERE k = ?").get(k) as { v: string } | undefined)?.v ?? null;
  }
  set(k: string, v: string): void {
    this.db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").run(k, v);
  }

  policy(connectionId: string): { rules: Policy; customDefault: Privacy } | null {
    const r = this.db.prepare("SELECT rules, custom_default FROM policy WHERE connection_id = ?").get(connectionId) as { rules: string; custom_default: Privacy } | undefined;
    return r ? { rules: JSON.parse(r.rules), customDefault: r.custom_default } : null;
  }
  savePolicy(connectionId: string, rules: Policy, customDefault: Privacy): void {
    this.db.prepare("INSERT INTO policy (connection_id, rules, custom_default) VALUES (?, ?, ?) ON CONFLICT (connection_id) DO UPDATE SET rules = excluded.rules, custom_default = excluded.custom_default").run(connectionId, JSON.stringify(rules), customDefault);
  }

  dataset(connectionId: string, dataset: string): DatasetState {
    const r = this.db.prepare("SELECT watermark, def_hash, last_keys_at, repair FROM dataset_state WHERE connection_id = ? AND dataset = ?").get(connectionId, dataset) as { watermark: number; def_hash: string; last_keys_at: number; repair: number } | undefined;
    return r ? { watermark: r.watermark, defHash: r.def_hash, lastKeysAt: r.last_keys_at, repair: r.repair === 1 } : { watermark: 0, defHash: "", lastKeysAt: 0, repair: false };
  }
  saveDataset(connectionId: string, dataset: string, patch: Partial<DatasetState>): void {
    const s = { ...this.dataset(connectionId, dataset), ...patch };
    this.db.prepare(`INSERT INTO dataset_state (connection_id, dataset, watermark, def_hash, last_keys_at, repair) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (connection_id, dataset) DO UPDATE SET watermark = excluded.watermark, def_hash = excluded.def_hash, last_keys_at = excluded.last_keys_at, repair = excluded.repair`)
      .run(connectionId, dataset, s.watermark, s.defHash, s.lastKeysAt, s.repair ? 1 : 0);
  }

  enqueue(id: string, connectionId: string, dataset: string, payload: unknown): void {
    this.db.prepare("INSERT INTO outbox (id, connection_id, dataset, payload) VALUES (?, ?, ?, ?)").run(id, connectionId, dataset, JSON.stringify(payload));
  }
  pendingOutbox(limit = 50): OutboxRow[] {
    return (this.db.prepare("SELECT id, connection_id, dataset, payload FROM outbox ORDER BY seq LIMIT ?").all(limit) as { id: string; connection_id: string; dataset: string; payload: string }[])
      .map((r) => ({ id: r.id, connectionId: r.connection_id, dataset: r.dataset, payload: r.payload }));
  }
  /** The watermark moves only when the cloud has committed the batch, in one local transaction. */
  ackOutbox(row: OutboxRow, watermark?: number): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM outbox WHERE id = ?").run(row.id);
      if (watermark !== undefined) this.saveDataset(row.connectionId, row.dataset, { watermark, repair: false });
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  outboxCount(connectionId: string, dataset: string): number {
    return (this.db.prepare("SELECT count(*) AS n FROM outbox WHERE connection_id = ? AND dataset = ?").get(connectionId, dataset) as { n: number }).n;
  }

  job(jobId: string): { state: JobState; result: unknown } | null {
    const r = this.db.prepare("SELECT state, result FROM job_ledger WHERE job_id = ?").get(jobId) as { state: JobState; result: string | null } | undefined;
    return r ? { state: r.state, result: r.result ? JSON.parse(r.result) : null } : null;
  }
  saveJob(jobId: string, state: JobState, result: unknown = null): void {
    this.db.prepare("INSERT INTO job_ledger (job_id, state, result) VALUES (?, ?, ?) ON CONFLICT (job_id) DO UPDATE SET state = excluded.state, result = excluded.result").run(jobId, state, result === null ? null : JSON.stringify(result));
  }

  markRevoked(connectionId: string): void {
    this.db.prepare("INSERT OR IGNORE INTO revoked (connection_id) VALUES (?)").run(connectionId);
  }
  isRevoked(connectionId: string): boolean {
    return this.db.prepare("SELECT 1 FROM revoked WHERE connection_id = ?").get(connectionId) !== undefined;
  }

  close(): void { this.db.close(); }
}
