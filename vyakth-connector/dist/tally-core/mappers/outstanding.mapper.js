"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOutstandingSnapshot = parseOutstandingSnapshot;
exports.parseAndMapOutstanding = parseAndMapOutstanding;
const parser_1 = require("../xml/parser");
const tally_core_utils_1 = require("../utils/tally-core.utils");
const tally_parsers_1 = require("../utils/tally-parsers");
const bill_ageing_util_1 = require("../utils/bill-ageing.util");
const text = (value) => String((0, tally_core_utils_1.unwrapTallyValue)(value) ?? "").trim();
function date(value) {
    if (!text(value))
        return null;
    const result = (0, tally_parsers_1.parseTallyDate)(text(value));
    if (!result ||
        !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
        !Number.isFinite(Date.parse(result + "T00:00:00Z")) ||
        new Date(result + "T00:00:00Z").toISOString().slice(0, 10) !== result)
        throw new Error("Invalid outstanding bill date");
    return result;
}
function amount(value) {
    if (value === undefined || value === null)
        throw new Error("Outstanding balance is missing");
    let result = text(value)
        .replace(/,/g, "")
        .replace(/\s+(Dr|Cr)$/i, "");
    if (!result)
        result = "0";
    if (/^\(\d+(?:\.\d+)?\)$/.test(result))
        result = "-" + result.slice(1, -1);
    if (!/^-?\d{1,16}(?:\.\d{1,4})?$/.test(result))
        throw new Error("Invalid outstanding balance");
    return result;
}
function debit(value) {
    const result = text(value).toLowerCase();
    if (["dr", "yes", "true", "1"].includes(result))
        return true;
    if (["cr", "no", "false", "0", ""].includes(result))
        return false;
    throw new Error("Invalid outstanding debit/credit flag");
}
/** Reject partial reports; unresolved ledgers must never silently remove bills. */
function parseOutstandingSnapshot(xml, expected) {
    const parsed = (0, parser_1.parseTallyXml)(xml);
    const data = parsed?.DATA;
    if (!data || data.LINEERROR)
        throw new Error("Outstanding report response is incomplete or contains a Tally error");
    const context = data.REPORTCONTEXT;
    const asOf = date(context?.ASOF);
    if (!context ||
        text(context.COMPANYNAME) !== expected.companyName ||
        !asOf ||
        (expected.asOf !== undefined && asOf !== expected.asOf) ||
        text(context.REPORTTYPE) !== expected.reportType)
        throw new Error("Outstanding report company/as-of confirmation is missing or mismatched");
    const countText = text(context.RECORDCOUNT).replace(/,/g, "");
    if (!/^\d+$/.test(countText) ||
        !Number.isSafeInteger(Number(countText)) ||
        Number(countText) > 10_000_000)
        throw new Error("Outstanding report count is invalid");
    // The reused payable builder emits BILLSRECEIVABLES too; the envelope identifies the type.
    const input = data.BILLSRECEIVABLES ?? data.BILLSPAYABLES;
    const rows = Array.isArray(input)
        ? input
        : input && typeof input === "object"
            ? [input]
            : [];
    if (rows.length !== Number(countText))
        throw new Error("Outstanding report record count does not match the response");
    const records = rows.map((raw) => {
        const master = text(raw.LEDGERNAMEID);
        const name = text(raw.LEDGERNAME), billName = text(raw.NAME);
        if (!/^\d+$/.test(master) ||
            !Number.isSafeInteger(Number(master)) ||
            Number(master) <= 0 ||
            !name ||
            !billName)
            throw new Error("Outstanding bill ledger identity or bill name is missing");
        const billDate = date(raw.BILLDATE), billCreditPeriod = text(raw.BILLCREDITPERIOD) || null;
        const derived = (0, bill_ageing_util_1.resolveOutstandingBillDueDate)(billDate, billCreditPeriod);
        return {
            partyLedgerMasterId: Number(master),
            partyLedgerName: name,
            billName,
            billDate,
            billCreditPeriod,
            dueDate: raw.DUEDATE ? date(raw.DUEDATE) : date(derived),
            openingBalance: amount(raw.OPENINGBALANCE),
            closingBalance: amount(raw.CLOSINGBALANCE),
            isOpeningDeemedPositive: debit(raw.ISOPENINGDEEMEDPOSITIVE),
            isClosingDeemedPositive: debit(raw.ISCLOSINGDEEMEDPOSITIVE),
        };
    });
    return { asOf, records };
}
function parseAndMapOutstanding(xml, expected) {
    return parseOutstandingSnapshot(xml, expected).records;
}
