"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stageOutstandingSnapshot = stageOutstandingSnapshot;
const node_crypto_1 = require("node:crypto");
const outbox_1 = require("./outbox");
/** Only call after the entire Tally response has passed identity/completeness checks. */
function stageOutstandingSnapshot(outbox, source, records, asOf, capturedAt, fetchId = (0, node_crypto_1.randomUUID)()) {
    const snapshotId = (0, node_crypto_1.randomUUID)();
    const chunks = [];
    let current = [];
    let size = 0;
    for (const row of records) {
        const bytes = Buffer.byteLength(JSON.stringify(row), "utf8") + 1;
        if (bytes > 1_000_000)
            throw new Error("Outstanding report row is too large");
        if (current.length &&
            (current.length >= 1000 || size + bytes > 1_000_000)) {
            chunks.push(current);
            current = [];
            size = 0;
        }
        current.push(row);
        size += bytes;
    }
    if (current.length || !chunks.length)
        chunks.push(current);
    if (chunks.length > 10000)
        throw new Error("Outstanding snapshot exceeds the chunk limit");
    outbox.begin(fetchId, source.companySourceId, source.entityType);
    try {
        chunks.forEach((rows, chunkIndex) => {
            const batchId = (0, node_crypto_1.randomUUID)();
            const payload = JSON.stringify({
                protocolVersion: 1,
                ...source,
                batchId,
                syncRunId: fetchId,
                checkpoint: { creationId: 0, alterationId: 0 },
                recordCount: rows.length,
                records: rows,
                report: {
                    snapshotId,
                    asOf,
                    capturedAt,
                    chunkIndex,
                    totalChunks: chunks.length,
                    totalRecords: records.length,
                    snapshotComplete: true,
                },
            });
            if (Buffer.byteLength(payload, "utf8") > 1_500_000)
                throw new Error("Outstanding batch exceeds the API byte limit");
            outbox.append(fetchId, {
                id: batchId,
                companyId: source.companySourceId,
                entityType: source.entityType,
                payload,
                payloadHash: (0, outbox_1.payloadHash)(payload),
                createdAt: new Date().toISOString(),
                attemptCount: 0,
                nextAttemptAt: null,
                status: "pending",
                lastError: null,
                cloudAcknowledgedAt: null,
            });
        });
        outbox.seal(fetchId, 0);
    }
    catch (error) {
        outbox.abort(fetchId);
        throw error;
    }
    return snapshotId;
}
