/** The platform's core operations, shared by the public, connector and connect-page controllers. */
import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  ENGINE_VERSION, LedgerInput, VoucherInput, WRITABLE_VOUCHERS, addCustomField, applyPrivacyClasses, assertWriteSafe, bundleHash, canonicalJson, compileLedgerNames, compileLedgerWrite,
  compileSampleKeys, compileVoucherLookup, compileVoucherTypes, compileVoucherWrite, DISCOVERY_OBJECTS, generateOpenApi, isWritable, remoteIdFor, renderTemplate, signEnvelope, standardPack, validateVoucherShape, withIdFilter,
  WriteValidationError, assertRendered,
  type Bundle, type CustomFieldInput, type DatasetDef, type Envelope, type FieldDef, type Policy, type Privacy,
} from "@hexspare/tally-engine";
import { CONFIG, type Config } from "./config.ts";
import { Db, type Tx } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { Hub } from "./hub.ts";
import { Webhooks } from "./webhooks.ts";

export interface Consent { rules: Policy; customDefault: Privacy }

const WEIGHTS = { synced_read: 1, live_read: 5, write: 10 } as const;
export type UsageKind = keyof typeof WEIGHTS;

const MAX_DELETE_FRACTION = 0.2;
const MIN_DELETE_GUARD = 10;

@Injectable()
export class Platform {
  constructor(private db: Db, private hub: Hub, private webhooks: Webhooks, @Inject(CONFIG) private config: Config) {}

  // -- Usage ---------------------------------------------------------------------------------
  async meter(tenantId: string, projectId: string, connectionId: string | null, kind: UsageKind): Promise<void> {
    await this.db.query("INSERT INTO usage_event (tenant_id, project_id, connection_id, kind, weight) VALUES ($1, $2, $3, $4, $5)", [tenantId, projectId, connectionId, kind, WEIGHTS[kind]]);
  }

  // -- Schema --------------------------------------------------------------------------------
  private sign<T>(kind: "bundle" | "job" | "probe", payload: T): Envelope<T> {
    return signEnvelope(kind, payload, this.config.signing);
  }

  /** Publishes a new immutable version and pins the connection to it. */
  async publish(c: Tx, conn: { id: string; tenant_id: string; project_id: string; company_name: string }, datasets: DatasetDef[]): Promise<{ id: string; version: number; hash: string }> {
    const version = ((await c.query("SELECT coalesce(max(version), 0) AS v FROM schema_version WHERE connection_id = $1", [conn.id])).rows[0].v as number) + 1;
    const openapi = generateOpenApi({ connectionId: conn.id, version, datasets });
    const bundle: Bundle = { format: 1, connectionId: conn.id, schemaVersion: version, minEngineVersion: ENGINE_VERSION, company: conn.company_name, datasets, openapi };
    // Every request is checked here, and again on the connector before it is sent.
    for (const d of datasets) { renderTemplate(d.template, { company: conn.company_name, uid: "0" }); renderTemplate(d.keysTemplate, { company: conn.company_name, uid: "0" }); }
    const hash = bundleHash(bundle);
    const envelope = this.sign("bundle", bundle);
    const sv = (await c.query(
      `INSERT INTO schema_version (tenant_id, connection_id, name, version, openapi, published_at, envelope, bundle_hash)
       VALUES ($1, $2, 'overlay', $3, $4, now(), $5, $6) RETURNING id`,
      [conn.tenant_id, conn.id, version, JSON.stringify(openapi), JSON.stringify(envelope), hash],
    )).rows[0].id as string;
    for (const d of datasets) {
      const ds = (await c.query(
        "INSERT INTO dataset (schema_version_id, name, tally_type, child_of, incremental, config) VALUES ($1, $2, $3, $4, true, $5) RETURNING id",
        [sv, d.name, d.voucherVar ? "Vouchers : VoucherType" : d.title, d.voucherVar ?? null, JSON.stringify({ paging: d.paging, rowTag: d.rowTag })],
      )).rows[0].id;
      const fields = d.fields;
      await c.query(
        `INSERT INTO field (dataset_id, name, tdl_expr, type, privacy, is_custom, udf_index, sort_order)
         SELECT $1, x.name, x.expr, x.type::field_type, x.privacy::field_privacy, x.custom, x.idx, x.ord
         FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::bool[], $7::int[], $8::int[]) AS x(name, expr, type, privacy, custom, idx, ord)`,
        [ds, fields.map((f) => f.name), fields.map((f) => f.expr), fields.map((f) => f.type), fields.map((f) => f.privacy), fields.map((f) => f.custom), fields.map((f) => f.udfIndex ?? null), fields.map((_, i) => i)],
      );
    }
    await c.query("UPDATE connection SET active_schema_version_id = $2 WHERE id = $1", [conn.id, sv]);
    await this.webhooks.emit(c, conn.tenant_id, conn.project_id, "schema.published", { connectionId: conn.id, version, bundleHash: hash });
    return { id: sv, version, hash };
  }

  async activeBundle(connectionId: string): Promise<{ bundle: Bundle; hash: string; version: number; envelope: Envelope<Bundle> }> {
    const r = await this.db.one(
      `SELECT s.envelope, s.bundle_hash, s.version FROM connection c JOIN schema_version s ON s.id = c.active_schema_version_id WHERE c.id = $1`, [connectionId]);
    if (!r) throw notFound("This connection has no published schema.");
    return { bundle: r.envelope.payload, hash: r.bundle_hash, version: r.version, envelope: r.envelope };
  }

  async dataset(connectionId: string, name: string): Promise<DatasetDef> {
    const { bundle } = await this.activeBundle(connectionId);
    const d = bundle.datasets.find((x) => x.name === name);
    if (!d) throw notFound(`Unknown dataset "${name}". See GET /v1/connections/${connectionId}/schema.`);
    return d;
  }

  async addFields(conn: any, inputs: (CustomFieldInput & { dataset: string })[]): Promise<{ version: number; hash: string }> {
    return this.db.tx(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [conn.id]);
      const { bundle } = await this.activeBundle(conn.id);
      const datasets = bundle.datasets.map((d) => d);
      for (const input of inputs) {
        const at = datasets.findIndex((d) => d.name === input.dataset);
        if (at < 0) throw notFound(`Unknown dataset "${input.dataset}".`);
        const { dataset: _ignored, ...field } = input;
        try {
          datasets[at] = addCustomField(datasets[at]!, field);
        } catch (e) {
          if (e instanceof ApiError || (e as Error).name === "InvalidExpressionError") throw e;
          throw new ApiError(422, "invalid_field", (e as Error).message);
        }
        if (input.udfName) await c.query("UPDATE discovered_field SET is_mapped = true WHERE connection_id = $1 AND udf_name = $2", [conn.id, input.udfName.toUpperCase()]);
      }
      const r = await this.publish(c, conn, datasets);
      return { version: r.version, hash: r.hash };
    }).then((r) => { if (conn.installation_id) this.hub.nudge(conn.installation_id, "sync"); return r; });
  }

  /** Rollback re-pins an earlier hash. The connector fetches that bundle on its next run. */
  async rollback(conn: any, version: number): Promise<{ version: number; hash: string }> {
    const sv = await this.db.one("SELECT id, bundle_hash FROM schema_version WHERE connection_id = $1 AND version = $2", [conn.id, version]);
    if (!sv) throw notFound(`No schema version ${version}.`);
    await this.db.query("UPDATE connection SET active_schema_version_id = $2 WHERE id = $1", [conn.id, sv.id]);
    if (conn.installation_id) this.hub.nudge(conn.installation_id, "sync");
    return { version, hash: sv.bundle_hash };
  }

  // -- Connection state ----------------------------------------------------------------------
  async status(connectionId: string): Promise<any> {
    const r = await this.db.one(
      `SELECT c.id, c.status, c.company_name, c.created_at, c.installation_id, i.channel_online, i.tally_open, i.last_seen_at, s.version AS schema_version,
         (SELECT max(last_synced_at) FROM sync_state ss WHERE ss.connection_id = c.id) AS last_sync
       FROM connection c LEFT JOIN installation i ON i.id = c.installation_id LEFT JOIN schema_version s ON s.id = c.active_schema_version_id
       WHERE c.id = $1`, [connectionId]);
    if (!r) throw notFound();
    const online = Boolean(r.installation_id && this.hub.isOnline(r.installation_id));
    return {
      id: r.id, status: r.status, company: r.company_name, createdAt: r.created_at,
      connectorOnline: online, tallyOpen: online && Boolean(r.tally_open),
      lastSeenAt: r.last_seen_at, lastSyncAt: r.last_sync, schemaVersion: r.schema_version,
    };
  }

  async revokeConnection(conn: any, by: "developer" | "customer"): Promise<void> {
    await this.db.tx(async (c) => {
      await c.query("UPDATE connection SET status = 'revoked' WHERE id = $1", [conn.id]);
      await c.query(
        `UPDATE write_job SET status = 'rejected', error_message = 'The connection was revoked before this job ran.', completed_at = now(), envelope = NULL
         WHERE connection_id = $1 AND status IN ('queued', 'sent')`, [conn.id]);
      await this.webhooks.emit(c, conn.tenant_id, conn.project_id, "connection.status_changed", { connectionId: conn.id, status: "revoked", by });
    });
  }

  // -- Sync ingest ---------------------------------------------------------------------------
  async ingest(conn: any, batch: { batchId: string; dataset: string; bundleHash: string; mode: "initial" | "delta" | "repair"; records: { id: string; alterId: string; body: unknown }[]; commit?: { watermark: number } }): Promise<{ applied: number }> {
    const known = await this.db.one("SELECT 1 FROM schema_version WHERE connection_id = $1 AND bundle_hash = $2", [conn.id, batch.bundleHash]);
    if (!known) throw new ApiError(409, "unknown_bundle", "This batch was produced by a bundle that does not belong to this connection.");
    const def = await this.dataset(conn.id, batch.dataset);
    const stripped = batch.records.map((r) => ({ ...r, body: stripExcluded(r.body, def) }));
    return this.db.tx(async (c) => {
      // Serialising per connection means a timestamp cursor can never skip a row committed late.
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 2))", [conn.id]);
      let applied = 0;
      if (stripped.length > 0) {
        const allowOlder = batch.mode === "repair";
        const rows = (await c.query(
          `INSERT INTO record (tenant_id, connection_id, dataset_name, tally_master_id, tally_alter_id, body, updated_at)
           SELECT $1, $2, $3, x.id::bigint, x.alter_id::bigint, x.body::jsonb, clock_timestamp()
           FROM unnest($4::text[], $5::text[], $6::text[]) AS x(id, alter_id, body)
           ON CONFLICT (connection_id, dataset_name, tally_master_id) DO UPDATE
             SET tally_alter_id = EXCLUDED.tally_alter_id, body = EXCLUDED.body, is_deleted = false, updated_at = clock_timestamp()
             WHERE (record.body IS DISTINCT FROM EXCLUDED.body OR record.is_deleted OR record.tally_alter_id <> EXCLUDED.tally_alter_id)
               AND ($7 OR EXCLUDED.tally_alter_id >= record.tally_alter_id)
           RETURNING tally_master_id::text AS id, tally_alter_id::text AS alter_id, (xmax = 0) AS inserted, body`,
          [conn.tenant_id, conn.id, batch.dataset, stripped.map((r) => r.id), stripped.map((r) => r.alterId), stripped.map((r) => JSON.stringify(r.body)), allowOlder],
        )).rows;
        applied = rows.length;
        // A first sync or backfill would otherwise send a webhook for every record in the company.
        if (batch.mode !== "initial") {
          await this.webhooks.emitMany(c, conn.tenant_id, conn.project_id, rows.map((r) => ({
            event: r.inserted ? "record.created" as const : "record.updated" as const,
            data: { connectionId: conn.id, dataset: batch.dataset, id: r.id, alterId: r.alter_id, record: r.body },
          })));
        }
      }
      if (batch.commit) {
        await c.query(
          `INSERT INTO sync_state (connection_id, dataset_name, last_alter_id, last_synced_at) VALUES ($1, $2, $3, now())
           ON CONFLICT (connection_id, dataset_name) DO UPDATE SET last_alter_id = EXCLUDED.last_alter_id, last_synced_at = now()`,
          [conn.id, batch.dataset, batch.commit.watermark]);
      }
      return { applied };
    });
  }

  /** Marks records missing from Tally as deleted, unless the change is large enough to be a glitch. */
  async reconcile(conn: any, body: { dataset: string; ids: string[]; maxAlterId: number }): Promise<{ deleted: number; held: boolean; repairNeeded: boolean }> {
    await this.dataset(conn.id, body.dataset);
    if (body.ids.length === 0) throw new ApiError(422, "empty_snapshot", "An empty snapshot is never trusted.");
    return this.db.tx(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 2))", [conn.id]);
      const params = [conn.id, body.dataset, body.ids];
      const missing = (await c.query(
        `SELECT r.tally_master_id::text AS id FROM record r
         WHERE r.connection_id = $1 AND r.dataset_name = $2 AND NOT r.is_deleted AND r.tally_alter_id <= $4
           AND NOT (r.tally_master_id = ANY($3::bigint[]))`, [...params, body.maxAlterId])).rows.map((r) => r.id as string);
      const live = (await c.query("SELECT count(*)::int AS n FROM record WHERE connection_id = $1 AND dataset_name = $2 AND NOT is_deleted", [conn.id, body.dataset])).rows[0].n as number;
      const unseen = (await c.query(
        `SELECT count(*)::int AS n FROM unnest($3::bigint[]) AS k(id) WHERE NOT EXISTS (
           SELECT 1 FROM record r WHERE r.connection_id = $1 AND r.dataset_name = $2 AND r.tally_master_id = k.id AND NOT r.is_deleted)`, params)).rows[0].n as number;
      const repairNeeded = unseen > 0;
      if (missing.length >= MIN_DELETE_GUARD && missing.length > live * MAX_DELETE_FRACTION) {
        await c.query(
          "INSERT INTO sync_issue (tenant_id, connection_id, kind, dataset_name, severity, message, details) VALUES ($1, $2, 'deletion_held', $3, 'warning', $4, $5)",
          [conn.tenant_id, conn.id, body.dataset, `${missing.length} of ${live} ${body.dataset} records appear deleted in Tally. Nothing was deleted; an operator should confirm.`, JSON.stringify({ count: missing.length, live })]);
        return { deleted: 0, held: true, repairNeeded };
      }
      if (missing.length > 0) {
        await c.query(
          `UPDATE record SET is_deleted = true, updated_at = clock_timestamp()
           WHERE connection_id = $1 AND dataset_name = $2 AND tally_master_id = ANY($3::bigint[])`, [conn.id, body.dataset, missing]);
        await this.webhooks.emitMany(c, conn.tenant_id, conn.project_id, missing.map((id) => ({ event: "record.deleted" as const, data: { connectionId: conn.id, dataset: body.dataset, id } })));
      }
      return { deleted: missing.length, held: false, repairNeeded };
    });
  }

  // -- Reads ---------------------------------------------------------------------------------
  async list(connectionId: string, dataset: string, q: { cursor?: string; limit: number; updatedSince?: string; includeDeleted: boolean; fields?: string[] }): Promise<{ data: unknown[]; nextCursor: string | null }> {
    const conds = ["connection_id = $1", "dataset_name = $2"];
    const params: unknown[] = [connectionId, dataset];
    if (!q.includeDeleted) conds.push("NOT is_deleted");
    if (q.updatedSince) { params.push(q.updatedSince); conds.push(`updated_at > $${params.length}`); }
    if (q.cursor) {
      const [ts, id] = decodeCursor(q.cursor);
      params.push(ts, id);
      conds.push(`(updated_at, tally_master_id) > ($${params.length - 1}::timestamptz, $${params.length}::bigint)`);
    }
    params.push(q.limit + 1);
    // updated_at goes out as text: a JavaScript Date would drop the microseconds the cursor needs.
    const rows = (await this.db.query(
      `SELECT tally_master_id::text AS id, tally_alter_id::text AS alter_id, body, is_deleted, updated_at::text AS updated_at
       FROM record WHERE ${conds.join(" AND ")} ORDER BY updated_at, tally_master_id LIMIT $${params.length}`, params)).rows;
    const page = rows.slice(0, q.limit);
    const last = page.at(-1);
    return {
      data: page.map((r) => shapeRecord(r, q.fields)),
      nextCursor: rows.length > q.limit && last ? encodeCursor(last.updated_at, last.id) : null,
    };
  }

  async getRecord(connectionId: string, dataset: string, id: string, fields?: string[]): Promise<unknown> {
    if (!/^\d{1,18}$/.test(id)) throw notFound("No such record.");
    const r = await this.db.one(
      `SELECT tally_master_id::text AS id, tally_alter_id::text AS alter_id, body, is_deleted, updated_at::text AS updated_at
       FROM record WHERE connection_id = $1 AND dataset_name = $2 AND tally_master_id = $3`, [connectionId, dataset, id]);
    if (!r) throw notFound("No such record.");
    return shapeRecord(r, fields);
  }

  private probe<T extends object>(connectionId: string, payload: T) {
    return this.sign("probe", { connectionId, exp: Date.now() + 60_000, nonce: randomUUID(), ...payload });
  }

  /** Forwards a read to Tally now. Date-paged datasets need a window so Tally never builds its full history. */
  async liveRead(conn: any, d: DatasetDef, q: { id?: string; limit: number; from?: number; to?: number }): Promise<{ records: { id: string; alterId: string; body: Record<string, unknown> }[]; truncated: boolean }> {
    const company = conn.company_name as string;
    const uid = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    let template = d.template;
    if (q.id) template = withIdFilter(template, d.tdlCollection, q.id);
    const params: Parameters<typeof renderTemplate>[1] = { company, uid };
    if (d.paging === "date") {
      if (q.id) { params.from = 19000101; params.to = 29991231; } else {
        const now = new Date();
        const ym = now.getUTCFullYear() * 100 + now.getUTCMonth() + 1;
        params.from = q.from ?? ym * 100 + 1;
        params.to = q.to ?? ym * 100 + 31;
      }
    }
    const requestXml = renderTemplate(template, params);
    return this.hub.call(conn.installation_id, this.probe(conn.id, { op: "read", dataset: d.name, requestXml, limit: q.limit, fields: d.fields, lines: d.lines, rowTag: d.rowTag }));
  }

  async discover(conn: any): Promise<unknown[]> {
    const uid = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    const types = DISCOVERY_OBJECTS.map((tallyType) => ({ tallyType, company: conn.company_name, keysXml: assertRendered(compileSampleKeys(tallyType, conn.company_name, uid)) }));
    const r = await this.hub.call(conn.installation_id, this.probe(conn.id, { op: "discover", company: conn.company_name, types }), 120_000);
    for (const u of r.udfs) {
      await this.db.query(
        `INSERT INTO discovered_field (tenant_id, connection_id, tally_type, udf_name, udf_index, type, sample_values) VALUES ($1, $2, $3, $4, $5, $6::field_type, $7)
         ON CONFLICT (connection_id, tally_type, udf_name) DO UPDATE SET udf_index = EXCLUDED.udf_index, type = EXCLUDED.type, sample_values = EXCLUDED.sample_values, discovered_at = now()`,
        [conn.tenant_id, conn.id, u.tallyType, u.udfName, u.index, u.type, JSON.stringify(u.samples)]);
    }
    return r.udfs.map((u: any) => ({ ...u, suggestedExpr: `$${u.udfName}` }));
  }

  // -- Writes --------------------------------------------------------------------------------
  private preflight(company: string, uid: string) {
    return { ledgers: compileLedgerNames(company, `${uid}a`), voucherTypes: compileVoucherTypes(company, `${uid}b`), companies: standardPack.companiesRequest };
  }

  private parseWrite(dataset: string, body: unknown): { kind: "voucher" | "ledger"; input: VoucherInput | LedgerInput; defaultType: string } {
    if (!isWritable(dataset)) throw new ApiError(405, "dataset_not_writable", `${dataset} does not accept writes yet. Writable: ledgers, ${Object.keys(WRITABLE_VOUCHERS).join(", ")}.`);
    if (dataset === "ledgers") return { kind: "ledger", input: LedgerInput.parse(body), defaultType: "" };
    return { kind: "voucher", input: VoucherInput.parse(body), defaultType: WRITABLE_VOUCHERS[dataset]!.voucherType };
  }

  /** Accepts a write. The same key always returns the same job; a different payload is a conflict. */
  async createWriteJob(auth: { tenantId: string; projectId: string }, conn: any, dataset: string, action: "create" | "alter", recordId: string | null, key: string, body: unknown): Promise<{ job: any; replayed: boolean }> {
    if (!key || key.length > 255) throw new ApiError(400, "idempotency_key_required", "Send an Idempotency-Key header of at most 255 characters.");
    const { kind, input, defaultType } = this.parseWrite(dataset, body);
    const payloadHash = createHash("sha256").update(canonicalJson({ connection: conn.id, dataset, action, recordId, body: input })).digest("hex");
    const existing = await this.findJob(auth.projectId, key);
    if (existing) return this.replay(existing, payloadHash);

    const def = await this.dataset(conn.id, dataset);
    const remoteId = remoteIdFor(conn.id, key);
    const uid = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    let importXml: string;
    let lookupXml: string | null = null;
    if (kind === "voucher") {
      const v = input as VoucherInput;
      importXml = compileVoucherWrite({ company: conn.company_name, dataset, input: v, remoteId, action, ...(recordId ? { masterId: recordId } : {}), customFieldDefs: def.fields });
      if (action === "create") lookupXml = compileVoucherLookup({ company: conn.company_name, voucherVar: WRITABLE_VOUCHERS[dataset]!.voucherVar, remoteId, date: v.date, uid });
    } else {
      let existingName: string | undefined;
      if (action === "alter") {
        const rec: any = await this.getRecord(conn.id, dataset, recordId!);
        existingName = rec.name;
      }
      importXml = compileLedgerWrite({ company: conn.company_name, input: input as LedgerInput, action, ...(existingName ? { existingName } : {}), customFieldDefs: def.fields });
    }
    assertWriteSafe(importXml);
    const jobId = randomUUID();
    const envelope = this.sign("job", {
      jobId, connectionId: conn.id, scope: "write", dataset, action, company: conn.company_name, kind, importXml, lookupXml,
      preflight: this.preflight(conn.company_name, uid), input, defaultType,
    });
    const row = (await this.db.query(
      `INSERT INTO write_job (id, tenant_id, project_id, connection_id, dataset_name, action, idempotency_key, request_body, tally_master_id, payload_hash, remote_id, priority, envelope)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (project_id, idempotency_key) DO NOTHING RETURNING *`,
      [jobId, auth.tenantId, auth.projectId, conn.id, dataset, action, key, JSON.stringify(input), recordId, payloadHash, remoteId, kind === "ledger" ? 0 : 1, JSON.stringify(envelope)],
    )).rows[0];
    if (!row) {
      // Lost a race with the same key. Exactly one insert wins, and this caller gets that job.
      return this.replay((await this.findJob(auth.projectId, key))!, payloadHash);
    }
    await this.meter(auth.tenantId, auth.projectId, conn.id, "write");
    if (conn.installation_id) this.hub.nudge(conn.installation_id, "jobs");
    return { job: jobView(row), replayed: false };
  }

  private findJob(projectId: string, key: string) {
    return this.db.one("SELECT * FROM write_job WHERE project_id = $1 AND idempotency_key = $2", [projectId, key]);
  }

  private replay(job: any, payloadHash: string) {
    if (job.payload_hash !== payloadHash) throw new ApiError(409, "idempotency_conflict", "This Idempotency-Key was already used with a different request.");
    return { job: jobView(job), replayed: true };
  }

  async getJob(projectId: string, jobId: string): Promise<unknown> {
    if (!isUuid(jobId)) throw notFound("No such write job.");
    const job = await this.db.one("SELECT * FROM write_job WHERE id = $1 AND project_id = $2", [jobId, projectId]);
    if (!job) throw notFound("No such write job.");
    return jobView(job);
  }

  async validate(conn: any, dataset: string, body: unknown): Promise<{ valid: boolean; issues: unknown[] }> {
    const { kind, input, defaultType } = this.parseWrite(dataset, body);
    if (kind === "voucher") {
      const shape = validateVoucherShape(input as VoucherInput);
      if (shape.length) return { valid: false, issues: shape };
    }
    const uid = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    const r = await this.hub.call(conn.installation_id, this.probe(conn.id, { op: "validate", kind, action: "create", input, defaultType, company: conn.company_name, preflight: this.preflight(conn.company_name, uid) }));
    return { valid: r.issues.length === 0, issues: r.issues };
  }

  /** Oldest unfinished job per connection, masters first. A job stays claimable until it reports a result. */
  async claimJobs(installationId: string): Promise<unknown[]> {
    return this.db.tx(async (c) => {
      const rows = (await c.query(
        `SELECT j.id, j.envelope FROM write_job j WHERE j.id IN (
           SELECT DISTINCT ON (q.connection_id) q.id
           FROM write_job q JOIN connection n ON n.id = q.connection_id
           WHERE n.installation_id = $1 AND n.status = 'active' AND q.status IN ('queued', 'sent')
           ORDER BY q.connection_id, q.priority, q.seq)
         FOR UPDATE SKIP LOCKED`, [installationId])).rows;
      if (rows.length) await c.query("UPDATE write_job SET status = 'sent' WHERE id = ANY($1::uuid[]) AND status = 'queued'", [rows.map((r) => r.id)]);
      return rows.map((r) => r.envelope);
    });
  }

  async finishJob(installationId: string, jobId: string, result: { status: "completed" | "failed" | "rejected"; tallyId: string | null; created: number; altered: number; errors: { code: string; message: string; path?: string }[]; deduplicated?: boolean }): Promise<void> {
    await this.db.tx(async (c) => {
      const job = (await c.query(
        `SELECT j.*, n.tenant_id AS t, n.project_id AS p FROM write_job j JOIN connection n ON n.id = j.connection_id WHERE j.id = $1 AND n.installation_id = $2 FOR UPDATE OF j`, [jobId, installationId])).rows[0];
      if (!job) throw notFound("No such job.");
      // The first terminal result wins. A repeated report changes nothing and sends no second webhook.
      if (!["queued", "sent"].includes(job.status)) return;
      const message = result.errors.map((e) => e.message).join(" ") || null;
      const masterId = result.tallyId && /^\d+$/.test(result.tallyId) ? result.tallyId : job.tally_master_id;
      await c.query(
        `UPDATE write_job SET status = $2, result = $3, error_message = $4, tally_master_id = $5, completed_at = now(), envelope = NULL WHERE id = $1`,
        [jobId, result.status, JSON.stringify(result), message, masterId]);
      if (result.status !== "completed") {
        await c.query(
          "INSERT INTO sync_issue (tenant_id, connection_id, kind, dataset_name, message, details, write_job_id) VALUES ($1, $2, 'write_rejected', $3, $4, $5, $6)",
          [job.t, job.connection_id, job.dataset_name, message ?? "The write failed.", JSON.stringify(result), jobId]);
      }
      await this.webhooks.emit(c, job.t, job.p, result.status === "completed" ? "write_job.completed" : "write_job.failed", {
        jobId, connectionId: job.connection_id, dataset: job.dataset_name, idempotencyKey: job.idempotency_key, status: result.status, tallyId: masterId, errors: result.errors,
      });
    });
  }
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function jobView(j: any) {
  const r = j.result ?? {};
  return {
    id: j.id, connectionId: j.connection_id, dataset: j.dataset_name, action: j.action, idempotencyKey: j.idempotency_key,
    status: j.status, tallyId: j.tally_master_id ?? null, created: r.created ?? null, altered: r.altered ?? null, deduplicated: r.deduplicated ?? false,
    errors: r.errors ?? (j.error_message ? [{ code: "rejected", message: j.error_message }] : []),
    payloadHash: j.payload_hash, createdAt: j.created_at, completedAt: j.completed_at,
  };
}

function shapeRecord(r: any, fields?: string[]) {
  const body = fields ? Object.fromEntries(Object.entries(r.body).filter(([k]) => fields.includes(k))) : r.body;
  return { id: r.id, alterId: r.alter_id, updatedAt: r.updated_at, ...(r.is_deleted ? { deleted: true } : {}), ...body };
}

const encodeCursor = (ts: string, id: string) => Buffer.from(JSON.stringify([ts, id])).toString("base64url");
function decodeCursor(c: string): [string, string] {
  try {
    const [ts, id] = JSON.parse(Buffer.from(c, "base64url").toString());
    if (typeof ts === "string" && /^\d+$/.test(id) && !Number.isNaN(Date.parse(ts.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")))) return [ts, id];
  } catch { /* falls through */ }
  throw new ApiError(400, "invalid_cursor", "This cursor is not valid.");
}

/** A second check behind the connector: an excluded field never gets stored, even if a client sends it. */
function stripExcluded(body: unknown, def: DatasetDef): unknown {
  const allowed = new Set([...def.fields.map((f: FieldDef) => f.name), ...def.lines.map((l) => l.name)]);
  return Object.fromEntries(Object.entries(body as Record<string, unknown>).filter(([k]) => allowed.has(k)));
}

export function initialDatasets(consent: Consent, requested: (CustomFieldInput & { dataset: string })[]): DatasetDef[] {
  let datasets = standardPack.datasets.map((d) => {
    const prefix = `${d.name}.`;
    const classes = Object.fromEntries(Object.entries(consent.rules).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
    return applyPrivacyClasses(d, classes);
  });
  for (const f of requested) {
    const cls = consent.rules[`${f.dataset}.${f.name}`] ?? consent.customDefault;
    if (cls === "excluded") continue;
    datasets = datasets.map((d) => (d.name === f.dataset ? addCustomField(d, { ...f, privacy: cls }) : d));
  }
  return datasets;
}
