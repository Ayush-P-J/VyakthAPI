"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stageCompanySync = stageCompanySync;
const node_crypto_1 = require("node:crypto");
const outbox_1 = require("./outbox");
/** Send company metadata even when source masters/vouchers have not changed. */
function stageCompanySync(outbox, companySourceId, companyName, company, installationId, companyRegistrationId) {
    if (outbox.hasPending(companySourceId, "company"))
        return;
    const syncRunId = (0, node_crypto_1.randomUUID)();
    const batchId = (0, node_crypto_1.randomUUID)();
    const payload = JSON.stringify({
        protocolVersion: 1,
        batchId,
        syncRunId,
        installationId,
        companySourceId,
        companyRegistrationId,
        companyName,
        company,
        entityType: "company",
        checkpoint: { creationId: 0, alterationId: 0 },
        recordCount: 0,
        records: [],
    });
    outbox.begin(syncRunId, companySourceId, "company");
    outbox.append(syncRunId, {
        id: batchId,
        companyId: companySourceId,
        entityType: "company",
        payload,
        payloadHash: (0, outbox_1.payloadHash)(payload),
        createdAt: new Date().toISOString(),
        attemptCount: 0,
        nextAttemptAt: null,
        status: "pending",
        lastError: null,
        cloudAcknowledgedAt: null,
    });
    outbox.seal(syncRunId, 0);
}
