"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureArray = ensureArray;
exports.isTallyValueNode = isTallyValueNode;
exports.unwrapTallyValue = unwrapTallyValue;
function ensureArray(data) {
    if (!data)
        return [];
    return Array.isArray(data) ? data : [data];
}
function isTallyValueNode(value) {
    return typeof value === "object" && value !== null && "value" in value;
}
function unwrapTallyValue(field) {
    if (field == null || field === "") {
        return undefined;
    }
    if (typeof field === 'object' && field !== null && 'VALUE' in field)
        return unwrapTallyValue(field.VALUE);
    if (isTallyValueNode(field)) {
        return field.value;
    }
    if (typeof field === "string" || typeof field === "number") {
        return field;
    }
    return undefined;
}
