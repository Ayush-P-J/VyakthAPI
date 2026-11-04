"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRecovery = uploadRecovery;
exports.validationRetryDelay = validationRetryDelay;
/** Persist this deadline in SQLite; restarting or hiding the app must not stop recovery. */
function uploadRecovery(failure, attempts, now = Date.now(), random = Math.random()) {
    if (failure.retryable === false)
        return { blocked: true, nextAttemptAt: null };
    const delay = failure.retryAfterMs ??
        Math.min(300_000, 5_000 * 2 ** Math.min(Math.max(attempts - 1, 0), 6)) *
            (0.75 + random * 0.5);
    return { blocked: false, nextAttemptAt: new Date(now + delay).toISOString() };
}
function validationRetryDelay(error) {
    const status = error?.response
        ?.status;
    const message = String(error?.response?.data
        ?.message ?? error);
    if ((status === 400 || status === 409) &&
        /reference .* has not synced for this company/i.test(message))
        return 10_000;
    // Other validation failures are held for a contract fix.
    return status === 400 || status === 422 ? 30 * 60_000 : undefined;
}
