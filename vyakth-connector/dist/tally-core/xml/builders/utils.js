"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterIdRangeFilterDef = exports.masterIdRangeFilterRef = exports.voucherDateRangeFilterDef = exports.voucherDateRangeFilterRef = void 0;
exports.escapeXml = escapeXml;
function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
const VOUCHER_DATE_RANGE_FILTER_NAME = "VchDateRangeFilter";
/**
 * `$Date` rendered as a plain YYYYMMDD integer, so a date range can be expressed as an ordinary
 * numeric comparison.
 *
 * This exists because Tally's `$$Date:"..."` literal parser evaluates to null in these voucher
 * report requests — verified against a live TallyPrime with both `$$Date:"20260401"` and
 * `$$Date:"1-Apr-2026"`: a `$Date >= $$Date:"..."` filter passes *every* row (comparison against
 * null) and `$Date <= $$Date:"..."` passes *none*, on both `Vouchers : VoucherType` and plain
 * `Voucher` collections. The same numeric-decomposition trick is what the tally-database-loader
 * reference project uses to read `$BooksFrom`.
 *
 * Note this filter is what actually scopes a voucher request to a date range. The REPORT-level
 * `<SET>SVFromDate</SET>` / `<SET>SVToDate</SET>` below do NOT restrict these collections at all
 * — measured: a 3-day range, a 1-month range and no range all returned an identical 13,835
 * vouchers / 23.5 MB. Neither does `<SVFROMDATE>` in STATICVARIABLES, nor a separate
 * `<USE>Change Period</USE>` request. With this filter the response finally scales with the
 * range (257 vouchers / 0.42 MB for 3 days vs 13,835 / 23.5 MB unbounded), which is what keeps
 * Tally from having to build a whole company's voucher history in memory for one request.
 */
const DATE_AS_NUMBER = "((($$YearOfDate:$Date)*10000)+(($$MonthOfDate:$Date)*100)+($$DayOfDate:$Date))";
/** Goes inside `<COLLECTION>`, alongside any other `<FILTERS>` lines (they AND together). */
const voucherDateRangeFilterRef = (dateRange) => dateRange ? `<FILTERS>${VOUCHER_DATE_RANGE_FILTER_NAME}</FILTERS>` : "";
exports.voucherDateRangeFilterRef = voucherDateRangeFilterRef;
/** Goes at TDLMESSAGE level, next to the sibling `DeltaSyncFilter` definition. */
const voucherDateRangeFilterDef = (dateRange) => dateRange
    ? `<SYSTEM TYPE="Formulae" NAME="${VOUCHER_DATE_RANGE_FILTER_NAME}">${DATE_AS_NUMBER} &gt;= ${dateRange.from} and ${DATE_AS_NUMBER} &lt;= ${dateRange.to}</SYSTEM>`
    : "";
exports.voucherDateRangeFilterDef = voucherDateRangeFilterDef;
const MASTER_ID_RANGE_FILTER_NAME = "MasterIdRangeFilter";
/**
 * Splits a master collection by MasterId so one request never has to build the whole company's
 * masters at once — the same idea as the voucher date filter, for entities that have no date.
 *
 * Unlike `$Date`, `$MasterId` is already numeric, so a plain comparison works with no
 * decomposition. Verified against a live TallyPrime (test/probe-ledger-masterid-filter.ts): four
 * ranges over 25,131 ledgers returned 11639 + 4152 + 4161 + 5179 = 25,131 with zero duplicated,
 * missing or out-of-range rows.
 */
const masterIdRangeFilterRef = (range) => range ? `<FILTERS>${MASTER_ID_RANGE_FILTER_NAME}</FILTERS>` : "";
exports.masterIdRangeFilterRef = masterIdRangeFilterRef;
const masterIdRangeFilterDef = (range) => range
    ? `<SYSTEM TYPE="Formulae" NAME="${MASTER_ID_RANGE_FILTER_NAME}">$MasterId &gt; ${range.gt} and $MasterId &lt;= ${range.lte}</SYSTEM>`
    : "";
exports.masterIdRangeFilterDef = masterIdRangeFilterDef;
