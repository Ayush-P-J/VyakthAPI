"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQueries = exports.durableOutbox = exports.db = void 0;
exports.initDb = initDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const outbox_1 = require("./outbox");
const electron_1 = require("electron");
const node_crypto_1 = require("node:crypto");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
// Packaged installs can't write next to the code (e.g. under Program Files), so they get the
// database under the OS's per-user app-data directory — same as h7001's drizzle/database/index.ts.
// Running unpackaged (`npm start`) instead puts it in the project root, so it's easy to find and
// inspect during development rather than buried under the home directory.
function resolveDbPath() {
    if (electron_1.app.isPackaged) {
        const appDir = path_1.default.join(os_1.default.homedir(), ".vyakth-connector");
        if (!fs_1.default.existsSync(appDir)) {
            fs_1.default.mkdirSync(appDir, { recursive: true });
        }
        return path_1.default.join(appDir, "connector.db");
    }
    return path_1.default.join(__dirname, "..", "connector.db");
}
const dbPath = resolveDbPath();
exports.db = new better_sqlite3_1.default(dbPath);
exports.db.pragma("journal_mode = WAL");
exports.db.pragma("synchronous = FULL");
exports.durableOutbox = new outbox_1.DurableOutbox(exports.db);
function initDb() {
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      companyId TEXT,
      entityType TEXT,
      lastAlterId INTEGER,
      updatedAt TEXT,
      PRIMARY KEY (companyId, entityType)
    );

    CREATE TABLE IF NOT EXISTS outbox_batch (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      entityType TEXT,
      payload TEXT,
      payloadHash TEXT,
      createdAt TEXT,
      attemptCount INTEGER DEFAULT 0,
      nextAttemptAt TEXT,
      status TEXT CHECK(status IN ('pending','uploading','completed','failed')),
      lastError TEXT,
      cloudAcknowledgedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      entityType TEXT,
      startedAt TEXT,
      finishedAt TEXT,
      recordCount INTEGER,
      status TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS outstanding_report_schedule (
      companyId TEXT NOT NULL,
      entityType TEXT NOT NULL CHECK(entityType IN ('outstanding_payable','outstanding_receivable')),
      startedAt TEXT NOT NULL,
      lastAttemptAt TEXT,
      PRIMARY KEY(companyId, entityType)
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      companyId TEXT PRIMARY KEY,
      companyName TEXT,
      syncEnabled INTEGER DEFAULT 1,
      updatedAt TEXT
    );

    -- Single row (id = 1): this installation's paired device credential. Absent until
    -- pairDevice() succeeds — CloudUploader treats "no row" as "not paired yet" and fails the
    -- batch (retried later), rather than crashing.
    CREATE TABLE IF NOT EXISTS device_credential (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      installationId TEXT NOT NULL,
      deviceSecret TEXT NOT NULL,
      cloudBaseUrl TEXT NOT NULL,
      pairedAt TEXT NOT NULL
    );

    -- Single row (id = 1): user-editable connector settings. Row is seeded with defaults by
    -- getAppSettings() on first read rather than here, so this table stays a plain CREATE TABLE
    -- (no INSERT OR IGNORE needed at migration time).
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tallyHost TEXT NOT NULL DEFAULT '127.0.0.1',
      tallyPort INTEGER NOT NULL DEFAULT 9000,
      syncIntervalMinutes INTEGER NOT NULL DEFAULT 20,
      launchAtLogin INTEGER NOT NULL DEFAULT 1,
      proxyEnabled INTEGER NOT NULL DEFAULT 0,
      proxyUrl TEXT NOT NULL DEFAULT '',
      tallyRetryAttempts INTEGER NOT NULL DEFAULT 2,
      notificationsEnabled INTEGER NOT NULL DEFAULT 1,
      masterChunkSize INTEGER NOT NULL DEFAULT 2000,
      deletedVoucherSyncEnabled INTEGER NOT NULL DEFAULT 0,
      deletedVoucherSyncFrequencyMinutes INTEGER NOT NULL DEFAULT 60
    );

    -- Persisted, resumable date-range backfill plan for a first-time voucher-type sync — ported
    -- from h7001's sync_batch_plans table (drizzle/database/schema.ts), keyed by the Tally company
    -- GUID here instead of a local integer company id since this connector has no companies table.
    -- Status meanings match h7001 exactly: Pending = runnable; Running = crash marker, reset to
    -- Pending on the next sync before being picked up again; Completed = success; Failed =
    -- terminal give-up; Split = subdivided into two child rows, kept for lineage only.
    CREATE TABLE IF NOT EXISTS sync_batch_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyId TEXT NOT NULL,
      voucherType TEXT NOT NULL,
      fromDate TEXT NOT NULL,
      toDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      splitDepth INTEGER NOT NULL DEFAULT 0,
      parentBatchId INTEGER,
      estimatedVoucherCount INTEGER,
      actualVoucherCount INTEGER,
      startedAt TEXT,
      completedAt TEXT,
      error TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS sync_batch_plans_lookup_idx
      ON sync_batch_plans (companyId, voucherType, status);
  `);
    const reportScheduleColumns = exports.db
        .prepare("PRAGMA table_info(outstanding_report_schedule)")
        .all();
    if (!reportScheduleColumns.some((column) => column.name === "lastAttemptAt"))
        exports.db.exec("ALTER TABLE outstanding_report_schedule ADD COLUMN lastAttemptAt TEXT");
    migrateAppSettingsColumns();
    const companyColumns = exports.db
        .prepare("PRAGMA table_info(company_settings)")
        .all();
    if (!companyColumns.some((column) => column.name === "selected")) {
        // Older releases auto-enrolled discoveries; consent cannot be inferred from those rows.
        // Retain all queues/checkpoints, but require one explicit selection after upgrading.
        exports.db.exec("ALTER TABLE company_settings ADD COLUMN selected INTEGER NOT NULL DEFAULT 0");
    }
    exports.db.exec("CREATE TABLE IF NOT EXISTS company_metadata(companyId TEXT PRIMARY KEY,payload TEXT NOT NULL)");
    refetchForTrackingNumbers();
    exports.durableOutbox.init();
    exports.db.exec(`CREATE TABLE IF NOT EXISTS connector_license_cache(id INTEGER PRIMARY KEY CHECK(id=1), encrypted TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS connector_installation(id INTEGER PRIMARY KEY CHECK(id=1), installationId TEXT NOT NULL);`);
    if (!exports.db.prepare("PRAGMA table_info(connector_installation)").all().some(column => column.name === "deviceSecret"))
        exports.db.exec("ALTER TABLE connector_installation ADD COLUMN deviceSecret TEXT");
    if (!companyColumns.some(column => column.name === "companyRegistrationId"))
        exports.db.exec("ALTER TABLE company_settings ADD COLUMN companyRegistrationId TEXT");
    // Whole-run timing (Tally fetch + cloud upload). sync_runs only times each entity's fetch, which
    // is often milliseconds, so it can't answer "how long did the last sync take".
    if (!companyColumns.some(column => column.name === "lastFullSyncStartedAt"))
        exports.db.exec("ALTER TABLE company_settings ADD COLUMN lastFullSyncStartedAt TEXT");
    if (!companyColumns.some(column => column.name === "lastFullSyncFinishedAt"))
        exports.db.exec("ALTER TABLE company_settings ADD COLUMN lastFullSyncFinishedAt TEXT");
    // Old report payloads lacked completeness metadata. Retain them for audit and fetch a fresh
    // snapshot under a new identity; they must not block the new report stream forever.
    exports.db.exec(`INSERT OR REPLACE INTO outbox_blocks SELECT id,'Legacy report retained; superseded by full-snapshot sync'
    FROM outbox_batch WHERE entityType IN ('outstanding_payable','outstanding_receivable') AND status!='completed'
      AND CASE WHEN json_valid(payload) THEN json_type(payload,'$.report') ELSE NULL END IS NULL;
    UPDATE outbox_fetches SET state='aborted' WHERE entityType IN ('outstanding_payable','outstanding_receivable')
      AND id IN (SELECT l.fetchId FROM outbox_fetch_batches l JOIN outbox_blocks b ON b.batchId=l.batchId
        WHERE b.reason='Legacy report retained; superseded by full-snapshot sync');`);
    exports.db.exec(`CREATE TABLE IF NOT EXISTS backend_session (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    userId TEXT NOT NULL, tenantId TEXT NOT NULL, email TEXT NOT NULL,
    accessToken TEXT NOT NULL, refreshToken TEXT NOT NULL,
    cloudBaseUrl TEXT NOT NULL, signedInAt TEXT NOT NULL
  )`);
    const sessionColumns = exports.db
        .prepare("PRAGMA table_info(backend_session)")
        .all();
    if (!sessionColumns.some((column) => column.name === "needsSignIn"))
        exports.db.exec("ALTER TABLE backend_session ADD COLUMN needsSignIn INTEGER NOT NULL DEFAULT 0");
}
// Pre-release builds fetched these voucher types without batch tracking numbers, so the cloud
// couldn't tell an invoice made against a receipt/delivery note and counted its stock twice.
// Re-fetch their history once: completed plans run again; a company with no plan replans from
// scratch. On a fresh install there is nothing to re-fetch, so this only records itself.
// Uploads are idempotent upserts, so the cloud just gains the missing fields.
function refetchForTrackingNumbers() {
    exports.db.exec("CREATE TABLE IF NOT EXISTS connector_upgrades(name TEXT PRIMARY KEY)");
    const upgrade = "tracking-numbers";
    if (exports.db.prepare("SELECT 1 FROM connector_upgrades WHERE name=?").get(upgrade))
        return;
    const types = [
        ["voucher_purchase", "Purchase"],
        ["voucher_receiptnote", "ReceiptNote"],
        ["voucher_deliverynote", "DeliveryNote"],
        ["voucher_creditnote", "CreditNote"],
        ["voucher_debitnote", "DebitNote"],
    ];
    exports.db.transaction(() => {
        for (const [entityType, voucherType] of types) {
            exports.db.prepare("UPDATE sync_batch_plans SET status='Pending',attempts=0,error=NULL WHERE voucherType=? AND status!='Split'").run(voucherType);
            exports.db.prepare(`UPDATE sync_checkpoints SET lastAlterId=0 WHERE entityType=?
          AND companyId NOT IN (SELECT companyId FROM sync_batch_plans WHERE voucherType=?)`).run(entityType, voucherType);
        }
        exports.db.prepare("INSERT INTO connector_upgrades(name) VALUES(?)").run(upgrade);
    })();
}
// CREATE TABLE IF NOT EXISTS above doesn't add columns to an app_settings table that already
// exists from before these settings were introduced — an existing install's db file needs an
// explicit ALTER TABLE for each new column, guarded by PRAGMA table_info so re-running this on
// an already-migrated (or brand new, already-correct) db is a safe no-op.
function migrateAppSettingsColumns() {
    const existing = new Set(exports.db.prepare("PRAGMA table_info(app_settings)").all().map((c) => c.name));
    const newColumns = [
        ["proxyEnabled", "INTEGER NOT NULL DEFAULT 0"],
        ["proxyUrl", "TEXT NOT NULL DEFAULT ''"],
        ["tallyRetryAttempts", "INTEGER NOT NULL DEFAULT 2"],
        ["notificationsEnabled", "INTEGER NOT NULL DEFAULT 1"],
        ["masterChunkSize", "INTEGER NOT NULL DEFAULT 2000"],
        ["deletedVoucherSyncEnabled", "INTEGER NOT NULL DEFAULT 0"],
        ["outstandingReportSyncEnabled", "INTEGER NOT NULL DEFAULT 1"],
        ["outstandingReportSyncFrequencyMinutes", "INTEGER NOT NULL DEFAULT 60"],
        ["deletedVoucherSyncFrequencyMinutes", "INTEGER NOT NULL DEFAULT 60"],
    ];
    for (const [name, definition] of newColumns) {
        if (!existing.has(name)) {
            exports.db.exec(`ALTER TABLE app_settings ADD COLUMN ${name} ${definition}`);
        }
    }
}
const DEFAULT_APP_SETTINGS = {
    tallyHost: "127.0.0.1",
    tallyPort: 9000,
    syncIntervalMinutes: 20,
    launchAtLogin: 1,
    proxyEnabled: 0,
    proxyUrl: "",
    tallyRetryAttempts: 2,
    notificationsEnabled: 1,
    masterChunkSize: 2000,
    deletedVoucherSyncEnabled: 0,
    deletedVoucherSyncFrequencyMinutes: 60,
    outstandingReportSyncEnabled: 1,
    outstandingReportSyncFrequencyMinutes: 60,
};
exports.dbQueries = {
    getCompanyMetadata(companyId) {
        const row = exports.db
            .prepare("SELECT payload FROM company_metadata WHERE companyId=?")
            .get(companyId);
        return row ? JSON.parse(row.payload) : {};
    },
    setCompanyMetadata(companyId, metadata) {
        exports.db.prepare("INSERT OR REPLACE INTO company_metadata VALUES(?,?)").run(companyId, JSON.stringify(metadata));
    },
    getCheckpoint(companyId, entityType) {
        const row = exports.db
            .prepare("SELECT lastAlterId FROM sync_checkpoints WHERE companyId = ? AND entityType = ?")
            .get(companyId, entityType);
        return row ? row.lastAlterId : 0;
    },
    insertOutboxBatch(batch) {
        exports.db.prepare(`
      INSERT INTO outbox_batch (id, companyId, entityType, payload, payloadHash, createdAt, attemptCount, nextAttemptAt, status, lastError, cloudAcknowledgedAt)
      VALUES (@id, @companyId, @entityType, @payload, @payloadHash, @createdAt, @attemptCount, @nextAttemptAt, @status, @lastError, @cloudAcknowledgedAt)
    `).run({ ...batch, payloadHash: (0, outbox_1.payloadHash)(batch.payload) });
    },
    updateOutboxBatchStatus(id, status, nextAttemptAt, lastError, cloudAcknowledgedAt, attemptCount) {
        exports.db.prepare(`
      UPDATE outbox_batch SET status = ?, nextAttemptAt = ?, lastError = ?, cloudAcknowledgedAt = ?, attemptCount = ?
      WHERE id = ?
    `).run(status, nextAttemptAt, lastError, cloudAcknowledgedAt, attemptCount, id);
    },
    // Id-only — a batch's `payload` column can be several MB for a large voucher batch, so
    // materializing every pending batch's full row at once (a plain `SELECT *`) would hold all of
    // them in memory simultaneously for the whole upload loop. retrySweep (sync.ts) fetches ids
    // here (cheap) and each full row individually inside its loop (via getOutboxBatchById), so at
    // most one payload is resident at a time — this is what caused the connector to OOM on a large
    // first-time backfill, where ~30 outbox batches across every voucher type were all pending for
    // the trailing flush at once.
    //
    // nextAttemptAt is stored as ISO-8601 (toISOString(), e.g. "2026-09-11T10:19:27.060Z"), not
    // SQLite's own "YYYY-MM-DD HH:MM:SS" text-date format — a raw string comparison against
    // datetime('now') is wrong (the literal "T" always sorts after a space, so nextAttemptAt <=
    // datetime('now') was false for essentially every real timestamp, permanently stranding any
    // batch that had ever failed once). Wrapping both sides in datetime(...) normalizes to the
    // same comparable text format first.
    getPendingBatchIds() {
        return exports.db
            .prepare(`SELECT b.id FROM outbox_batch b
            JOIN company_settings c ON c.companyId=b.companyId AND c.selected=1 AND c.syncEnabled=1
            LEFT JOIN outbox_blocks x ON x.batchId=b.id
            LEFT JOIN outbox_fetch_batches l ON l.batchId=b.id
            LEFT JOIN outbox_fetches f ON f.id=l.fetchId
            WHERE b.status IN ('pending','failed') AND x.batchId IS NULL
            AND (l.batchId IS NULL OR f.state='sealed')
            ORDER BY b.companyId, CASE b.entityType
              WHEN 'company' THEN 0 WHEN 'ledger_group' THEN 1 WHEN 'cost_category' THEN 2
              WHEN 'cost_centre' THEN 3 WHEN 'unit' THEN 4 WHEN 'godown' THEN 5
              WHEN 'stock_group' THEN 6 WHEN 'stock_category' THEN 7 WHEN 'stock_item' THEN 8
              WHEN 'stock_item_bom' THEN 9 WHEN 'ledger' THEN 10 WHEN 'voucher_type' THEN 11
              WHEN 'voucher_deletion_probe' THEN 30 WHEN 'outstanding_receivable' THEN 31
              WHEN 'outstanding_payable' THEN 32 WHEN 'stock_item_value' THEN 33 ELSE 20 END, b.createdAt, b.rowid`)
            .all().map((row) => row.id);
    },
    getOutboxBatchById(id) {
        return exports.db.prepare("SELECT * FROM outbox_batch WHERE id = ?").get(id);
    },
    isOutboxBatchBlocked(id) {
        return !!exports.db.prepare("SELECT 1 FROM outbox_blocks WHERE batchId=?").get(id);
    },
    getPendingCount(companyId, entityType) {
        const row = exports.db
            .prepare("SELECT COUNT(*) as cnt FROM outbox_batch WHERE companyId = ? AND entityType = ? AND status IN ('pending', 'failed') AND id NOT IN (SELECT batchId FROM outbox_blocks WHERE reason LIKE 'Legacy report retained%' OR reason LIKE 'Superseded legacy stock-item batch%' OR reason LIKE 'Superseded ledger batch%' OR reason LIKE 'Superseded company batch%' OR reason LIKE 'Superseded self-referential BOM batch%' OR reason LIKE 'Superseded invalid bill allocation batch%' OR reason LIKE 'Superseded incorrect voucher recordCount%')")
            .get(companyId, entityType);
        return row.cnt;
    },
    getFailedFetches() {
        return exports.db
            .prepare("SELECT companyId,count(*) AS count FROM sync_batch_plans WHERE status='Failed' AND companyId IN (SELECT companyId FROM company_settings WHERE selected=1 AND syncEnabled=1) GROUP BY companyId")
            .all();
    },
    retryFailedFetches(companyId) {
        exports.db.prepare("UPDATE sync_batch_plans SET status='Pending',attempts=0,error=NULL WHERE companyId=? AND status='Failed'").run(companyId);
    },
    getBlockedBatches() {
        return exports.db
            .prepare("SELECT x.batchId AS id, x.reason FROM outbox_blocks x JOIN outbox_batch b ON b.id=x.batchId JOIN company_settings c ON c.companyId=b.companyId WHERE c.selected=1 AND x.reason NOT LIKE 'Legacy report retained%' AND x.reason NOT LIKE 'Superseded legacy stock-item batch%' AND x.reason NOT LIKE 'Superseded ledger batch%' AND x.reason NOT LIKE 'Superseded company batch%' AND x.reason NOT LIKE 'Superseded self-referential BOM batch%' AND x.reason NOT LIKE 'Superseded invalid bill allocation batch%' AND x.reason NOT LIKE 'Superseded incorrect voucher recordCount%'")
            .all();
    },
    getFailedBatches() {
        return exports.db
            .prepare(`SELECT b.id, c.companyName, b.entityType, b.lastError, b.nextAttemptAt
         FROM outbox_batch b
         JOIN company_settings c ON c.companyId=b.companyId
         LEFT JOIN outbox_blocks x ON x.batchId=b.id
         WHERE c.selected=1 AND c.syncEnabled=1 AND b.status='failed'
             AND (x.batchId IS NULL OR (x.reason NOT LIKE 'Legacy report retained%'
             AND x.reason NOT LIKE 'Superseded legacy stock-item batch%'
             AND x.reason NOT LIKE 'Superseded ledger batch%'
             AND x.reason NOT LIKE 'Superseded company batch%'
             AND x.reason NOT LIKE 'Superseded self-referential BOM batch%'
             AND x.reason NOT LIKE 'Superseded invalid bill allocation batch%'
             AND x.reason NOT LIKE 'Superseded incorrect voucher recordCount%'))
         ORDER BY b.createdAt DESC LIMIT 20`)
            .all();
    },
    retryBlockedBatch(id) {
        exports.durableOutbox.unblock(id);
    },
    retryBatchNow(id) {
        const batch = exports.db
            .prepare(`SELECT 1 FROM outbox_batch b JOIN company_settings c ON c.companyId=b.companyId
         WHERE b.id=? AND b.status='failed' AND c.selected=1 AND c.syncEnabled=1
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id
             AND (x.reason LIKE 'Superseded self-referential BOM batch%'
               OR x.reason LIKE 'Superseded company batch%'
               OR x.reason LIKE 'Superseded invalid bill allocation batch%'
               OR x.reason LIKE 'Superseded incorrect voucher recordCount%')) LIMIT 1`)
            .get(id);
        if (!batch)
            return false;
        exports.durableOutbox.unblock(id);
        return true;
    },
    insertSyncRun(run) {
        exports.db.prepare(`
      INSERT INTO sync_runs (id, companyId, entityType, startedAt, finishedAt, recordCount, status, error)
      VALUES (@id, @companyId, @entityType, @startedAt, @finishedAt, @recordCount, @status, @error)
    `).run(run);
    },
    updateSyncRun(id, finishedAt, recordCount, status, error) {
        exports.db.prepare(`
      UPDATE sync_runs SET finishedAt = ?, recordCount = ?, status = ?, error = ? WHERE id = ?
    `).run(finishedAt, recordCount, status, error, id);
    },
    setLastFullSync(companyId, startedAt, finishedAt) {
        exports.db.prepare("UPDATE company_settings SET lastFullSyncStartedAt=?, lastFullSyncFinishedAt=? WHERE companyId=?").run(startedAt, finishedAt, companyId);
    },
    getLastSyncRun(companyId, entityType) {
        return exports.db
            .prepare("SELECT * FROM sync_runs WHERE companyId = ? AND entityType = ? ORDER BY startedAt DESC LIMIT 1")
            .get(companyId, entityType);
    },
    getOrStartOutstandingReportSchedule(companyId, entityType, startedAt) {
        exports.db.prepare(`INSERT OR IGNORE INTO outstanding_report_schedule(companyId,entityType,startedAt)
       VALUES(?,?,?)`).run(companyId, entityType, startedAt);
        const row = exports.db
            .prepare("SELECT startedAt FROM outstanding_report_schedule WHERE companyId=? AND entityType=?")
            .get(companyId, entityType);
        return row.startedAt;
    },
    markOutstandingReportAttempt(companyId, entityType, attemptedAt) {
        exports.db.prepare("UPDATE outstanding_report_schedule SET lastAttemptAt=? WHERE companyId=? AND entityType=?").run(attemptedAt, companyId, entityType);
    },
    getOutstandingReportLastAttempt(companyId, entityType) {
        const row = exports.db
            .prepare("SELECT lastAttemptAt FROM outstanding_report_schedule WHERE companyId=? AND entityType=?")
            .get(companyId, entityType);
        return row?.lastAttemptAt ?? null;
    },
    getLastError() {
        const row = exports.db
            .prepare(`SELECT lastError FROM (
      SELECT lastError,createdAt AS at FROM outbox_batch WHERE status='failed' AND lastError IS NOT NULL AND id NOT IN (SELECT batchId FROM outbox_blocks WHERE reason LIKE 'Legacy report retained%' OR reason LIKE 'Superseded legacy stock-item batch%' OR reason LIKE 'Superseded ledger batch%' OR reason LIKE 'Superseded company batch%' OR reason LIKE 'Superseded self-referential BOM batch%' OR reason LIKE 'Superseded invalid bill allocation batch%' OR reason LIKE 'Superseded incorrect voucher recordCount%') AND companyId IN (SELECT companyId FROM company_settings WHERE selected=1 AND syncEnabled=1)
      UNION ALL SELECT error AS lastError,finishedAt AS at FROM sync_runs WHERE status='failed' AND error IS NOT NULL AND companyId IN (SELECT companyId FROM company_settings WHERE selected=1 AND syncEnabled=1)
      ) ORDER BY datetime(at) DESC LIMIT 1`)
            .get();
        return row ? row.lastError : null;
    },
    upsertCompanySetting(companyId, companyName, syncEnabled) {
        exports.db.prepare(`
      INSERT INTO company_settings (companyId, companyName, syncEnabled, updatedAt)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(companyId) DO UPDATE SET syncEnabled = excluded.syncEnabled, updatedAt = datetime('now')
    `).run(companyId, companyName, syncEnabled);
    },
    getCompanySetting(companyId) {
        return exports.db
            .prepare("SELECT * FROM company_settings WHERE companyId = ?")
            .get(companyId);
    },
    getDeviceCredential() {
        return exports.db
            .prepare("SELECT installationId, deviceSecret, cloudBaseUrl, pairedAt FROM device_credential WHERE id = 1")
            .get();
    },
    getBackendSession() {
        return exports.db
            .prepare("SELECT userId, tenantId, email, accessToken, refreshToken, cloudBaseUrl, signedInAt, needsSignIn FROM backend_session WHERE id = 1")
            .get();
    },
    setBackendSession(session) {
        exports.db.prepare(`
      INSERT INTO backend_session (id, userId, tenantId, email, accessToken, refreshToken, cloudBaseUrl, signedInAt)
      VALUES (1, @userId, @tenantId, @email, @accessToken, @refreshToken, @cloudBaseUrl, @signedInAt)
      ON CONFLICT(id) DO UPDATE SET userId = excluded.userId, tenantId = excluded.tenantId,
        email = excluded.email, accessToken = excluded.accessToken, refreshToken = excluded.refreshToken,
        cloudBaseUrl = excluded.cloudBaseUrl, signedInAt = excluded.signedInAt, needsSignIn = 0
    `).run(session);
    },
    isBackendAuthenticated() {
        const session = exports.dbQueries.getBackendSession();
        return !!session && session.needsSignIn !== 1;
    },
    requireBackendSignIn() {
        exports.db.prepare("UPDATE backend_session SET needsSignIn=1 WHERE id=1").run();
    },
    // Keeps the row (tenantId/cloudBaseUrl) so signIn's cross-tenant guard still applies after
    // logout; only the tokens are discarded.
    signOutBackend() {
        exports.db.prepare("UPDATE backend_session SET accessToken='', refreshToken='', needsSignIn=1 WHERE id=1").run();
    },
    selectCompany(companyId, companyName, metadata) {
        exports.db.transaction(() => {
            exports.db.prepare(`INSERT INTO company_settings(companyId,companyName,syncEnabled,selected,updatedAt)
        VALUES(?,?,1,1,datetime('now')) ON CONFLICT(companyId) DO UPDATE SET
        companyName=excluded.companyName,selected=1,syncEnabled=1,updatedAt=datetime('now')`).run(companyId, companyName);
            exports.dbQueries.setCompanyMetadata(companyId, metadata);
            exports.db.prepare("DELETE FROM outbox_blocks WHERE (reason GLOB 'HTTP 401:*' OR reason LIKE 'Sign in%') AND batchId IN (SELECT id FROM outbox_batch WHERE companyId=?)").run(companyId);
            exports.db.prepare("DELETE FROM outbox_blocks WHERE reason='Company removed; retained locally' AND batchId IN (SELECT id FROM outbox_batch WHERE companyId=?)").run(companyId);
        })();
    },
    getConnectorInstallationId() {
        let row = exports.db.prepare("SELECT installationId FROM connector_installation WHERE id=1").get();
        if (!row) {
            row = { installationId: (0, node_crypto_1.randomUUID)() };
            exports.db.prepare("INSERT INTO connector_installation(id,installationId) VALUES(1,?)").run(row.installationId);
        }
        return row.installationId;
    },
    getLicenseCache() {
        return exports.db.prepare("SELECT encrypted FROM connector_license_cache WHERE id=1").get()?.encrypted ?? null;
    },
    getConnectorDeviceSecret() { return exports.db.prepare("SELECT deviceSecret FROM connector_installation WHERE id=1").get()?.deviceSecret ?? null; },
    setConnectorDeviceSecret(encrypted) { exports.dbQueries.getConnectorInstallationId(); exports.db.prepare("UPDATE connector_installation SET deviceSecret=? WHERE id=1").run(encrypted); },
    setLicenseCache(encrypted) {
        if (encrypted === null)
            exports.db.prepare("DELETE FROM connector_license_cache WHERE id=1").run();
        else
            exports.db.prepare("INSERT INTO connector_license_cache(id,encrypted) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET encrypted=excluded.encrypted").run(encrypted);
    },
    setCompanyRegistration(companyId, registrationId) {
        exports.db.transaction(() => {
            const previous = exports.dbQueries.getCompanySetting(companyId)?.companyRegistrationId;
            exports.db.prepare("UPDATE company_settings SET companyRegistrationId=? WHERE companyId=?").run(registrationId, companyId);
            if (previous !== registrationId) {
                // Never attach a new approval to previously fetched payloads. Keep old batches for repair/audit.
                exports.db.prepare(`INSERT OR REPLACE INTO outbox_blocks(batchId,reason)
          SELECT id,'Previous company registration; retained locally' FROM outbox_batch
          WHERE companyId=? AND status!='completed' AND
          CASE WHEN json_valid(payload) THEN coalesce(json_extract(payload,'$.companyRegistrationId'),'') ELSE '' END <> ?`).run(companyId, registrationId);
                exports.db.prepare("UPDATE outbox_fetches SET state='aborted' WHERE companyId=? AND state IN ('fetching','sealed')").run(companyId);
                exports.db.prepare("UPDATE sync_checkpoints SET lastAlterId=0 WHERE companyId=?").run(companyId);
                exports.db.prepare("UPDATE sync_batch_plans SET status='Pending',attempts=0,error=NULL WHERE companyId=? AND status!='Split'").run(companyId);
            }
        })();
    },
    recoverDeferredWork() {
        // Schedule old HTTP validation/transient blocks for one delayed retry; never unblock local
        // corruption, immutable-key conflicts, removed companies or unsupported entity types.
        exports.db.transaction(() => {
            // Existing connector installs may already have reference failures on a 30-minute delay.
            // Clamp only those retry deadlines so newly committed prerequisite masters can unblock them.
            const referenceRetryAt = new Date(Date.now() + 10_000).toISOString();
            exports.db.prepare(`UPDATE outbox_batch SET nextAttemptAt=? WHERE status='failed'
         AND lastError LIKE '%has not synced for this company%'
         AND companyId IN (SELECT companyId FROM company_settings WHERE selected=1 AND syncEnabled=1)
         AND (nextAttemptAt IS NULL OR datetime(nextAttemptAt)>datetime(?))`).run(referenceRetryAt, referenceRetryAt);
            // Do not move an existing retry deadline forward on every sync/timer pass.
            exports.db.prepare(`UPDATE outbox_batch SET nextAttemptAt=? WHERE nextAttemptAt IS NULL AND id IN
        (SELECT x.batchId FROM outbox_blocks x JOIN outbox_batch b ON b.id=x.batchId
         JOIN company_settings c ON c.companyId=b.companyId AND c.selected=1 AND c.syncEnabled=1
         WHERE (x.reason GLOB 'HTTP 400:*' OR x.reason GLOB 'HTTP 422:*'
            OR x.reason GLOB 'HTTP 5[0-9][0-9]:*' OR x.reason GLOB 'HTTP 408:*'
            OR x.reason GLOB 'HTTP 429:*')
           AND b.entityType NOT IN ('outstanding_payable','outstanding_receivable'))`).run(new Date(Date.now() + 30 * 60_000).toISOString());
            exports.db.prepare(`DELETE FROM outbox_blocks WHERE batchId IN
        (SELECT b.id FROM outbox_batch b JOIN company_settings c ON c.companyId=b.companyId
         WHERE c.selected=1 AND c.syncEnabled=1 AND b.nextAttemptAt IS NOT NULL
           AND b.entityType NOT IN ('outstanding_payable','outstanding_receivable'))
         AND (reason GLOB 'HTTP 400:*' OR reason GLOB 'HTTP 422:*' OR reason GLOB 'HTTP 5[0-9][0-9]:*'
           OR reason GLOB 'HTTP 408:*' OR reason GLOB 'HTTP 429:*')`).run();
            exports.db.prepare(`UPDATE sync_batch_plans SET status='Pending',attempts=0,error=NULL
        WHERE status='Failed' AND datetime(COALESCE(completedAt,startedAt,createdAt))<=datetime('now','-30 minutes')
          AND companyId IN (SELECT companyId FROM company_settings WHERE selected=1 AND syncEnabled=1)`).run();
        })();
    },
    hasSyncData() {
        return !!exports.db
            .prepare("SELECT 1 FROM outbox_batch UNION ALL SELECT 1 FROM sync_checkpoints UNION ALL SELECT 1 FROM company_settings WHERE selected=1 LIMIT 1")
            .get();
    },
    setDeviceCredential(installationId, deviceSecret, cloudBaseUrl) {
        exports.db.prepare(`
      INSERT INTO device_credential (id, installationId, deviceSecret, cloudBaseUrl, pairedAt)
      VALUES (1, @installationId, @deviceSecret, @cloudBaseUrl, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET installationId = excluded.installationId, deviceSecret = excluded.deviceSecret, cloudBaseUrl = excluded.cloudBaseUrl, pairedAt = excluded.pairedAt
    `).run({ installationId, deviceSecret, cloudBaseUrl });
    },
    getAppSettings() {
        const row = exports.db
            .prepare(`
      SELECT tallyHost, tallyPort, syncIntervalMinutes, launchAtLogin,
             proxyEnabled, proxyUrl, tallyRetryAttempts, notificationsEnabled, masterChunkSize,
             deletedVoucherSyncEnabled, deletedVoucherSyncFrequencyMinutes, outstandingReportSyncEnabled, outstandingReportSyncFrequencyMinutes
      FROM app_settings WHERE id = 1
    `)
            .get();
        if (row)
            return row;
        // First read: seed the row with defaults so every later read/write has a row to work with.
        exports.db.prepare(`
      INSERT OR IGNORE INTO app_settings (
        id, tallyHost, tallyPort, syncIntervalMinutes, launchAtLogin,
        proxyEnabled, proxyUrl, tallyRetryAttempts, notificationsEnabled, masterChunkSize,
        deletedVoucherSyncEnabled, deletedVoucherSyncFrequencyMinutes, outstandingReportSyncEnabled, outstandingReportSyncFrequencyMinutes
      )
      VALUES (
        1, @tallyHost, @tallyPort, @syncIntervalMinutes, @launchAtLogin,
        @proxyEnabled, @proxyUrl, @tallyRetryAttempts, @notificationsEnabled, @masterChunkSize,
        @deletedVoucherSyncEnabled, @deletedVoucherSyncFrequencyMinutes, @outstandingReportSyncEnabled, @outstandingReportSyncFrequencyMinutes
      )
    `).run(DEFAULT_APP_SETTINGS);
        return DEFAULT_APP_SETTINGS;
    },
    setAppSettings(settings) {
        exports.db.prepare(`
      INSERT INTO app_settings (
        id, tallyHost, tallyPort, syncIntervalMinutes, launchAtLogin,
        proxyEnabled, proxyUrl, tallyRetryAttempts, notificationsEnabled, masterChunkSize,
        deletedVoucherSyncEnabled, deletedVoucherSyncFrequencyMinutes, outstandingReportSyncEnabled, outstandingReportSyncFrequencyMinutes
      )
      VALUES (
        1, @tallyHost, @tallyPort, @syncIntervalMinutes, @launchAtLogin,
        @proxyEnabled, @proxyUrl, @tallyRetryAttempts, @notificationsEnabled, @masterChunkSize,
        @deletedVoucherSyncEnabled, @deletedVoucherSyncFrequencyMinutes, @outstandingReportSyncEnabled, @outstandingReportSyncFrequencyMinutes
      )
      ON CONFLICT(id) DO UPDATE SET
        tallyHost = excluded.tallyHost,
        tallyPort = excluded.tallyPort,
        syncIntervalMinutes = excluded.syncIntervalMinutes,
        launchAtLogin = excluded.launchAtLogin,
        proxyEnabled = excluded.proxyEnabled,
        proxyUrl = excluded.proxyUrl,
        tallyRetryAttempts = excluded.tallyRetryAttempts,
        notificationsEnabled = excluded.notificationsEnabled,
        masterChunkSize = excluded.masterChunkSize,
        deletedVoucherSyncEnabled = excluded.deletedVoucherSyncEnabled,
        deletedVoucherSyncFrequencyMinutes = excluded.deletedVoucherSyncFrequencyMinutes,
        outstandingReportSyncEnabled = excluded.outstandingReportSyncEnabled,
        outstandingReportSyncFrequencyMinutes = excluded.outstandingReportSyncFrequencyMinutes
    `).run(settings);
    },
    // Persist only explicit selections in My Companies, even while Tally is offline.
    getAllCompanySettings() {
        return exports.db
            .prepare("SELECT * FROM company_settings WHERE selected=1 ORDER BY companyName")
            .all();
    },
    deleteCompanySetting(companyId) {
        exports.db.transaction(() => {
            exports.db.prepare("INSERT OR IGNORE INTO outbox_blocks SELECT id, 'Company removed; retained locally' FROM outbox_batch WHERE companyId=? AND status!='completed'").run(companyId);
            exports.db.prepare("DELETE FROM company_settings WHERE companyId = ?").run(companyId);
        })();
    },
    // --- sync_batch_plans (persisted resumable voucher backfill plan; see voucher-batch-planner.ts) ---
    insertBatchPlans(rows) {
        const stmt = exports.db.prepare(`
      INSERT INTO sync_batch_plans
        (companyId, voucherType, fromDate, toDate, status, splitDepth, parentBatchId, estimatedVoucherCount)
      VALUES (@companyId, @voucherType, @fromDate, @toDate, 'Pending', @splitDepth, @parentBatchId, @estimatedVoucherCount)
    `);
        const insertMany = exports.db.transaction((items) => {
            for (const item of items) {
                stmt.run({
                    companyId: item.companyId,
                    voucherType: item.voucherType,
                    fromDate: item.fromDate,
                    toDate: item.toDate,
                    splitDepth: item.splitDepth ?? 0,
                    parentBatchId: item.parentBatchId ?? null,
                    estimatedVoucherCount: item.estimatedVoucherCount,
                });
            }
        });
        insertMany(rows);
    },
    hasAnyBatchPlan(companyId, voucherType) {
        const row = exports.db
            .prepare("SELECT id FROM sync_batch_plans WHERE companyId = ? AND voucherType = ? LIMIT 1")
            .get(companyId, voucherType);
        return !!row;
    },
    hasUnfinishedBatchPlanWork(companyId, voucherType) {
        const row = exports.db
            .prepare(`SELECT id FROM sync_batch_plans
         WHERE companyId = ? AND voucherType = ? AND status IN ('Pending', 'Running') LIMIT 1`)
            .get(companyId, voucherType);
        return !!row;
    },
    resetStaleRunningBatchPlansToPending(companyId, voucherType) {
        exports.db.prepare(`UPDATE sync_batch_plans SET status = 'Pending'
       WHERE companyId = ? AND voucherType = ? AND status = 'Running'`).run(companyId, voucherType);
    },
    getNextRunnableBatchPlan(companyId, voucherType) {
        return exports.db
            .prepare(`SELECT * FROM sync_batch_plans
         WHERE companyId = ? AND voucherType = ? AND status = 'Pending'
         ORDER BY fromDate ASC LIMIT 1`)
            .get(companyId, voucherType);
    },
    getBatchPlanById(id) {
        return exports.db.prepare("SELECT * FROM sync_batch_plans WHERE id = ?").get(id);
    },
    markBatchPlanRunning(id) {
        exports.db.prepare(`UPDATE sync_batch_plans SET status = 'Running', startedAt = datetime('now') WHERE id = ?`).run(id);
    },
    markBatchPlanCompleted(id, actualVoucherCount) {
        exports.db.prepare(`UPDATE sync_batch_plans SET status = 'Completed', actualVoucherCount = ?, completedAt = datetime('now') WHERE id = ?`).run(actualVoucherCount, id);
    },
    markBatchPlanRetried(id, attempts, error) {
        exports.db.prepare(`UPDATE sync_batch_plans SET attempts = ?, status = 'Pending', error = ? WHERE id = ?`).run(attempts, error, id);
    },
    markBatchPlanSplit(id, attempts, error, children) {
        const tx = exports.db.transaction(() => {
            exports.db.prepare(`UPDATE sync_batch_plans SET attempts = ?, status = 'Split', error = ? WHERE id = ?`).run(attempts, error, id);
            exports.dbQueries.insertBatchPlans(children);
        });
        tx();
    },
    markBatchPlanFailed(id, attempts, error) {
        exports.db.prepare(`UPDATE sync_batch_plans SET attempts = ?, status = 'Failed', error = ?, completedAt=datetime('now') WHERE id = ?`).run(attempts, error, id);
    },
    getBatchPlanProgressSummary(companyId, voucherType) {
        const totalRow = exports.db
            .prepare(`SELECT COUNT(*) as cnt FROM sync_batch_plans
         WHERE companyId = ? AND voucherType = ? AND status != 'Split'`)
            .get(companyId, voucherType);
        const completedRow = exports.db
            .prepare(`SELECT COUNT(*) as cnt FROM sync_batch_plans
         WHERE companyId = ? AND voucherType = ? AND status = 'Completed'`)
            .get(companyId, voucherType);
        const remainingRow = exports.db
            .prepare(`SELECT COALESCE(SUM(estimatedVoucherCount), 0) as sum FROM sync_batch_plans
         WHERE companyId = ? AND voucherType = ? AND status IN ('Pending', 'Running')`)
            .get(companyId, voucherType);
        return {
            completedBatches: completedRow.cnt,
            totalBatches: totalRow.cnt,
            remainingEstimatedVouchers: remainingRow.sum,
        };
    },
};
