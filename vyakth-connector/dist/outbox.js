"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurableOutbox = exports.payloadHash = void 0;
const node_crypto_1 = require("node:crypto");
const payloadHash = (payload) => (0, node_crypto_1.createHash)("sha256").update(payload).digest("hex");
exports.payloadHash = payloadHash;
/** A sealed fetch is the durability boundary. Unfinished fetches never upload or move a cursor. */
class DurableOutbox {
    db;
    constructor(db) {
        this.db = db;
    }
    init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS outbox_fetches (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
        companyId TEXT NOT NULL, entityType TEXT NOT NULL, cursor INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL DEFAULT 'fetching', backfillType TEXT
      );
      CREATE TABLE IF NOT EXISTS outbox_fetch_batches (
        batchId TEXT PRIMARY KEY, fetchId TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS outbox_fetch_batches_fetch ON outbox_fetch_batches(fetchId);
      CREATE TABLE IF NOT EXISTS outbox_blocks (batchId TEXT PRIMARY KEY, reason TEXT NOT NULL);
      UPDATE outbox_fetches SET state = 'aborted' WHERE state = 'fetching';
      UPDATE outbox_batch SET status = 'pending' WHERE status = 'uploading';
    `);
        // Preserve old payloads. Only a recorded, completed fetch can establish a legacy cursor.
        const legacy = this.db
            .prepare(`SELECT b.id FROM outbox_batch b
      LEFT JOIN outbox_fetch_batches l ON l.batchId=b.id WHERE l.batchId IS NULL`)
            .all();
        this.db.transaction(() => {
            for (const row of legacy) {
                const batch = this.db
                    .prepare("SELECT * FROM outbox_batch WHERE id=?")
                    .get(row.id);
                try {
                    const envelope = JSON.parse(batch.payload);
                    const run = this.db
                        .prepare("SELECT status FROM sync_runs WHERE id=?")
                        .get(envelope.syncRunId);
                    const fetchId = envelope.syncRunId || batch.id;
                    const voucherTypes = {
                        sales_voucher: "Sales",
                        voucher_purchase: "Purchase",
                        voucher_credit_note: "Credit Note",
                        voucher_debit_note: "Debit Note",
                        voucher_payment: "Payment",
                        voucher_receipt: "Receipt",
                        voucher_contra: "Contra",
                        voucher_journal: "Journal",
                        voucher_stock_journal: "Stock Journal",
                        voucher_physical_stock: "Physical Stock",
                        voucher_delivery_note: "Delivery Note",
                        voucher_receipt_note: "Receipt Note",
                        voucher_sales_order: "Sales Order",
                        voucher_purchase_order: "Purchase Order",
                    };
                    this.db
                        .prepare(`INSERT OR IGNORE INTO outbox_fetches(id,companyId,entityType,state)
            VALUES(?,?,?,?)`)
                        .run(fetchId, batch.companyId, batch.entityType, run?.status === "completed" ? "sealed" : "aborted");
                    this.db
                        .prepare("INSERT INTO outbox_fetch_batches VALUES(?,?)")
                        .run(batch.id, fetchId);
                    if (voucherTypes[batch.entityType])
                        this.db
                            .prepare("UPDATE outbox_fetches SET backfillType=? WHERE id=?")
                            .run(voucherTypes[batch.entityType], fetchId);
                    this.db
                        .prepare("UPDATE outbox_fetches SET cursor=MAX(cursor,?) WHERE id=?")
                        .run(envelope.checkpoint?.alterationId ?? 0, fetchId);
                    this.db
                        .prepare("UPDATE outbox_batch SET payloadHash=? WHERE id=?")
                        .run((0, exports.payloadHash)(batch.payload), batch.id);
                }
                catch {
                    this.block(batch.id, "Invalid legacy payload; retained for repair");
                }
            }
        })();
    }
    /**
     * Older connector versions bundled BOMs into each stock-item chunk. A BOM can
     * reference an item in a later chunk, so split a failed immutable payload into
     * fresh stock-item and deferred-BOM batches while retaining the original for audit.
     */
    recoverLegacyStockItemBomBatches() {
        const candidates = this.db
            .prepare(`SELECT b.*, l.fetchId FROM outbox_batch b
         JOIN outbox_fetch_batches l ON l.batchId=b.id
         WHERE b.entityType='stock_item' AND b.status IN ('pending','failed')
           AND l.fetchId IN (
             SELECT failedLink.fetchId FROM outbox_batch failed
             JOIN outbox_fetch_batches failedLink ON failedLink.batchId=failed.id
             WHERE failed.entityType='stock_item' AND failed.status='failed'
               AND failed.lastError LIKE '%has not synced for this company%'
           )
           AND ((b.status='failed' AND b.lastError LIKE '%has not synced for this company%')
             OR (b.status='pending' AND b.attemptCount=0 AND b.lastError IS NULL))
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            if (!Array.isArray(envelope.records))
                continue;
            const stockItems = envelope.records.map(({ boms: _boms, ...record }) => record);
            const bomRecords = envelope.records
                .filter((record) => Array.isArray(record.boms) && record.boms.length > 0)
                .map(({ name, masterId, alterId, boms }) => ({
                name,
                masterId,
                alterId,
                boms,
            }));
            if (!bomRecords.length)
                continue;
            this.db.transaction(() => {
                const insertReplacementBatches = (entityType, records) => {
                    for (let offset = 0; offset < records.length;) {
                        const chunk = [];
                        let bytes = 0;
                        while (offset < records.length && chunk.length < 1000) {
                            const record = records[offset];
                            const size = Buffer.byteLength(JSON.stringify(record));
                            if (size > 1024 * 1024)
                                throw new Error('Legacy sync record exceeds the 1 MiB batch limit');
                            if (chunk.length && bytes + size > 1024 * 1024)
                                break;
                            chunk.push(record);
                            bytes += size;
                            offset++;
                        }
                        const batchId = (0, node_crypto_1.randomUUID)();
                        const payload = JSON.stringify({
                            ...envelope,
                            batchId,
                            entityType,
                            recordCount: chunk.length,
                            records: chunk,
                        });
                        if (Buffer.byteLength(payload) > 1_500_000)
                            throw new Error('Replacement sync batch exceeds the 1.5 MB limit');
                        this.db
                            .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
                 attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
                 VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                            .run(batchId, batch.companyId, entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                        this.db
                            .prepare('INSERT INTO outbox_fetch_batches(batchId,fetchId) VALUES(?,?)')
                            .run(batchId, batch.fetchId);
                    }
                };
                insertReplacementBatches('stock_item', stockItems);
                insertReplacementBatches('stock_item_bom', bomRecords);
                this.db
                    .prepare('INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)')
                    .run(batch.id, 'Superseded legacy stock-item batch after BOM split; retained for audit');
                this.db
                    .prepare('DELETE FROM outbox_fetch_batches WHERE batchId=?')
                    .run(batch.id);
            })();
            recovered++;
        }
        return recovered;
    }
    /** Omit unusable bill-reference rows from rejected vouchers; retain the original batch. */
    recoverInvalidVoucherBillAllocations() {
        const candidates = this.db
            .prepare(`SELECT b.*, l.fetchId FROM outbox_batch b
         JOIN outbox_fetch_batches l ON l.batchId=b.id
         WHERE (b.entityType LIKE 'voucher_%' OR b.entityType='sales_voucher')
           AND b.status IN ('failed','pending')
           AND b.lastError LIKE '%billName: Invalid input: expected string, received null%'
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            if (!Array.isArray(envelope.records))
                continue;
            let omitted = 0;
            const repairVoucher = (voucher) => {
                const repaired = { ...voucher };
                if (Array.isArray(voucher.ledgerEntries))
                    repaired.ledgerEntries = voucher.ledgerEntries.map((entry) => {
                        if (!Array.isArray(entry.billAllocations))
                            return entry;
                        const billAllocations = entry.billAllocations.filter((bill) => {
                            const valid = typeof bill.billName === "string" &&
                                bill.billName.trim() !== "";
                            if (!valid)
                                omitted++;
                            return valid;
                        });
                        return { ...entry, billAllocations };
                    });
                // Current voucher fetches group vouchers beneath a financial-year record;
                // legacy batches may also store one voucher directly in each record.
                if (Array.isArray(voucher.vouchers))
                    repaired.vouchers = voucher.vouchers.map(repairVoucher);
                return repaired;
            };
            const records = envelope.records.map(repairVoucher);
            if (!omitted) {
                const reason = "Superseded invalid bill allocation batch; fetch aborted for corrected voucher replay; retained for audit";
                this.db.transaction(() => {
                    this.db
                        .prepare("UPDATE outbox_fetches SET state='aborted' WHERE id=?")
                        .run(batch.fetchId);
                    this.db
                        .prepare("INSERT OR IGNORE INTO outbox_blocks(batchId,reason) SELECT batchId,? FROM outbox_fetch_batches WHERE fetchId=?")
                        .run(reason, batch.fetchId);
                    this.db
                        .prepare("UPDATE outbox_batch SET status='failed',lastError=COALESCE(lastError,?) WHERE id IN (SELECT batchId FROM outbox_fetch_batches WHERE fetchId=?) AND status!='completed'")
                        .run(reason, batch.fetchId);
                })();
                console.error(`[Sync] Superseded voucher fetch ${batch.fetchId}; error named a null billName but none was repairable in the saved payload. A fresh voucher fetch is required; original batches retained for audit`);
                continue;
            }
            const batchId = (0, node_crypto_1.randomUUID)();
            const recordCount = records.reduce((count, record) => count + (Array.isArray(record.vouchers) ? record.vouchers.length : 1), 0);
            const payload = JSON.stringify({ ...envelope, batchId, recordCount, records });
            if (Buffer.byteLength(payload) > 1_500_000)
                continue;
            this.db.transaction(() => {
                this.db
                    .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
             attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
             VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                    .run(batchId, batch.companyId, batch.entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                this.db
                    .prepare("INSERT INTO outbox_fetch_batches(batchId,fetchId) VALUES(?,?)")
                    .run(batchId, batch.fetchId);
                this.db
                    .prepare("INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)")
                    .run(batch.id, "Superseded invalid bill allocation batch after omitting unnamed rows; retained for audit");
                this.db
                    .prepare("DELETE FROM outbox_fetch_batches WHERE batchId=?")
                    .run(batch.id);
            })();
            console.warn(`[Sync] Replaced failed ${batch.entityType} batch ${batch.id}; omitted ${omitted} bill allocation(s) without a bill name, original retained for audit`);
            recovered++;
        }
        return recovered;
    }
    /** Recount nested voucher groups before retrying batches created by older recovery code. */
    recoverInvalidVoucherRecordCounts() {
        const candidates = this.db
            .prepare(`SELECT b.*, l.fetchId FROM outbox_batch b
         JOIN outbox_fetch_batches l ON l.batchId=b.id
         WHERE (b.entityType LIKE 'voucher_%' OR b.entityType='sales_voucher')
           AND b.status IN ('failed','pending')
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            if (!Array.isArray(envelope.records))
                continue;
            const recordCount = envelope.records.reduce((count, record) => count + (Array.isArray(record.vouchers) ? record.vouchers.length : 1), 0);
            if (recordCount === envelope.recordCount)
                continue;
            const batchId = (0, node_crypto_1.randomUUID)();
            const payload = JSON.stringify({ ...envelope, batchId, recordCount });
            if (Buffer.byteLength(payload) > 1_500_000)
                continue;
            this.db.transaction(() => {
                this.db
                    .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
             attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
             VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                    .run(batchId, batch.companyId, batch.entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                this.db
                    .prepare('INSERT INTO outbox_fetch_batches(batchId,fetchId) VALUES(?,?)')
                    .run(batchId, batch.fetchId);
                this.db
                    .prepare('INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)')
                    .run(batch.id, 'Superseded incorrect voucher recordCount; retained for audit');
                this.db
                    .prepare('DELETE FROM outbox_fetch_batches WHERE batchId=?')
                    .run(batch.id);
            })();
            console.warn(`[Sync] Replaced voucher batch ${batch.id} with ${batchId} (recordCount ${recordCount}); original retained for audit`);
            recovered++;
        }
        return recovered;
    }
    /** Remove impossible self-component links from a rejected BOM batch; retain its original. */
    recoverSelfReferentialBomBatches() {
        const candidates = this.db
            .prepare(`SELECT b.*, l.fetchId FROM outbox_batch b
         JOIN outbox_fetch_batches l ON l.batchId=b.id
         WHERE b.entityType='stock_item_bom' AND b.status='failed'
           AND b.lastError LIKE '%A stock item cannot be its own BOM component%'
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            if (!Array.isArray(envelope.records))
                continue;
            let omittedComponents = 0;
            let omittedBoms = 0;
            const records = envelope.records
                .map((record) => {
                const parentName = String(record.name ?? "").trim().toLocaleLowerCase();
                const parentMasterId = Number(record.masterId);
                const boms = (Array.isArray(record.boms) ? record.boms : []).flatMap((bom) => {
                    const components = Array.isArray(bom.components)
                        ? bom.components
                        : [];
                    const valid = components.filter((component) => {
                        const componentName = String(component.stockItemName ?? "").trim().toLocaleLowerCase();
                        const componentMasterId = Number(component.stockItemMasterId);
                        const selfReference = (parentName !== "" && componentName === parentName) ||
                            (Number.isSafeInteger(parentMasterId) &&
                                Number.isSafeInteger(componentMasterId) &&
                                parentMasterId === componentMasterId);
                        if (selfReference)
                            omittedComponents++;
                        return !selfReference;
                    });
                    if (components.length > 0 && valid.length === 0) {
                        omittedBoms++;
                        return [];
                    }
                    return [{ ...bom, components: valid }];
                });
                return { ...record, boms };
            })
                .filter((record) => record.boms.length > 0);
            if (!omittedComponents) {
                // The backend resolved a self-reference that could not be proven from legacy names.
                // Stop retrying this payload and replay the fetch from its prior checkpoint with IDs.
                const reason = "Superseded self-referential BOM batch awaiting component identity repair; fetch aborted for fresh Tally replay; retained for audit";
                this.db.transaction(() => {
                    this.db
                        .prepare("UPDATE outbox_fetches SET state='aborted' WHERE id=?")
                        .run(batch.fetchId);
                    this.db
                        .prepare("INSERT OR IGNORE INTO outbox_blocks(batchId,reason) SELECT batchId,? FROM outbox_fetch_batches WHERE fetchId=?")
                        .run(reason, batch.fetchId);
                    this.db
                        .prepare("UPDATE outbox_batch SET status='failed',lastError=COALESCE(lastError,?) WHERE id IN (SELECT batchId FROM outbox_fetch_batches WHERE fetchId=?) AND status!='completed'")
                        .run(reason, batch.fetchId);
                })();
                console.error(`[Sync] Superseded BOM fetch ${batch.fetchId}; backend found a self-reference but this saved payload has no matching component identity to repair. A fresh Tally fetch with component IDs is required; original batches retained for audit`);
                continue;
            }
            const batchId = (0, node_crypto_1.randomUUID)();
            const payload = JSON.stringify({
                ...envelope,
                batchId,
                recordCount: records.length,
                records,
            });
            if (Buffer.byteLength(payload) > 1_500_000)
                continue;
            this.db.transaction(() => {
                this.db
                    .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
             attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
             VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                    .run(batchId, batch.companyId, batch.entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                this.db
                    .prepare("INSERT INTO outbox_fetch_batches(batchId,fetchId) VALUES(?,?)")
                    .run(batchId, batch.fetchId);
                this.db
                    .prepare("INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)")
                    .run(batch.id, "Superseded self-referential BOM batch after removing invalid components; retained for audit");
                this.db
                    .prepare("DELETE FROM outbox_fetch_batches WHERE batchId=?")
                    .run(batch.id);
            })();
            console.warn(`[Sync] Replaced failed BOM batch ${batch.id}; removed ${omittedComponents} self-reference(s) and ${omittedBoms} empty BOM(s), original retained for audit`);
            recovered++;
        }
        return recovered;
    }
    /** Replace failed legacy ledger payloads after repairing optional fields or contact ordering. */
    recoverInvalidCompanyBatches() {
        const candidates = this.db
            .prepare(`SELECT b.* FROM outbox_batch b
         WHERE b.entityType='company' AND b.status IN ('pending','failed')
           AND b.lastError LIKE '%details.contacts.%methods.%Duplicate detail selection%'
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            const contacts = envelope.company?.details?.contacts;
            if (!Array.isArray(contacts))
                continue;
            let changed = false;
            const repairedContacts = contacts.map((contact) => {
                if (!Array.isArray(contact.methods))
                    return contact;
                return {
                    ...contact,
                    methods: contact.methods.map((method, methodOrder) => {
                        if (method.methodOrder !== methodOrder)
                            changed = true;
                        return { ...method, methodOrder };
                    }),
                };
            });
            if (!changed)
                continue;
            const batchId = (0, node_crypto_1.randomUUID)();
            const payload = JSON.stringify({
                ...envelope,
                batchId,
                syncRunId: (0, node_crypto_1.randomUUID)(),
                company: {
                    ...envelope.company,
                    details: { ...envelope.company.details, contacts: repairedContacts },
                },
            });
            if (Buffer.byteLength(payload) > 1_500_000)
                continue;
            this.db.transaction(() => {
                this.db
                    .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
             attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
             VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                    .run(batchId, batch.companyId, batch.entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                this.db
                    .prepare('INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)')
                    .run(batch.id, 'Superseded company batch after repairing duplicate contact method ordering; retained for audit');
            })();
            console.warn(`[Sync] Replaced failed company batch ${batch.id} with ordered contact methods; original retained for audit`);
            recovered++;
        }
        return recovered;
    }
    /** Replace failed legacy ledger payloads after repairing optional fields or contact ordering. */
    recoverInvalidLedgerBatches() {
        const candidates = this.db
            .prepare(`SELECT b.*, l.fetchId FROM outbox_batch b
         JOIN outbox_fetch_batches l ON l.batchId=b.id
         WHERE b.entityType='ledger' AND b.status IN ('pending','failed')
           AND l.fetchId IN (
             SELECT failedLink.fetchId FROM outbox_batch failed
             JOIN outbox_fetch_batches failedLink ON failedLink.batchId=failed.id
             WHERE failed.entityType='ledger' AND failed.status IN ('pending','failed')
               AND (failed.lastError LIKE '%panNumber: Too big%'
                 OR failed.lastError LIKE '%gstin: Too big%'
                 OR failed.lastError LIKE '%creditLimit: Credit limit must be nonnegative%'
                 OR (failed.lastError LIKE '%details.contacts.%methods.%'
                   AND failed.lastError LIKE '%Duplicate detail selection%'))
           )
           AND (
             (b.lastError LIKE '%panNumber: Too big%'
               OR b.lastError LIKE '%gstin: Too big%'
               OR b.lastError LIKE '%creditLimit: Credit limit must be nonnegative%'
               OR (b.lastError LIKE '%details.contacts.%methods.%'
                 AND b.lastError LIKE '%Duplicate detail selection%'))
             OR (b.status='pending' AND b.attemptCount=0 AND b.lastError IS NULL
               AND EXISTS (
                 SELECT 1 FROM outbox_batch failed
                 JOIN outbox_fetch_batches failedLink ON failedLink.batchId=failed.id
                 WHERE failedLink.fetchId=l.fetchId AND failed.entityType='ledger'
                   AND (failed.lastError LIKE '%panNumber: Too big%'
                     OR failed.lastError LIKE '%gstin: Too big%'
                     OR failed.lastError LIKE '%creditLimit: Credit limit must be nonnegative%')
               ))
           )
           AND NOT EXISTS (SELECT 1 FROM outbox_blocks x WHERE x.batchId=b.id)`)
            .all();
        let recovered = 0;
        for (const batch of candidates) {
            let envelope;
            try {
                envelope = JSON.parse(batch.payload);
            }
            catch {
                continue;
            }
            if (!Array.isArray(envelope.records))
                continue;
            let omitted = 0;
            const repairContactOrder = /details\.contacts\..*methods\..*Duplicate detail selection/.test(batch.lastError ?? '');
            const repairCreditLimit = /creditLimit: Credit limit must be nonnegative/.test(batch.lastError ?? '');
            const records = envelope.records.map((record) => {
                const cleaned = { ...record };
                if (typeof cleaned.panNumber === 'string' && cleaned.panNumber.trim().length > 10) {
                    cleaned.panNumber = null;
                    omitted++;
                }
                if (typeof cleaned.gstin === 'string' && cleaned.gstin.trim().length > 15) {
                    cleaned.gstin = null;
                    omitted++;
                }
                if (cleaned.creditLimit != null && Number(cleaned.creditLimit) < 0) {
                    cleaned.creditLimit = null;
                    omitted++;
                }
                return cleaned;
            });
            if (!omitted && !repairContactOrder)
                continue;
            const batchId = (0, node_crypto_1.randomUUID)();
            const payload = JSON.stringify({ ...envelope, batchId, records });
            if (Buffer.byteLength(payload) > 1_500_000)
                continue;
            this.db.transaction(() => {
                this.db
                    .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
             attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt)
             VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                    .run(batchId, batch.companyId, batch.entityType, payload, (0, exports.payloadHash)(payload), new Date().toISOString());
                this.db
                    .prepare('INSERT INTO outbox_fetch_batches(batchId,fetchId) VALUES(?,?)')
                    .run(batchId, batch.fetchId);
                const reason = omitted
                    ? 'Superseded ledger batch after repairing invalid optional ledger values; retained for audit'
                    : 'Superseded ledger batch after repairing duplicate contact method selection; retained for audit';
                this.db
                    .prepare('INSERT OR REPLACE INTO outbox_blocks(batchId,reason) VALUES(?,?)')
                    .run(batch.id, reason);
                this.db
                    .prepare('DELETE FROM outbox_fetch_batches WHERE batchId=?')
                    .run(batch.id);
            })();
            console.warn(`[Sync] Replaced failed ledger batch ${batch.id}; repaired ${omitted} invalid optional value(s)${repairCreditLimit ? ', including negative credit limit' : ''}, original retained for audit`);
            recovered++;
        }
        return recovered;
    }
    begin(id, companyId, entityType, backfillType = null) {
        this.db
            .prepare("INSERT INTO outbox_fetches(id,companyId,entityType,backfillType) VALUES(?,?,?,?)")
            .run(id, companyId, entityType, backfillType);
    }
    append(fetchId, batch) {
        this.db.transaction(() => {
            const fetch = this.db
                .prepare("SELECT state FROM outbox_fetches WHERE id=?")
                .get(fetchId);
            if (fetch?.state !== "fetching")
                throw new Error("Cannot append to a closed fetch");
            this.db
                .prepare(`INSERT INTO outbox_batch(id,companyId,entityType,payload,payloadHash,createdAt,
        attemptCount,nextAttemptAt,status,lastError,cloudAcknowledgedAt) VALUES(?,?,?,?,?,?,0,NULL,'pending',NULL,NULL)`)
                .run(batch.id, batch.companyId, batch.entityType, batch.payload, (0, exports.payloadHash)(batch.payload), batch.createdAt);
            this.db
                .prepare("INSERT INTO outbox_fetch_batches VALUES(?,?)")
                .run(batch.id, fetchId);
        })();
    }
    seal(id, cursor) {
        if (!Number.isSafeInteger(cursor) || cursor < 0)
            throw new Error("Invalid fetch checkpoint");
        this.db.transaction(() => {
            const fetch = this.db
                .prepare("SELECT state FROM outbox_fetches WHERE id=?")
                .get(id);
            if (fetch?.state !== "fetching")
                throw new Error("Cannot seal a closed fetch");
            const ids = this.db
                .prepare("SELECT batchId FROM outbox_fetch_batches WHERE fetchId=?")
                .all(id);
            for (const row of ids) {
                const batch = this.db
                    .prepare("SELECT payload FROM outbox_batch WHERE id=?")
                    .get(row.batchId);
                const envelope = JSON.parse(batch.payload);
                envelope.checkpoint = { creationId: 0, alterationId: cursor };
                const payload = JSON.stringify(envelope);
                this.db
                    .prepare("UPDATE outbox_batch SET payload=?,payloadHash=? WHERE id=?")
                    .run(payload, (0, exports.payloadHash)(payload), row.batchId);
            }
            this.db
                .prepare("UPDATE outbox_fetches SET state='sealed',cursor=? WHERE id=? AND state='fetching'")
                .run(cursor, id);
        })();
    }
    abort(id) {
        this.db
            .prepare("UPDATE outbox_fetches SET state='aborted' WHERE id=? AND state='fetching'")
            .run(id);
    }
    hasPending(companyId, entityType) {
        return !!this.db
            .prepare(`SELECT 1 FROM outbox_fetches f JOIN outbox_fetch_batches l ON l.fetchId=f.id
      JOIN outbox_batch b ON b.id=l.batchId WHERE f.companyId=? AND f.entityType=?
      AND f.state='sealed' AND b.status!='completed' LIMIT 1`)
            .get(companyId, entityType);
    }
    block(batchId, reason) {
        this.db
            .prepare("INSERT OR REPLACE INTO outbox_blocks VALUES(?,?)")
            .run(batchId, reason);
    }
    unblock(batchId) {
        this.db.prepare("DELETE FROM outbox_blocks WHERE batchId=?").run(batchId);
        this.db
            .prepare("UPDATE outbox_batch SET status='pending',nextAttemptAt=NULL WHERE id=? AND status!='completed'")
            .run(batchId);
    }
    acknowledge(batch) {
        this.db.transaction(() => {
            this.db
                .prepare("UPDATE outbox_batch SET status='completed',cloudAcknowledgedAt=?,lastError=NULL,nextAttemptAt=NULL,attemptCount=attemptCount+1 WHERE id=?")
                .run(new Date().toISOString(), batch.id);
            this.advance(batch.companyId, batch.entityType === "stock_item_bom" ? "stock_item" : batch.entityType);
        })();
    }
    advance(companyId, entityType) {
        const fetches = this.db
            .prepare(`SELECT * FROM outbox_fetches WHERE companyId=? AND entityType=?
      AND state IN ('fetching','sealed') ORDER BY sequence`)
            .all(companyId, entityType);
        for (const fetch of fetches) {
            if (fetch.state !== "sealed")
                break;
            if (fetch.backfillType &&
                this.db
                    .prepare(`SELECT 1 FROM sync_batch_plans WHERE companyId=? AND voucherType=?
        AND status NOT IN ('Completed','Split') LIMIT 1`)
                    .get(companyId, fetch.backfillType))
                break;
            if (this.db
                .prepare(`SELECT 1 FROM outbox_fetch_batches l JOIN outbox_batch b ON b.id=l.batchId
        WHERE l.fetchId=? AND b.status!='completed' LIMIT 1`)
                .get(fetch.id))
                break;
            if (fetch.cursor > 0)
                this.db
                    .prepare(`INSERT INTO sync_checkpoints VALUES(?,?,?,?)
        ON CONFLICT(companyId,entityType) DO UPDATE SET lastAlterId=MAX(lastAlterId,excluded.lastAlterId),updatedAt=excluded.updatedAt`)
                    .run(companyId, entityType, fetch.cursor, new Date().toISOString());
            this.db
                .prepare("UPDATE outbox_fetches SET state='acknowledged' WHERE id=?")
                .run(fetch.id);
        }
    }
}
exports.DurableOutbox = DurableOutbox;
