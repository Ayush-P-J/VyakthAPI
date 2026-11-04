"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStockValueSnapshot = parseStockValueSnapshot;
const parser_1 = require("../xml/parser");
const tally_core_utils_1 = require("../utils/tally-core.utils");
const mapper_1 = require("../utils/mapper");
const amount = /^-?\d+(\.\d+)?$/;
/**
 * Parses `stockItemBalanceBuilder`'s response. Tally reports stock in hand as a debit, i.e. a
 * negative `ClosingValue`; records flip it so positive means stock in hand. Quantities are
 * already signed that way. Throws on anything
 * malformed rather than returning a partial list — the cloud replaces the whole snapshot, so a
 * truncated response must never be mistaken for items having no value.
 */
function parseStockValueSnapshot(xml) {
    const parsed = (0, parser_1.parseTallyXml)(xml);
    const data = parsed?.ENVELOPE?.DATA ?? parsed?.DATA;
    if (!data || data.LINEERROR)
        throw new Error("Stock value response is incomplete or contains a Tally error");
    const seen = new Set();
    return (0, mapper_1.normalizeToArray)(data.STOCKBALANCE).map((row) => {
        const masterId = Number(String((0, tally_core_utils_1.unwrapTallyValue)(row?.MASTERID) ?? "").trim());
        const raw = String((0, tally_core_utils_1.unwrapTallyValue)(row?.CLOSINGVALUE) ?? "").replace(/,/g, "").trim() || "0";
        if (!Number.isSafeInteger(masterId) || masterId <= 0 || seen.has(masterId) || !amount.test(raw))
            throw new Error("Stock value response has an invalid row");
        // "79488.805 KGS", "-12 Nos", or blank for none; the number comes first.
        const qtyText = String((0, tally_core_utils_1.unwrapTallyValue)(row?.CLOSINGQTY) ?? "").replace(/,/g, "").trim();
        const closingQuantity = qtyText.split(/\s+/)[0] || "0";
        if (!amount.test(closingQuantity))
            throw new Error("Stock value response has an invalid quantity");
        seen.add(masterId);
        const closingValue = raw.startsWith("-") ? raw.slice(1) : Number(raw) === 0 ? raw : `-${raw}`;
        return { stockItemMasterId: masterId, closingValue, closingQuantity };
    });
}
