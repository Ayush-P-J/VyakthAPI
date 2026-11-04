/**
 * The connector's platform runtime: sync, live channel and write jobs. It verifies, renders, sends,
 * normalises, masks and uploads. It never compiles TDL (ADR-1), and it is built as a library with no
 * Electron imports so the Vyakth connector can host it next to its existing sync.
 */
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import {
  COMPANY_ROW, ENGINE_VERSION, LedgerInput, SAMPLE_RECORDS, TallyResponseError, VoucherInput, applyPolicy, assertExportOnly, assertRendered, assertWriteSafe,
  bundleHash, collectRows, compareVersions, evaluateLedger, evaluateVoucher, normaliseRow, parseDate, parseDiscovery, parseImportResult, parseRows, readPreflight,
  renderTemplate, sha256, canonicalJson, standardPack, stricter, unwrap, verifyEnvelope,
  type Bundle, type DatasetDef, type DiscoveredUdf, type Envelope, type FieldDef, type LineDef, type Policy, type Privacy, type WriteIssue,
} from "@hexspare/tally-engine";
import { Priority, TallyAmbiguousError, TallyClient, TallyUnavailableError } from "./tally-client.ts";
import { Store } from "./store.ts";

export interface RuntimeOptions {
  cloudUrl: string;
  tallyHost?: string;
  tallyPort?: number;
  dataPath: string;
  /** Hexspare's public signing keys, by key ID. Shipped with the connector, never fetched. */
  trustedKeys: Record<string, string>;
  syncIntervalMs?: number;
  /** How often the key-only deletion check runs. */
  keysIntervalMs?: number;
  batchSize?: number;
  /** Allows plain http to a non-loopback host, for the Docker demo network only. */
  allowInsecureCloud?: boolean;
  version?: string;
  now?: () => number;
  log?: (msg: string) => void;
}

export interface CompanyInfo { name: string; guid: string; serial: string | null; booksFrom: string | null }
interface ConnectionInfo { id: string; company: string; status: string; bundleHash: string; schemaVersion: number; consent: { rules?: Policy; customDefault?: Privacy } }

export interface JobPayload {
  jobId: string; connectionId: string; scope: "write"; dataset: string; action: "create" | "alter"; company: string; kind: "voucher" | "ledger";
  importXml: string; lookupXml: string | null; preflight: { ledgers: string; voucherTypes: string; companies: string }; input: unknown; defaultType: string;
}
export type ProbePayload = { connectionId: string; exp: number } & (
  | { op: "read"; dataset: string; requestXml: string; limit: number; fields: FieldDef[]; lines: LineDef[]; rowTag: string }
  | { op: "discover"; company: string; types: { tallyType: string; keysXml: string; company: string }[] }
  | { op: "validate"; kind: "voucher" | "ledger"; action: "create" | "alter"; input: unknown; defaultType: string; company: string; preflight: { ledgers: string; voucherTypes: string; companies: string } }
);

const ROW = new Set(["ROW"]);
const yyyymm = (d: Date) => d.getUTCFullYear() * 100 + d.getUTCMonth() + 1;

export class CloudError extends Error {
  override name = "CloudError";
  constructor(public status: number, public code: string, message: string, public retryable: boolean) { super(message); }
}

export function assertCloudUrl(url: string, allowInsecure: boolean): string {
  const u = new URL(url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (loopback || allowInsecure))) throw new Error("Use HTTPS for remote backends. HTTP is allowed only for localhost development.");
  return u.toString().replace(/\/$/, "");
}

export class ConnectorRuntime {
  readonly store: Store;
  readonly tally: TallyClient;
  private readonly cloudUrl: string;
  private ws: WebSocket | null = null;
  private stopped = true;
  private timers: NodeJS.Timeout[] = [];
  private bundles = new Map<string, Bundle>();
  private syncRunning: Promise<void> | null = null;
  private jobsRunning: Promise<void> | null = null;
  private reconnectDelay = 1000;
  private now: () => number;
  private log: (m: string) => void;
  /** Datasets to sync, for tests or a staged rollout. Default: all in the bundle. */
  datasetFilter: ((name: string) => boolean) | null = null;

  constructor(private opts: RuntimeOptions) {
    this.cloudUrl = assertCloudUrl(opts.cloudUrl, opts.allowInsecureCloud ?? false);
    this.store = new Store(opts.dataPath);
    this.tally = new TallyClient(opts.tallyHost ?? "127.0.0.1", opts.tallyPort ?? 9000);
    this.now = opts.now ?? Date.now;
    this.log = opts.log ?? (() => {});
  }

  private get secret(): string | null { return this.store.get("device_secret"); }

  private async cloud<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.cloudUrl}/connector/v1/${path}`, {
        method, redirect: "error",
        headers: { "content-type": "application/json", ...(this.secret ? { authorization: `Bearer ${this.secret}` } : {}), "x-connector-version": this.opts.version ?? ENGINE_VERSION },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (e) {
      throw new CloudError(0, "network", `Cannot reach the cloud: ${(e as Error).message}`, true);
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new CloudError(res.status, json?.error?.code ?? "error", json?.error?.message ?? `HTTP ${res.status}`, res.status >= 500 || res.status === 429);
    return json as T;
  }

  /** Reads the companies open in Tally. */
  async companies(priority = Priority.Sync): Promise<CompanyInfo[]> {
    const xml = await this.tally.post(standardPack.companiesRequest, priority, 30_000);
    return (await collectRows(xml, COMPANY_ROW)).map((c) => ({
      name: unwrap(c.NAME) ?? "", guid: unwrap(c.GUID) ?? "", serial: unwrap(c.TALLYSERIAL), booksFrom: parseDate(unwrap(c.BOOKSFROM) ?? unwrap(c.STARTINGFROM)),
    })).filter((c) => c.name);
  }

  /** Step 2 of the connect flow: the customer's connector joins the link and reports its companies. */
  async enroll(linkToken: string): Promise<void> {
    const companies = await this.companies();
    const r = await this.cloud<{ deviceSecret?: string; installationId: string }>("POST", "enroll", { linkToken, companies, appVersion: this.opts.version ?? ENGINE_VERSION });
    if (r.deviceSecret) this.store.set("device_secret", r.deviceSecret);
    this.store.set("installation_id", r.installationId);
  }

  async revoke(connectionId: string): Promise<void> {
    this.store.markRevoked(connectionId);
    await this.cloud("POST", `connections/${connectionId}/revoke`, {});
    this.bundles.delete(connectionId);
  }

  /** The customer tightens a field locally. The cloud can never loosen this. */
  tighten(connectionId: string, path: string, cls: Privacy): void {
    const p = this.store.policy(connectionId) ?? { rules: {}, customDefault: "masked" as Privacy };
    p.rules[path] = stricter(p.rules[path] ?? "public", cls);
    this.store.savePolicy(connectionId, p.rules, p.customDefault);
  }

  private adoptPolicy(c: ConnectionInfo): { rules: Policy; customDefault: Privacy } {
    const existing = this.store.policy(c.id);
    if (existing) {
      // After first adoption the cloud may only tighten what the customer approved.
      for (const [path, cls] of Object.entries(c.consent.rules ?? {})) existing.rules[path] = stricter(existing.rules[path] ?? "public", cls);
      this.store.savePolicy(c.id, existing.rules, existing.customDefault);
      return existing;
    }
    const fresh = { rules: { ...(c.consent.rules ?? {}) }, customDefault: c.consent.customDefault ?? ("masked" as Privacy) };
    this.store.savePolicy(c.id, fresh.rules, fresh.customDefault);
    return fresh;
  }

  /** Custom fields added after consent take the class the customer chose for new fields. */
  private effectivePolicy(connectionId: string, def: { name: string; fields: FieldDef[]; lines: LineDef[] }): Policy {
    const p = this.store.policy(connectionId) ?? { rules: {}, customDefault: "masked" as Privacy };
    const rules: Policy = { ...p.rules };
    const visit = (fields: FieldDef[], lines: LineDef[], prefix: string) => {
      for (const f of fields) if (f.custom && !(`${prefix}${f.name}` in rules)) rules[`${prefix}${f.name}`] = p.customDefault;
      for (const l of lines) visit(l.fields, l.lines, `${prefix}${l.name}.`);
    };
    visit(def.fields, def.lines, `${def.name}.`);
    return rules;
  }

  private async fetchBundle(c: ConnectionInfo): Promise<Bundle | null> {
    const cached = this.bundles.get(c.id);
    if (cached && bundleHash(cached) === c.bundleHash) return cached;
    const env = await this.cloud<Envelope<Bundle>>("GET", `connections/${c.id}/bundle`);
    const bundle = verifyEnvelope(env, "bundle", this.opts.trustedKeys);
    if (bundle.connectionId !== c.id) throw new Error("Bundle belongs to another connection");
    if (bundleHash(bundle) !== c.bundleHash) throw new Error("Bundle does not match its pinned hash");
    if (compareVersions(bundle.minEngineVersion, ENGINE_VERSION) > 0) {
      this.log(`Connector update needed: bundle requires engine ${bundle.minEngineVersion}`);
      await this.reportIssue(c.id, "connector_update_needed", `Bundle needs engine ${bundle.minEngineVersion}; this connector has ${ENGINE_VERSION}.`).catch(() => {});
      return cached ?? null;
    }
    for (const d of bundle.datasets) {
      renderTemplate(d.template, { company: bundle.company, uid: "0" });
      renderTemplate(d.keysTemplate, { company: bundle.company, uid: "0" });
    }
    this.bundles.set(c.id, bundle);
    return bundle;
  }

  private reportIssue(connectionId: string, kind: string, message: string, dataset?: string): Promise<unknown> {
    return this.cloud("POST", `connections/${connectionId}/issues`, { kind, message, dataset });
  }

  private uid(): string { return `${this.now()}_${randomUUID().slice(0, 8).replace(/-/g, "")}`; }

  /** Uploads the outbox in order. Stops at the first failure so order is never broken. */
  async drainOutbox(): Promise<void> {
    for (;;) {
      const rows = this.store.pendingOutbox();
      if (rows.length === 0) return;
      for (const row of rows) {
        const payload = JSON.parse(row.payload) as { commit?: { watermark: number } };
        try {
          await this.cloud("POST", `connections/${row.connectionId}/batches`, payload);
        } catch (e) {
          if (e instanceof CloudError && !e.retryable) {
            if (e.status === 403 || e.status === 404) { this.store.ackOutbox(row); continue; }
            await this.reportIssue(row.connectionId, "batch_blocked", e.message, row.dataset).catch(() => {});
          }
          throw e;
        }
        this.store.ackOutbox(row, payload.commit?.watermark);
      }
    }
  }

  private months(booksFrom: string | null): { from: number; to: number }[] {
    const start = booksFrom ? new Date(`${booksFrom}T00:00:00Z`) : new Date(this.now());
    // Post-dated vouchers can sit well past today, so the window runs one year ahead.
    const end = new Date(this.now() + 366 * 86_400_000);
    const out: { from: number; to: number }[] = [];
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (yyyymm(d) <= yyyymm(end)) {
      const m = yyyymm(d);
      out.push({ from: m * 100 + 1, to: m * 100 + 31 });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }

  private async fetchKeys(company: string, d: DatasetDef): Promise<{ id: number; alterId: number }[]> {
    const xml = await this.tally.post(renderTemplate(d.keysTemplate, { company, uid: this.uid() }), Priority.Sync);
    const out: { id: number; alterId: number }[] = [];
    for await (const r of parseRows(xml, ROW)) {
      const id = Number(unwrap(r.MASTERIDVALUE)), alterId = Number(unwrap(r.ALTERIDVALUE));
      if (Number.isSafeInteger(id) && id > 0) out.push({ id, alterId: Number.isSafeInteger(alterId) ? alterId : 0 });
    }
    return out;
  }

  private async pull(connectionId: string, bundle: Bundle, d: DatasetDef, xml: string, mode: string, onRow: (alterId: number) => void): Promise<void> {
    const raw = await this.tally.post(xml, Priority.Sync);
    const policy = this.effectivePolicy(connectionId, d);
    const batchSize = this.opts.batchSize ?? 500;
    const hash = bundleHash(bundle);
    let batch: { id: string; alterId: string; body: unknown }[] = [];
    const flush = () => {
      if (batch.length === 0) return;
      const id = randomUUID();
      this.store.enqueue(id, connectionId, d.name, { batchId: id, dataset: d.name, bundleHash: hash, mode, records: batch });
      batch = [];
    };
    for await (const row of parseRows(raw, new Set([d.rowTag.toUpperCase()]))) {
      const rec = normaliseRow(row, d);
      if (!rec) { this.log(`Skipped a ${d.name} row with no valid identity`); continue; }
      onRow(Number(rec.alterId));
      batch.push({ id: rec.id, alterId: rec.alterId, body: applyPolicy(rec.body, d, policy, d.name) });
      if (batch.length >= batchSize) flush();
    }
    flush();
  }

  private packRanges(ids: number[], target: number): { gt: number; lte: number }[] {
    const sorted = [...ids].sort((a, b) => a - b);
    const ranges: { gt: number; lte: number }[] = [];
    let gt = 0;
    for (let i = target - 1; i < sorted.length; i += target) {
      ranges.push({ gt, lte: sorted[i]! });
      gt = sorted[i]!;
    }
    if (gt < (sorted.at(-1) ?? 0)) ranges.push({ gt, lte: sorted.at(-1)! });
    return ranges;
  }

  private async syncDataset(c: ConnectionInfo, bundle: Bundle, d: DatasetDef, booksFrom: string | null): Promise<void> {
    // A changed definition means existing rows lack new fields, so that dataset is pulled again.
    const defHash = sha256(canonicalJson({ t: d.template, f: d.fields, l: d.lines, p: this.effectivePolicy(c.id, d) }));
    let st = this.store.dataset(c.id, d.name);
    if (st.defHash !== defHash) {
      this.store.saveDataset(c.id, d.name, { watermark: 0, defHash });
      st = this.store.dataset(c.id, d.name);
    }
    if (this.store.outboxCount(c.id, d.name) > 0) return;
    const company = bundle.company;
    let maxAlter = st.watermark;
    const onRow = (a: number) => { if (a > maxAlter) maxAlter = a; };
    const full = st.watermark === 0 || st.repair;
    const mode = st.repair ? "repair" : st.watermark === 0 ? "initial" : "delta";

    if (!full) {
      await this.pull(c.id, bundle, d, renderTemplate(d.template, { company, uid: this.uid(), watermark: st.watermark }), mode, onRow);
    } else if (d.paging === "date" && booksFrom) {
      // A record altered mid-way could land in a page already read. Starting the next delta from the
      // highest AlterID seen *before* paging means it is simply read again, never missed.
      const start = await this.fetchKeys(company, d);
      const startMax = start.reduce((m, k) => Math.max(m, k.alterId), 0);
      for (const r of this.months(booksFrom)) await this.pull(c.id, bundle, d, renderTemplate(d.template, { company, uid: this.uid(), ...r }), mode, () => {});
      maxAlter = startMax;
    } else if (d.paging === "masterId") {
      const start = await this.fetchKeys(company, d);
      const startMax = start.reduce((m, k) => Math.max(m, k.alterId), 0);
      for (const r of this.packRanges(start.map((k) => k.id), this.opts.batchSize ?? 500)) await this.pull(c.id, bundle, d, renderTemplate(d.template, { company, uid: this.uid(), ...r }), mode, () => {});
      maxAlter = startMax;
    } else {
      await this.pull(c.id, bundle, d, renderTemplate(d.template, { company, uid: this.uid() }), mode, onRow);
    }
    const id = randomUUID();
    this.store.enqueue(id, c.id, d.name, { batchId: id, dataset: d.name, bundleHash: bundleHash(bundle), mode, records: [], commit: { watermark: maxAlter } });
    await this.drainOutbox();
  }

  private async keysPass(c: ConnectionInfo, bundle: Bundle, d: DatasetDef): Promise<void> {
    const st = this.store.dataset(c.id, d.name);
    const every = this.opts.keysIntervalMs ?? 24 * 3_600_000;
    if (this.now() - st.lastKeysAt < every || st.watermark === 0 || this.store.outboxCount(c.id, d.name) > 0) return;
    const keys = await this.fetchKeys(bundle.company, d);
    const max = keys.reduce((m, k) => Math.max(m, k.alterId), 0);
    // AlterIDs going backwards means a restore or repair in Tally: the watermark is meaningless.
    if (keys.length > 0 && max < st.watermark) {
      this.log(`${d.name}: AlterIDs went backwards (${max} < ${st.watermark}), repairing`);
      this.store.saveDataset(c.id, d.name, { repair: true });
      return;
    }
    if (keys.length === 0) {
      // Never act on an empty list: a glitch must not look like a wiped company.
      this.store.saveDataset(c.id, d.name, { lastKeysAt: this.now() });
      return;
    }
    const r = await this.cloud<{ repairNeeded: boolean }>("POST", `connections/${c.id}/keys`, { dataset: d.name, ids: keys.map((k) => String(k.id)), maxAlterId: max });
    this.store.saveDataset(c.id, d.name, { lastKeysAt: this.now(), ...(r.repairNeeded ? { repair: true } : {}) });
  }

  /** One sync pass over every approved connection. */
  async syncOnce(): Promise<void> {
    if (this.syncRunning) return this.syncRunning;
    this.syncRunning = this.syncInner().finally(() => { this.syncRunning = null; });
    return this.syncRunning;
  }

  private async syncInner(): Promise<void> {
    await this.drainOutbox();
    const connections = await this.cloud<ConnectionInfo[]>("GET", "connections");
    let companies: CompanyInfo[];
    try {
      companies = await this.companies();
    } catch (e) {
      if (e instanceof TallyUnavailableError) { await this.sendStatus(); return; }
      throw e;
    }
    await this.sendStatus();
    for (const c of connections) {
      if (this.store.isRevoked(c.id)) continue;
      if (c.status !== "active") { this.bundles.delete(c.id); continue; }
      this.adoptPolicy(c);
      const open = companies.find((x) => x.name === c.company);
      if (!open) continue;
      const bundle = await this.fetchBundle(c);
      if (!bundle) continue;
      for (const d of bundle.datasets) {
        if (this.datasetFilter && !this.datasetFilter(d.name)) continue;
        try {
          await this.syncDataset(c, bundle, d, open.booksFrom);
          await this.keysPass(c, bundle, d);
        } catch (e) {
          if (e instanceof TallyUnavailableError || e instanceof CloudError) throw e;
          // One dataset failing must not block the rest. The watermark stays, so it retries next pass.
          this.log(`${d.name} sync failed: ${(e as Error).message}`);
          await this.reportIssue(c.id, "sync_failed", (e as Error).message, d.name).catch(() => {});
        }
      }
    }
  }

  private async runPreflight(p: { preflight: { ledgers: string; voucherTypes: string; companies: string }; kind: "voucher" | "ledger"; action: "create" | "alter"; input: unknown; defaultType: string; company: string }, priority: Priority): Promise<WriteIssue[]> {
    const send = (xml: string) => { assertRendered(xml); return this.tally.post(xml, priority, 60_000); };
    const ledgers = await send(p.preflight.ledgers);
    const voucherTypes = await send(p.preflight.voucherTypes);
    const companies = await send(p.preflight.companies);
    const data = await readPreflight(p.company, { ledgers, voucherTypes, companies });
    return p.kind === "voucher" ? evaluateVoucher(VoucherInput.parse(p.input), p.defaultType, data) : evaluateLedger(LedgerInput.parse(p.input), p.action, data);
  }

  /** Runs one write job. A retried job never posts twice: see the ledger states below. */
  private async runJob(env: Envelope<JobPayload>): Promise<void> {
    const job = verifyEnvelope(env, "job", this.opts.trustedKeys);
    if (job.scope !== "write") throw new Error("Job has no write scope");
    if (this.store.isRevoked(job.connectionId)) return;
    assertWriteSafe(job.importXml);
    const ledger = this.store.job(job.jobId);
    if (ledger?.state === "done") {
      await this.cloud("POST", `jobs/${job.jobId}/result`, ledger.result);
      return;
    }
    let result: { status: "completed" | "failed" | "rejected"; tallyId: string | null; created: number; altered: number; errors: WriteIssue[]; deduplicated?: boolean; statusNote?: string };
    try {
      // Look first, every time. A job that finds its voucher already there is complete, whether this
      // is a crash recovery, a lost response, or a retry the cloud sent again.
      if (job.lookupXml) {
        assertExportOnly(job.lookupXml);
        const rows = await collectRows(await this.tally.post(job.lookupXml, Priority.Job, 60_000), ROW);
        const found = unwrap(rows[0]?.MASTERIDVALUE);
        if (found) {
          result = { status: "completed", tallyId: found.trim(), created: 0, altered: 0, errors: [], deduplicated: true };
          this.store.saveJob(job.jobId, "done", result);
          await this.cloud("POST", `jobs/${job.jobId}/result`, result);
          return;
        }
      }
      const issues = await this.runPreflight(job, Priority.Job);
      if (issues.length > 0) {
        result = { status: "rejected", tallyId: null, created: 0, altered: 0, errors: issues };
      } else {
        // Durable before the POST. If the process dies here, the next run looks before posting again.
        this.store.saveJob(job.jobId, "posting");
        const r = parseImportResult(await this.tally.post(job.importXml, Priority.Job, 120_000));
        result = { status: r.ok ? "completed" : "failed", tallyId: r.tallyId, created: r.created, altered: r.altered, errors: r.issues };
      }
    } catch (e) {
      if (e instanceof TallyUnavailableError || e instanceof TallyAmbiguousError) {
        this.log(`Job ${job.jobId} will retry: ${(e as Error).message}`);
        return;
      }
      if (e instanceof TallyResponseError) {
        this.log(`Job ${job.jobId} will retry after a bad Tally response: ${e.message}`);
        return;
      }
      throw e;
    }
    this.store.saveJob(job.jobId, "done", result);
    await this.cloud("POST", `jobs/${job.jobId}/result`, result);
  }

  async runJobsOnce(): Promise<void> {
    if (this.jobsRunning) return this.jobsRunning;
    this.jobsRunning = (async () => {
      for (const env of await this.cloud<Envelope<JobPayload>[]>("POST", "jobs/claim", {})) {
        try {
          await this.runJob(env);
        } catch (e) {
          // A job we refuse (bad signature, unsafe request) is reported, and never posted.
          this.log(`Refused job: ${(e as Error).message}`);
          const id = (env.payload as JobPayload | undefined)?.jobId;
          if (id && !(e instanceof CloudError)) {
            const result = { status: "rejected", tallyId: null, created: 0, altered: 0, errors: [{ code: "connector_refused", message: (e as Error).message }] };
            await this.cloud("POST", `jobs/${id}/result`, result).catch(() => {});
          }
        }
      }
    })().finally(() => { this.jobsRunning = null; });
    return this.jobsRunning;
  }

  private async discover(p: Extract<ProbePayload, { op: "discover" }>): Promise<DiscoveredUdf[]> {
    const found = new Map<string, DiscoveredUdf>();
    for (const t of p.types) {
      assertRendered(t.keysXml);
      const ids = (await collectRows(await this.tally.post(t.keysXml, Priority.Live, 60_000), ROW)).map((r) => Number(unwrap(r.MASTERIDVALUE))).filter((n) => n > 0).sort((a, b) => a - b);
      if (ids.length === 0) continue;
      const { compileNativeSample } = await import("@hexspare/tally-engine");
      const lte = ids[Math.min(SAMPLE_RECORDS, ids.length) - 1]!;
      parseDiscovery(await this.tally.post(compileNativeSample(t.tallyType, t.company, 0, lte), Priority.Live, 60_000), t.tallyType, found);
    }
    return [...found.values()];
  }

  /** Answers a live call. Everything here is a signed, read-only, time-limited probe. */
  async handleProbe(env: Envelope<ProbePayload>): Promise<unknown> {
    const p = verifyEnvelope(env, "probe", this.opts.trustedKeys);
    if (this.now() > p.exp) throw new Error("Probe expired");
    if (this.store.isRevoked(p.connectionId)) throw new Error("Connection revoked");
    switch (p.op) {
      case "read": {
        assertRendered(p.requestXml);
        const raw = await this.tally.post(p.requestXml, Priority.Live, 30_000);
        const def = { name: p.dataset, fields: p.fields, lines: p.lines };
        const policy = this.effectivePolicy(p.connectionId, def);
        const records: unknown[] = [];
        let truncated = false;
        for await (const row of parseRows(raw, new Set([p.rowTag.toUpperCase()]))) {
          if (records.length >= p.limit) { truncated = true; break; }
          const rec = normaliseRow(row, def);
          if (rec) records.push({ id: rec.id, alterId: rec.alterId, body: applyPolicy(rec.body, def, policy, p.dataset) });
        }
        return { records, truncated };
      }
      case "discover": return { udfs: await this.discover(p) };
      case "validate": return { issues: await this.runPreflight(p, Priority.Live) };
    }
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private async sendStatus(): Promise<void> {
    this.send({ t: "status", tallyOpen: this.tally.lastOpen });
  }

  private connectChannel(): void {
    if (this.stopped || !this.secret) return;
    const url = this.cloudUrl.replace(/^http/, "ws") + "/connector/v1/channel";
    const ws = new WebSocket(url, { headers: { authorization: `Bearer ${this.secret}` }, maxPayload: 16 * 1024 * 1024 });
    this.ws = ws;
    ws.on("open", () => {
      this.reconnectDelay = 1000;
      this.log("Channel connected");
      void this.companies(Priority.Live).catch(() => {}).finally(() => this.sendStatus());
      void this.runJobsOnce().catch((e) => this.log(String(e)));
    });
    ws.on("message", (data) => void this.onMessage(data.toString()));
    ws.on("close", () => {
      if (this.stopped) return;
      // Outward-only and self-healing: the customer's firewall never needs an open port.
      setTimeout(() => this.connectChannel(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60_000);
    });
    ws.on("error", (e) => this.log(`Channel error: ${e.message}`));
  }

  private async onMessage(text: string): Promise<void> {
    let msg: { t: string; id?: string; envelope?: Envelope<ProbePayload>; what?: string };
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.t === "call" && msg.id && msg.envelope) {
      try {
        const data = await this.handleProbe(msg.envelope);
        this.send({ t: "reply", id: msg.id, ok: true, data });
      } catch (e) {
        const code = e instanceof TallyUnavailableError ? "tally_unavailable" : e instanceof TallyResponseError ? "tally_error" : "connector_error";
        this.send({ t: "reply", id: msg.id, ok: false, error: { code, message: (e as Error).message } });
      }
      await this.sendStatus();
    } else if (msg.t === "nudge") {
      if (msg.what === "jobs") void this.runJobsOnce().catch((e) => this.log(String(e)));
      if (msg.what === "sync") void this.syncOnce().catch((e) => this.log(String(e)));
    }
  }

  start(): void {
    this.stopped = false;
    this.connectChannel();
    const tick = () => {
      void this.syncOnce().catch((e) => this.log(`Sync: ${(e as Error).message}`));
      void this.runJobsOnce().catch((e) => this.log(`Jobs: ${(e as Error).message}`));
    };
    tick();
    this.timers.push(setInterval(tick, this.opts.syncIntervalMs ?? 60_000));
  }

  /** Connects the channel only, for tests that drive sync by hand. */
  startChannel(): Promise<void> {
    this.stopped = false;
    this.connectChannel();
    return new Promise((resolve, reject) => {
      this.ws!.once("open", () => setTimeout(resolve, 50));
      this.ws!.once("error", reject);
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.ws?.close();
    await Promise.allSettled([this.syncRunning, this.jobsRunning]);
  }

  close(): void { this.store.close(); }
}
