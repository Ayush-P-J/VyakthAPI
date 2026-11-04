"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDeemedPositive = toDeemedPositive;
exports.toRequiredInt = toRequiredInt;
exports.toInt = toInt;
exports.toStringOrNull = toStringOrNull;
exports.normalizeToArray = normalizeToArray;
const tally_core_utils_1 = require("./tally-core.utils");
function toDeemedPositive(value) {
    value = (0, tally_core_utils_1.unwrapTallyValue)(value);
    if (value === null || value === undefined || value === "")
        return 1;
    const str = String(value).trim();
    return str === "Yes" || str === "Dr" ? 1 : 0;
}
function toRequiredInt(value) {
    value = (0, tally_core_utils_1.unwrapTallyValue)(value);
    if (value === null || value === undefined || value === "")
        return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
}
function toInt(value) {
    value = (0, tally_core_utils_1.unwrapTallyValue)(value);
    if (value === "" || value === null || value === undefined) {
        return null;
    }
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
}
function toStringOrNull(value) {
    value = (0, tally_core_utils_1.unwrapTallyValue)(value);
    if (value === null || value === undefined)
        return null;
    const str = String(value).trim();
    return str === "" ? null : str;
}
function normalizeToArray(raw) {
    if (!raw)
        return [];
    return Array.isArray(raw) ? raw : [raw];
}
