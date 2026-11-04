"use strict";
// Ported verbatim from h7001's electron/services/sync/batch-fetch-errors.ts — same three
// classification signals used by voucher-batch-planner.ts's classifyFailure to decide whether a
// failed planned batch should be retried as-is or split into two smaller date ranges.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPressureError = exports.BatchDurationExceededError = exports.BatchTooLargeError = void 0;
/** A planner-driven batch fetch exceeded the configured response-size ceiling. */
class BatchTooLargeError extends Error {
}
exports.BatchTooLargeError = BatchTooLargeError;
/** A planner-driven batch fetch exceeded the configured wall-clock deadline. */
class BatchDurationExceededError extends Error {
}
exports.BatchDurationExceededError = BatchDurationExceededError;
/** Heap usage crossed the configured pressure threshold mid-batch — a proactive abort, not
 * true OOM detection (an actual V8/OS OOM is typically an uncatchable fatal process abort). */
class MemoryPressureError extends Error {
}
exports.MemoryPressureError = MemoryPressureError;
