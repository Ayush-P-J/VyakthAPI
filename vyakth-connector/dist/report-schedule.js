"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutstandingReportDue = isOutstandingReportDue;
/** First report is due only after a full configured interval from eligibility. */
function isOutstandingReportDue(lastRunStartedAt, firstEligibleAt, intervalMinutes, nowMs = Date.now(), lastAttemptAt) {
    const anchor = Date.parse(lastAttemptAt ?? lastRunStartedAt ?? firstEligibleAt);
    return !Number.isFinite(anchor) || nowMs - anchor >= intervalMinutes * 60_000;
}
