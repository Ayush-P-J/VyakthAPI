"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendSyncClient = void 0;
const sync_errors_1 = require("./sync-errors");
class BackendSyncClient {
    request;
    polling;
    constructor(request, polling = {
        // Queued voucher batches can exceed the former six-second window. Keep
        // checking the durable receipt so the retry sweep does not resubmit work
        // that is already being processed.
        attempts: 30,
        delayMs: 2000,
        wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    }) {
        this.request = request;
        this.polling = polling;
    }
    async upload(envelope, options = {}) {
        if (envelope.protocolVersion !== 1 ||
            typeof envelope.batchId !== "string" ||
            !Array.isArray(envelope.records))
            throw new sync_errors_1.SyncBlockedError("Invalid local sync envelope");
        let receipt = await this.request("POST", "connector/sync", envelope, undefined, {
            "Idempotency-Key": envelope.batchId,
            ...(options.manualRetry ? { "x-connector-retry-now": "true" } : {}),
        });
        for (let attempt = 0;; attempt++) {
            if (receipt?.batchId !== envelope.batchId ||
                receipt?.entityType !== envelope.entityType)
                throw new sync_errors_1.SyncBlockedError("Backend did not return a matching committed sync receipt");
            if (receipt.status === "completed")
                break;
            if (receipt.status === "failed")
                throw new sync_errors_1.SyncBackendFailure(receipt.error?.code ?? 500, receipt.error?.message ?? "Backend processing failed");
            if (!["queued", "processing"].includes(receipt.status))
                throw new sync_errors_1.SyncBlockedError("Backend returned an unknown sync receipt state");
            if (attempt >= this.polling.attempts)
                throw new sync_errors_1.SyncPendingError("Backend processing is pending; local batch retained until commit");
            await this.polling.wait(this.polling.delayMs);
            receipt = await this.request("GET", `connector/sync/${encodeURIComponent(envelope.batchId)}`);
        }
        // A queued response is insufficient: the local cursor moves only after a durable database commit.
        if (receipt?.status !== "completed" ||
            receipt.batchId !== envelope.batchId ||
            receipt.entityType !== envelope.entityType)
            throw new sync_errors_1.SyncBlockedError("Backend did not return a matching committed sync receipt");
    }
    async deleteCompany(sourceId) {
        for (let page = 1;; page++) {
            const response = await this.request("GET", "companies", undefined, {
                page,
                limit: 1000,
            });
            const rows = Array.isArray(response) ? response : response.records;
            if (!Array.isArray(rows))
                throw new sync_errors_1.SyncBlockedError("Backend returned no company records");
            const company = rows.find((row) => row.guid === sourceId || row.tallyCompanyId === sourceId);
            if (company) {
                await this.request("DELETE", `companies/${encodeURIComponent(company.id)}`);
                return;
            }
            if (rows.length < 1000)
                return;
        }
    }
}
exports.BackendSyncClient = BackendSyncClient;
