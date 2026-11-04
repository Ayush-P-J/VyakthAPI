"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDeletedVoucherProbe = runDeletedVoucherProbe;
const crypto_1 = require("crypto");
const cloud_1 = require("./cloud");
const sync_scheduler_1 = require("./sync-scheduler");
const client_js_1 = require("./tally-core/xml/client.js");
const voucher_masterid_builder_js_1 = require("./tally-core/xml/builders/voucher-masterid.builder.js");
const masterid_stream_parser_js_1 = require("./tally-core/xml/masterid-stream-parser.js");
const voucher_date_count_builder_js_1 = require("./tally-core/xml/builders/voucher-date-count.builder.js");
const db_js_1 = require("./db.js");
const sync_js_1 = require("./sync.js");
/**
 * Deleted-voucher detection (Settings → Sync → "Sync Deleted Vouchers", matching BA Mobile
 * Connector's own feature by the same name). Tally has no API that reports deletions directly —
 * confirmed against Tally's own documentation: even TallyPrime's first-party "Mark Modified
 * Vouchers" feature explicitly excludes deleted vouchers from its list. The only way to detect
 * one is a full snapshot diff: ask Tally for every voucher MasterId that currently exists (per
 * company + voucher type, full lifetime — see voucher-masterid.builder.ts for why this isn't
 * date-windowed), and let h7004 soft-delete anything it has stored that's missing from that list
 * (RecordPromoterDrizzleRepository.applyVoucherDeletionSnapshot) — never hard-deleted, since a
 * "missing" voucher is not distinguishable from a probe glitch with full confidence.
 *
 * Deliberately its own timer (main.ts), separate from the main auto-sync interval — a full
 * MasterId-only probe across every voucher type is still meaningfully more Tally traffic than a
 * normal AlterId-filtered delta pull, so it runs far less often by default (see
 * DEFAULT_APP_SETTINGS.deletedVoucherSyncFrequencyMinutes in db.ts).
 */
async function runDeletedVoucherProbe() {
    if ((0, sync_scheduler_1.isSyncBusy)())
        return;
    return (0, sync_scheduler_1.runExclusiveSync)(runDeletedVoucherProbeInternal);
}
async function runDeletedVoucherProbeInternal() {
    if (!db_js_1.dbQueries.isBackendAuthenticated())
        return;
    const settings = db_js_1.dbQueries.getAppSettings();
    if (!settings.deletedVoucherSyncEnabled)
        return;
    // Same reasoning as main.ts's other 30s timers — don't add Tally traffic on top of an
    // already-in-progress heavy sync (TallyPrime effectively serves one request at a time).
    if ((0, sync_js_1.getSyncProgress)().inProgress)
        return;
    await (0, cloud_1.renewConnectorLicense)();
    const companies = await (0, sync_js_1.discoverCompanies)();
    const enabledCompanies = companies.filter((c) => {
        const setting = db_js_1.dbQueries.getCompanySetting(c.guid);
        if (setting?.selected !== 1 || setting.syncEnabled !== 1)
            return false;
        try {
            (0, cloud_1.assertCompanyLicense)(c.guid, c.metadata.tallySerial);
            return true;
        }
        catch {
            return false;
        }
    });
    for (const company of enabledCompanies) {
        if (db_js_1.durableOutbox.hasPending(company.guid, "voucher_deletion_probe"))
            continue;
        for (const config of sync_js_1.VOUCHER_SYNC_CONFIGS) {
            const systemVar = voucher_date_count_builder_js_1.VOUCHER_TYPE_SYSTEM_VARS[config.voucherTypeName];
            if (!systemVar)
                continue;
            try {
                (0, cloud_1.assertCompanyLicense)(company.guid, company.metadata.tallySerial);
                const maxAlterId = db_js_1.dbQueries.getCheckpoint(company.guid, config.entityType);
                if (maxAlterId <= 0 ||
                    db_js_1.dbQueries.getPendingCount(company.guid, config.entityType) > 0 ||
                    (() => {
                        const plan = db_js_1.dbQueries.getBatchPlanProgressSummary(company.guid, config.voucherTypeName);
                        return plan.completedBatches < plan.totalBatches;
                    })())
                    continue;
                const capturedAt = new Date().toISOString();
                const xml = (0, voucher_masterid_builder_js_1.voucherMasterIdBuilder)(company.name, systemVar);
                const response = await client_js_1.tallyClient.request({
                    method: "POST",
                    data: xml,
                    responseType: "stream",
                    retries: settings.tallyRetryAttempts,
                });
                const masterIds = await (0, masterid_stream_parser_js_1.collectMasterIds)(response.data);
                // Never trust an empty (or suspiciously tiny) result enough to act on it — the exact same
                // "don't wipe data on a glitchy response" guard h7001's master deletion-diff uses, applied
                // here too (h7004's own ingestion refuses an empty snapshot independently — this is
                // belt-and-suspenders, not the only guard).
                if (masterIds.length === 0) {
                    console.warn(`[DeletedVoucherProbe] ${company.name} — ${config.entityType}: empty MasterId list, skipping this type this run`);
                    continue;
                }
                const batchId = (0, crypto_1.randomUUID)();
                const payloadObj = {
                    protocolVersion: 1,
                    batchId,
                    syncRunId: (0, crypto_1.randomUUID)(),
                    installationId: (0, sync_js_1.getInstallationId)(),
                    companyRegistrationId: (0, cloud_1.assertCompanyLicense)(company.guid),
                    companySourceId: company.guid,
                    companyName: company.name,
                    entityType: "voucher_deletion_probe",
                    checkpoint: { creationId: 0, alterationId: maxAlterId },
                    recordCount: 1,
                    records: [
                        {
                            voucherCategory: config.entityType,
                            masterIds,
                            snapshotComplete: true,
                            capturedAt,
                            maxAlterId,
                        },
                    ],
                };
                const batch = {
                    id: batchId,
                    companyId: company.guid,
                    entityType: "voucher_deletion_probe",
                    payload: JSON.stringify(payloadObj),
                    payloadHash: null,
                    createdAt: new Date().toISOString(),
                    attemptCount: 0,
                    nextAttemptAt: null,
                    status: "pending",
                    lastError: null,
                    cloudAcknowledgedAt: null,
                };
                db_js_1.durableOutbox.begin(batchId, company.guid, "voucher_deletion_probe");
                try {
                    db_js_1.durableOutbox.append(batchId, batch);
                    db_js_1.durableOutbox.seal(batchId, maxAlterId);
                }
                catch (error) {
                    db_js_1.durableOutbox.abort(batchId);
                    throw error;
                }
            }
            catch (err) {
                // One voucher type's probe failing (Tally hiccup, timeout) shouldn't block the rest —
                // same "isolate the failure, keep going" approach runAllSyncsInternal uses per-company.
                console.warn(`[DeletedVoucherProbe] ${company.name} — ${config.entityType} failed:`, err.message);
            }
        }
    }
}
