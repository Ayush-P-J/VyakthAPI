"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGEING_BUCKET_ORDER = void 0;
exports.resolveBillDueDate = resolveBillDueDate;
exports.resolveOutstandingBillDueDate = resolveOutstandingBillDueDate;
exports.daysBetween = daysBetween;
exports.bucketForDaysLate = bucketForDaysLate;
const DUE_DATE_MONTHS = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
/**
 * Resolves `bill_allocations.bill_credit_period` into an ISO due date, or null when it can't be.
 * Real synced data shows this Tally field (BILLEXPIRYPERIOD/BILLCREDITPERIOD) holds one of three
 * shapes on a Payment/Receipt voucher's "Agst Ref" settlement: an absolute date ("27-Feb-26"), a
 * bare credit-period duration ("30 Days") with no bill date recorded anywhere on the allocation
 * to resolve it against, or null (checked against a real DB: ~47% null, ~39% absolute date, ~14%
 * duration-only). Only the absolute-date shape yields a usable due date — a duration string is
 * left unresolved rather than guessed at. `bill_allocations.due_date` itself is always null
 * (never computed during voucher-promotion), so it isn't a usable source either.
 */
function resolveBillDueDate(billCreditPeriod) {
    if (!billCreditPeriod)
        return null;
    const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(billCreditPeriod.trim());
    if (!match)
        return null;
    const [, day, monAbbr, yearRaw] = match;
    const month = DUE_DATE_MONTHS[monAbbr.toLowerCase()];
    if (!month)
        return null;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month}-${day.padStart(2, "0")}`;
}
/** Adds `days` to an ISO ("YYYY-MM-DD") date, letting Date's own arithmetic handle month/year rollover. */
function addDaysIso(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
/**
 * Resolves an `os_bills` row's due date. Tally's Bills Receivable/Payable outstanding report
 * never populates a DUEDATE field (verified against real synced data: 100% of 14k+ rows had it
 * null) — the actual due date has to be derived from BILLCREDITPERIOD instead, which — unlike the
 * bill_allocations.bill_credit_period case resolveBillDueDate alone handles — has a bill date on
 * the same row to resolve a duration against. Checked against real data: ~93% of rows have no
 * BILLCREDITPERIOD at all (due date genuinely unknown, e.g. no credit period configured on that
 * bill/ledger), ~6% hold an absolute date, ~1.5% hold a bare "N Days" duration.
 */
function resolveOutstandingBillDueDate(billDate, billCreditPeriod) {
    const absolute = resolveBillDueDate(billCreditPeriod);
    if (absolute)
        return absolute;
    if (!billCreditPeriod || !billDate)
        return null;
    const durationMatch = /^(\d+)\s*Days?$/i.exec(billCreditPeriod.trim());
    if (!durationMatch)
        return null;
    return addDaysIso(billDate, Number(durationMatch[1]));
}
/** Whole-day difference between two ISO ("YYYY-MM-DD") dates: `laterIso` minus `earlierIso`. */
function daysBetween(laterIso, earlierIso) {
    const later = Date.parse(`${laterIso}T00:00:00Z`);
    const earlier = Date.parse(`${earlierIso}T00:00:00Z`);
    return Math.round((later - earlier) / 86_400_000);
}
exports.AGEING_BUCKET_ORDER = [
    "Paid Early / On Time",
    "1-15 Days Late",
    "16-30 Days Late",
    "31-45 Days Late",
    "46-60 Days Late",
    "60+ Days Late",
    "Due Date Unknown",
];
/** `daysLate` is settlement date minus due date — negative/zero means paid on or before it was due. */
function bucketForDaysLate(daysLate) {
    if (daysLate === null)
        return "Due Date Unknown";
    if (daysLate <= 0)
        return "Paid Early / On Time";
    if (daysLate <= 15)
        return "1-15 Days Late";
    if (daysLate <= 30)
        return "16-30 Days Late";
    if (daysLate <= 45)
        return "31-45 Days Late";
    if (daysLate <= 60)
        return "46-60 Days Late";
    return "60+ Days Late";
}
