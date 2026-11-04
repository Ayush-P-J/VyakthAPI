"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncBackendFailure = exports.SyncPendingError = exports.MissingReferenceError = exports.SyncBlockedError = void 0;
exports.retryable = retryable;
exports.singleFlight = singleFlight;
class SyncBlockedError extends Error {
}
exports.SyncBlockedError = SyncBlockedError;
class MissingReferenceError extends Error {
}
exports.MissingReferenceError = MissingReferenceError;
class SyncPendingError extends Error {
}
exports.SyncPendingError = SyncPendingError;
class SyncBackendFailure extends Error {
    response;
    constructor(code, message) {
        super(`HTTP ${code}: ${message}`);
        this.response = { status: code };
    }
}
exports.SyncBackendFailure = SyncBackendFailure;
function retryable(error) {
    if (error instanceof SyncBlockedError)
        return false;
    const status = error?.response
        ?.status;
    return (status == null ||
        status === 408 ||
        status === 409 ||
        status === 429 ||
        status >= 500);
}
/** Shared by timers and manual sync, so a slow request cannot be uploaded twice concurrently. */
function singleFlight(work) {
    let active = null;
    return () => {
        if (!active)
            active = Promise.resolve()
                .then(work)
                .finally(() => {
                active = null;
            });
        return active;
    };
}
