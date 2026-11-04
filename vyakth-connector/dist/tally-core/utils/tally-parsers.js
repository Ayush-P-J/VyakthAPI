"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNumber = parseNumber;
exports.parseBool = parseBool;
exports.parseTallyDate = parseTallyDate;
function parseNumber(val) {
    if (!val)
        return null;
    const hasMinus = val.includes("-");
    const cleaned = val.replace(/[^\d.]/g, "");
    if (!cleaned)
        return null;
    let num = parseFloat(cleaned);
    if (isNaN(num))
        return null;
    if (hasMinus) {
        num = -num;
    }
    return num;
}
function parseBool(val, defaultVal) {
    if (!val)
        return defaultVal;
    const lower = val.toLowerCase().trim();
    if (lower === "yes" || lower === "true" || lower === "1")
        return 1;
    if (lower === "no" || lower === "false" || lower === "0")
        return 0;
    return defaultVal;
}
const TALLY_MONTHS = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
function parseTallyDate(val) {
    if (!val)
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
    }
    // Tally's report-display date format, e.g. "1-Apr-25" or "31-Dec-2025"
    const displayMatch = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(val);
    if (displayMatch) {
        const [, day, monAbbr, yearRaw] = displayMatch;
        const month = TALLY_MONTHS[monAbbr.toLowerCase()];
        if (month) {
            const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
            return `${year}-${month}-${day.padStart(2, "0")}`;
        }
    }
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length === 8) {
        const year = cleaned.substring(0, 4);
        const month = cleaned.substring(4, 6);
        const day = cleaned.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    return val;
}
