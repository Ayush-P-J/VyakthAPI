"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOfflineLease = verifyOfflineLease;
const node_crypto_1 = require("node:crypto");
function verifyOfflineLease(bundle, expected, now = Date.now()) {
    if (!bundle ||
        typeof bundle.payload !== "string" ||
        typeof bundle.signature !== "string" ||
        typeof bundle.publicKey !== "string" ||
        bundle.payload.length > 1_000_000 ||
        !(0, node_crypto_1.verify)(null, Buffer.from(bundle.payload), bundle.publicKey, Buffer.from(bundle.signature, "base64url")))
        throw new Error("Invalid signed connector authorization; reconnect to the backend");
    const lease = JSON.parse(Buffer.from(bundle.payload, "base64url").toString("utf8"));
    const issued = Date.parse(lease.issuedAt), expires = Date.parse(lease.expiresAt);
    if (lease.version !== 1 ||
        lease.tenantId !== expected.tenantId ||
        lease.userId !== expected.userId ||
        lease.installationId !== expected.installationId ||
        !Number.isFinite(issued) ||
        !Number.isFinite(expires) ||
        issued > now + 60000 ||
        expires <= now ||
        expires <= issued ||
        expires - issued > 86400000 ||
        !/^[0-9]+$/.test(lease.serial) ||
        !Array.isArray(lease.companies) ||
        lease.companies.some((c) => !c ||
            typeof c.sourceId !== "string" ||
            typeof c.registrationId !== "string"))
        throw new Error("Connector authorization has expired or belongs to another account; reconnect online");
    return lease;
}
