import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { CONFIG, type Config } from "./config.ts";

// bigint arrives as a string, which is what MasterIDs and AlterIDs should be.
export type Tx = pg.PoolClient;

@Injectable()
export class Db implements OnModuleDestroy {
  readonly pool: pg.Pool;
  constructor(@Inject(CONFIG) config: Config) {
    this.pool = new pg.Pool({ connectionString: config.databaseUrl, max: Number(process.env.DB_POOL_SIZE ?? 20) });
    // A dropped idle connection must not bring the process down.
    this.pool.on("error", (e) => console.error("[db] idle client error", e.message));
  }
  query<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }
  async one<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    return (await this.pool.query<T>(sql, params)).rows[0] ?? null;
  }
  async tx<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const out = await fn(c);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }
  onModuleDestroy() { return this.pool.end(); }
}

/** Applies migrations in order, once, under a lock, so several containers can start together. */
export async function migrate(databaseUrl: string, dir: string): Promise<string[]> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock(727001)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      await client.query("BEGIN");
      try {
        await client.query(readFileSync(join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727001)").catch(() => {});
    await client.end();
  }
  return applied;
}
