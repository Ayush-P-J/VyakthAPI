"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packDateRangesByCount = packDateRangesByCount;
exports.classifyFailure = classifyFailure;
exports.planFresh = planFresh;
exports.markFailedOrSplit = markFailedOrSplit;
exports.hasAnyPlan = hasAnyPlan;
exports.hasUnfinishedWork = hasUnfinishedWork;
exports.resetStaleRunningToPending = resetStaleRunningToPending;
exports.getNextRunnableBatch = getNextRunnableBatch;
exports.markRunning = markRunning;
exports.markCompleted = markCompleted;
exports.getProgressSummary = getProgressSummary;
const client_js_1 = require("./tally-core/xml/client.js");
const voucher_date_count_builder_js_1 = require("./tally-core/xml/builders/voucher-date-count.builder.js");
const date_count_stream_parser_js_1 = require("./tally-core/xml/date-count-stream-parser.js");
const sync_batch_settings_js_1 = require("./sync-batch-settings.js");
const batch_fetch_errors_js_1 = require("./batch-fetch-errors.js");
const db_js_1 = require("./db.js");
// --- Date arithmetic on YYYYMMDD strings (Tally's SVFromDate/SVToDate format) ---
function toDate(yyyymmdd) {
    const y = Number(yyyymmdd.slice(0, 4));
    const m = Number(yyyymmdd.slice(4, 6));
    const d = Number(yyyymmdd.slice(6, 8));
    return new Date(y, m - 1, d);
}
function toYyyymmdd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}
function addDays(yyyymmdd, days) {
    const d = toDate(yyyymmdd);
    d.setDate(d.getDate() + days);
    return toYyyymmdd(d);
}
/** Midpoint date (inclusive on the "from" side) for bisecting a date range. */
function bisectDate(from, to) {
    const fromMs = toDate(from).getTime();
    const toMs = toDate(to).getTime();
    const midMs = fromMs + Math.floor((toMs - fromMs) / 2);
    return toYyyymmdd(new Date(midMs));
}
// --- Greedy day-count packing (mirrors h7001's full-sync-planner.service.ts) ---
function packDateRangesByCount(dayCounts, targetVouchersPerBatch) {
    const batches = [];
    let from = null;
    let to = null;
    let running = 0;
    for (const { date, count: c } of dayCounts) {
        if (from === null)
            from = date;
        if (running > 0 && running + c > targetVouchersPerBatch) {
            batches.push({ from, to: to, estimatedCount: running });
            from = date;
            running = 0;
        }
        to = date;
        running += c;
    }
    if (from !== null)
        batches.push({ from, to: to, estimatedCount: running });
    return batches;
}
// --- Failure classification (identical logic to h7001's classifyFailure) ---
function classifyFailure(error, estimatedCount, settings) {
    if (error instanceof batch_fetch_errors_js_1.BatchTooLargeError ||
        error instanceof batch_fetch_errors_js_1.BatchDurationExceededError ||
        error instanceof batch_fetch_errors_js_1.MemoryPressureError) {
        return 'oversized';
    }
    const code = error?.code;
    const message = error instanceof Error ? error.message : String(error);
    if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || message.includes('timed out')) {
        if (estimatedCount != null && estimatedCount >= settings.targetVouchersPerBatch * 0.75) {
            return 'oversized';
        }
        return 'transient';
    }
    return 'oversized';
}
/**
 * Probes the voucher type's full date spread and plans date-range batches sized by
 * settings.targetVouchersPerBatch. Unlike h7001, there's no local `companies.booksFrom` column
 * to fall back to when the probe itself fails — on a probe failure this plans a single
 * "everything" batch (a wide sentinel date range) instead, so the failure still goes through the
 * same persisted retry/split machinery as a real batch rather than falling back to a separate
 * unbatched code path.
 */
async function planFresh(companyGuid, companyName, voucherTypeName) {
    const settings = (0, sync_batch_settings_js_1.getSyncBatchSettings)();
    const systemVar = voucher_date_count_builder_js_1.VOUCHER_TYPE_SYSTEM_VARS[voucherTypeName];
    if (!systemVar) {
        throw new Error(`No Tally system variable mapped for voucher type "${voucherTypeName}"`);
    }
    console.log(`[Planner] ${voucherTypeName}: probing full history for day-counts`);
    let dayCounts = [];
    let probeFailed = false;
    try {
        const xml = (0, voucher_date_count_builder_js_1.voucherDateCountBuilder)(companyName, systemVar);
        const response = await client_js_1.tallyClient.request({
            method: 'POST',
            data: xml,
            responseType: 'stream',
            timeout: settings.requestTimeoutMs,
            retries: 2,
        });
        const counts = await (0, date_count_stream_parser_js_1.countVouchersByDate)(response.data);
        dayCounts = Array.from(counts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    catch (e) {
        probeFailed = true;
        console.warn(`[Planner] ${voucherTypeName}: date-count probe failed, planning one unbounded batch`, e);
    }
    let batches;
    if (probeFailed) {
        batches = [{ from: '00010101', to: '99991231', estimatedCount: null }];
    }
    else if (dayCounts.length === 0) {
        batches = [];
        console.log(`[Planner] ${voucherTypeName}: probe returned 0 vouchers, nothing to plan`);
    }
    else {
        batches = packDateRangesByCount(dayCounts, settings.targetVouchersPerBatch);
        const probeTotal = dayCounts.reduce((sum, d) => sum + d.count, 0);
        console.log(`[Planner] ${voucherTypeName}: probe found ${probeTotal} voucher(s) across ${dayCounts.length} distinct date(s) ` +
            `(${dayCounts[0].date} - ${dayCounts[dayCounts.length - 1].date}) -> ${batches.length} batch(es)`);
    }
    if (batches.length === 0)
        return;
    db_js_1.dbQueries.insertBatchPlans(batches.map((b) => ({
        companyId: companyGuid,
        voucherType: voucherTypeName,
        fromDate: b.from,
        toDate: b.to,
        estimatedVoucherCount: b.estimatedCount,
    })));
    const totalEstimated = batches.reduce((sum, b) => sum + (b.estimatedCount ?? 0), 0);
    const preview = batches
        .slice(0, 10)
        .map((b) => `${b.from}-${b.to}:${b.estimatedCount ?? '?'}`)
        .join(', ');
    console.log(`[Planner] ${voucherTypeName}: planned ${batches.length} batch(es), ~${totalEstimated} estimated voucher(s) ` +
        `[${preview}${batches.length > 10 ? `, ... +${batches.length - 10} more` : ''}]`);
}
/**
 * Applies the outcome of a failed planner-driven batch attempt: retried in place (transient,
 * under the attempt cap), bisected into two half-sized child batches (oversized, still under the
 * split-depth cap), or given up on permanently (Failed). Mirrors h7001's markFailedOrSplit.
 */
function markFailedOrSplit(batchId, error) {
    const row = db_js_1.dbQueries.getBatchPlanById(batchId);
    if (!row)
        throw new Error(`sync_batch_plans row ${batchId} not found`);
    const settings = (0, sync_batch_settings_js_1.getSyncBatchSettings)();
    const attempts = row.attempts + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cls = classifyFailure(error, row.estimatedVoucherCount, settings);
    if (cls === 'transient' && attempts < settings.maxAttemptsPerBatch) {
        db_js_1.dbQueries.markBatchPlanRetried(batchId, attempts, errorMessage);
        return 'retried';
    }
    const canSplit = row.splitDepth < settings.maxSplitDepth && row.fromDate !== row.toDate;
    if (canSplit) {
        const mid = bisectDate(row.fromDate, row.toDate);
        const half = row.estimatedVoucherCount;
        db_js_1.dbQueries.markBatchPlanSplit(batchId, attempts, errorMessage, [
            {
                companyId: row.companyId,
                voucherType: row.voucherType,
                fromDate: row.fromDate,
                toDate: mid,
                splitDepth: row.splitDepth + 1,
                parentBatchId: row.id,
                estimatedVoucherCount: half != null ? Math.ceil(half / 2) : null,
            },
            {
                companyId: row.companyId,
                voucherType: row.voucherType,
                fromDate: addDays(mid, 1),
                toDate: row.toDate,
                splitDepth: row.splitDepth + 1,
                parentBatchId: row.id,
                estimatedVoucherCount: half != null ? Math.floor(half / 2) : null,
            },
        ]);
        return 'split';
    }
    db_js_1.dbQueries.markBatchPlanFailed(batchId, attempts, errorMessage);
    return 'failed';
}
function hasAnyPlan(companyGuid, voucherType) {
    return db_js_1.dbQueries.hasAnyBatchPlan(companyGuid, voucherType);
}
function hasUnfinishedWork(companyGuid, voucherType) {
    return db_js_1.dbQueries.hasUnfinishedBatchPlanWork(companyGuid, voucherType);
}
function resetStaleRunningToPending(companyGuid, voucherType) {
    db_js_1.dbQueries.resetStaleRunningBatchPlansToPending(companyGuid, voucherType);
}
function getNextRunnableBatch(companyGuid, voucherType) {
    return db_js_1.dbQueries.getNextRunnableBatchPlan(companyGuid, voucherType);
}
function markRunning(batchId) {
    db_js_1.dbQueries.markBatchPlanRunning(batchId);
}
function markCompleted(batchId, actualVoucherCount) {
    db_js_1.dbQueries.markBatchPlanCompleted(batchId, actualVoucherCount);
}
function getProgressSummary(companyGuid, voucherType) {
    return db_js_1.dbQueries.getBatchPlanProgressSummary(companyGuid, voucherType);
}
