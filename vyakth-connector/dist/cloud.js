"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpCloudUploader = exports.DEFAULT_CLOUD_BASE_URL = exports.normalizeBackendUrl = void 0;
exports.reconcileBackendConfiguration = reconcileBackendConfiguration;
exports.signIn = signIn;
exports.signOut = signOut;
exports.renewConnectorLicense = renewConnectorLicense;
exports.assertCompanyLicense = assertCompanyLicense;
exports.connectorLicenseStatus = connectorLicenseStatus;
exports.approveCompanyOnline = approveCompanyOnline;
exports.deleteCompany = deleteCompany;
const sync_recovery_1 = require("./sync-recovery");
const sync_errors_1 = require("./sync-errors");
const outbox_1 = require("./outbox");
const axios_1 = __importDefault(require("axios"));
const electron_1 = require("electron");
const db_js_1 = require("./db.js");
const backend_sync_js_1 = require("./backend-sync.js");
const offline_license_1 = require("./offline-license");
const backend_config_1 = require("./backend-config");
var backend_config_2 = require("./backend-config");
Object.defineProperty(exports, "normalizeBackendUrl", { enumerable: true, get: function () { return backend_config_2.normalizeBackendUrl; } });
exports.DEFAULT_CLOUD_BASE_URL = (0, backend_config_1.configuredBackendUrl)(electron_1.app?.isPackaged === true);
function sessionTargetsConfiguredBackend(session) {
    try {
        return (0, backend_config_1.normalizeBackendUrl)(session.cloudBaseUrl) === exports.DEFAULT_CLOUD_BASE_URL;
    }
    catch {
        return false;
    }
}
function reconcileBackendConfiguration() {
    const session = db_js_1.dbQueries.getBackendSession();
    if (session && !sessionTargetsConfiguredBackend(session)) {
        db_js_1.dbQueries.requireBackendSignIn();
        db_js_1.dbQueries.setLicenseCache(null);
    }
}
function assertSessionBackend(session) {
    if (!sessionTargetsConfiguredBackend(session)) {
        reconcileBackendConfiguration();
        throw new Error("The configured backend has changed. Sign in again before syncing.");
    }
}
function withProxyConfig(request) {
    // The backend recognises the connector by this, so its sign-in never counts toward the
    // account's two-device limit and signing in on a browser can't log the connector out.
    const config = {
        ...request,
        headers: {
            "User-Agent": `VYAKTH-Connector/${electron_1.app?.getVersion?.() ?? "dev"}`,
            ...request.headers,
        },
    };
    const settings = db_js_1.dbQueries.getAppSettings();
    if (!settings.proxyEnabled || !settings.proxyUrl)
        return { ...config, maxRedirects: 0 };
    const parsed = new URL(settings.proxyUrl);
    return {
        ...config,
        // Do not allow an HTTPS backend to redirect credentials or payloads to HTTP.
        maxRedirects: 0,
        proxy: {
            protocol: parsed.protocol.replace(":", ""),
            host: parsed.hostname,
            port: Number(parsed.port) || (parsed.protocol === "https:" ? 443 : 80),
            auth: parsed.username
                ? {
                    username: decodeURIComponent(parsed.username),
                    password: decodeURIComponent(parsed.password),
                }
                : undefined,
        },
    };
}
function protect(token) {
    if (!electron_1.safeStorage.isEncryptionAvailable())
        throw new Error("Windows credential encryption is unavailable");
    return electron_1.safeStorage.encryptString(token).toString("base64");
}
function reveal(token) {
    return electron_1.safeStorage.decryptString(Buffer.from(token, "base64"));
}
function dataOf(response) {
    if (response.data?.success !== true)
        throw new Error(response.data?.message ?? "Backend did not confirm success");
    return response.data.data;
}
function describeAxiosError(err) {
    if (axios_1.default.isAxiosError(err) && err.response) {
        const body = err.response.data;
        const rawIssues = Array.isArray(body)
            ? body
            : Array.isArray(body?.errors)
                ? body.errors
                : Array.isArray(body?.message)
                    ? body.message
                    : [];
        const details = rawIssues.length
            ? rawIssues
                .slice(0, 5)
                .map((issue) => {
                if (typeof issue === "string")
                    return issue;
                const path = Array.isArray(issue?.path)
                    ? issue.path.join(".")
                    : "payload";
                return `${path}: ${issue?.message || "Invalid value"}`;
            })
                .join("; ")
            : "";
        const message = Array.isArray(body?.message)
            ? "Validation failed"
            : (body?.message ?? "Backend request failed");
        return `HTTP ${err.response.status}: ${typeof body?.code === "string" ? `${body.code}: ` : ""}${message}${details ? ` (${details})` : ""}`;
    }
    return err instanceof Error ? err.message : String(err);
}
async function signIn(email, password) {
    try {
        const cloudBaseUrl = exports.DEFAULT_CLOUD_BASE_URL;
        const data = dataOf(await axios_1.default.post(`${cloudBaseUrl}/v1/auth/sign-in`, { email: email.trim(), password }, withProxyConfig({ timeout: 30_000 })));
        if (!data.accessToken ||
            !data.refreshToken ||
            !data.user?.id ||
            !data.tenant?.id)
            throw new Error("Backend returned an incomplete account session");
        const previous = db_js_1.dbQueries.getBackendSession();
        if (previous &&
            db_js_1.dbQueries.hasSyncData() &&
            (previous.tenantId !== data.tenant.id ||
                previous.cloudBaseUrl !== cloudBaseUrl)) {
            throw new Error("This connector has sync data for another tenant or backend. Use a separate connector database to avoid sending that data to a different account.");
        }
        db_js_1.dbQueries.setBackendSession({
            userId: data.user.id,
            tenantId: data.tenant.id,
            email: data.user.email ?? email.trim(),
            accessToken: protect(data.accessToken),
            refreshToken: protect(data.refreshToken),
            cloudBaseUrl,
            signedInAt: new Date().toISOString(),
        });
        for (const blocked of db_js_1.dbQueries.getBlockedBatches()) {
            if (blocked.reason.includes("Sign in") ||
                blocked.reason.startsWith("HTTP 401"))
                db_js_1.dbQueries.retryBlockedBatch(blocked.id);
        }
        return { ok: true };
    }
    catch (err) {
        // Wrong password, or a Google-only account with no password: show VYAKTH's own wording.
        const message = axios_1.default.isAxiosError(err) ? err.response?.data?.message : undefined;
        if (axios_1.default.isAxiosError(err) && err.response?.status === 401 && typeof message === "string")
            return { ok: false, error: message };
        return { ok: false, error: describeAxiosError(err) };
    }
}
function signOut() {
    db_js_1.dbQueries.signOutBackend();
}
let refreshInFlight = null;
async function refreshSession(session) {
    assertSessionBackend(session);
    if (refreshInFlight)
        return refreshInFlight;
    refreshInFlight = (async () => {
        const data = dataOf(await axios_1.default.post(`${(0, backend_config_1.normalizeBackendUrl)(session.cloudBaseUrl)}/v1/auth/refresh`, {}, withProxyConfig({
            timeout: 30_000,
            headers: {
                Cookie: `refreshToken=${encodeURIComponent(reveal(session.refreshToken))}`,
            },
        })));
        if (!data.accessToken || !data.refreshToken)
            throw new Error("Session expired; sign in again in Settings");
        if (db_js_1.dbQueries.getBackendSession()?.refreshToken === session.refreshToken) {
            db_js_1.dbQueries.setBackendSession({
                ...session,
                accessToken: protect(data.accessToken),
                refreshToken: protect(data.refreshToken),
            });
        }
    })().finally(() => {
        refreshInFlight = null;
    });
    return refreshInFlight;
}
const backendRequest = async (method, route, data, params, headers) => {
    const send = async () => {
        const session = db_js_1.dbQueries.getBackendSession();
        if (!session || !db_js_1.dbQueries.isBackendAuthenticated())
            throw new Error("Sign in to the backend in Settings before syncing");
        assertSessionBackend(session);
        return dataOf(await axios_1.default.request(withProxyConfig({
            method,
            url: `${(0, backend_config_1.normalizeBackendUrl)(session.cloudBaseUrl)}/v1/${route}`,
            data,
            params,
            timeout: 10 * 60_000,
            headers: {
                ...headers,
                ...(route === "connector/sync" && db_js_1.dbQueries.getConnectorDeviceSecret() ? { "x-connector-device-secret": reveal(db_js_1.dbQueries.getConnectorDeviceSecret()) } : {}),
                Authorization: `Bearer ${reveal(session.accessToken)}`,
            },
        })));
    };
    const session = db_js_1.dbQueries.getBackendSession();
    try {
        return await send();
    }
    catch (err) {
        if (!session || !axios_1.default.isAxiosError(err) || err.response?.status !== 401)
            throw err;
        try {
            await refreshSession(session);
            return await send();
        }
        catch (refreshError) {
            if (axios_1.default.isAxiosError(refreshError) &&
                refreshError.response?.status === 401)
                db_js_1.dbQueries.requireBackendSignIn();
            throw refreshError;
        }
    }
};
function currentLease() {
    const session = db_js_1.dbQueries.getBackendSession(), encrypted = db_js_1.dbQueries.getLicenseCache();
    if (!session || !db_js_1.dbQueries.isBackendAuthenticated() || !encrypted)
        throw new Error("Approve this company online before syncing");
    assertSessionBackend(session);
    const cached = JSON.parse(reveal(encrypted));
    if (cached.backendUrl !== (0, backend_config_1.normalizeBackendUrl)(session.cloudBaseUrl) || Date.now() < cached.lastUsedAt - 60000)
        throw new Error("Connector clock or backend changed; renew authorization online");
    const lease = (0, offline_license_1.verifyOfflineLease)(cached.bundle, { tenantId: session.tenantId, userId: session.userId, installationId: db_js_1.dbQueries.getConnectorInstallationId() });
    return { cached, lease };
}
async function renewConnectorLicense(allowOffline = true) {
    try {
        const session = db_js_1.dbQueries.getBackendSession();
        if (!session)
            throw new Error("Sign in before licensing this connector");
        const savedSecret = db_js_1.dbQueries.getConnectorDeviceSecret();
        const bundle = await backendRequest("POST", "connector/licensing/lease", { installationId: db_js_1.dbQueries.getConnectorInstallationId(), ...(savedSecret ? { deviceSecret: reveal(savedSecret) } : {}) });
        const lease = (0, offline_license_1.verifyOfflineLease)(bundle, { tenantId: session.tenantId, userId: session.userId, installationId: db_js_1.dbQueries.getConnectorInstallationId() });
        if (bundle.deviceSecret)
            db_js_1.dbQueries.setConnectorDeviceSecret(protect(bundle.deviceSecret));
        db_js_1.dbQueries.setLicenseCache(protect(JSON.stringify({ bundle, backendUrl: (0, backend_config_1.normalizeBackendUrl)(session.cloudBaseUrl), lastUsedAt: Date.now() })));
        // A renewed, valid lease restores only matching blocked data; old registrations stay quarantined.
        for (const blocked of db_js_1.dbQueries.getBlockedBatches()) {
            if (!blocked.reason.startsWith("HTTP 403"))
                continue;
            const batch = db_js_1.dbQueries.getOutboxBatchById(blocked.id);
            if (!batch)
                continue;
            try {
                const envelope = JSON.parse(batch.payload);
                if (envelope.installationId === lease.installationId && String(envelope.company?.tallySerial ?? "").trim() === lease.serial && lease.companies.some(company => company.sourceId === envelope.companySourceId && company.registrationId === envelope.companyRegistrationId))
                    db_js_1.dbQueries.retryBlockedBatch(blocked.id);
            }
            catch { /* Keep corrupted local payloads for explicit repair. */ }
        }
    }
    catch (error) {
        // Only transport failures permit offline collection. A backend refusal takes effect immediately.
        if (allowOffline && axios_1.default.isAxiosError(error) && !error.response) {
            currentLease();
            return;
        }
        db_js_1.dbQueries.setLicenseCache(null);
        throw new Error(describeAxiosError(error));
    }
}
function assertCompanyLicense(sourceId, observedSerial) {
    const { cached, lease } = currentLease();
    const approved = lease.companies.find(company => company.sourceId === sourceId);
    const setting = db_js_1.dbQueries.getCompanySetting(sourceId);
    if (!approved || !setting?.companyRegistrationId || approved.registrationId !== setting.companyRegistrationId)
        throw new Error("Company is not approved by the backend; add it online in Settings");
    const serial = String(observedSerial ?? db_js_1.dbQueries.getCompanyMetadata(sourceId)?.tallySerial ?? "").trim();
    if (serial !== lease.serial)
        throw new Error("Tally serial does not match this tenant's registered serial");
    db_js_1.dbQueries.setLicenseCache(protect(JSON.stringify({ ...cached, lastUsedAt: Date.now() })));
    return approved.registrationId;
}
function connectorLicenseStatus() {
    // No lease yet just means no company has been added — a normal first-run state, not an error.
    if (!db_js_1.dbQueries.getLicenseCache())
        return { authorized: false, serial: null, expiresAt: null, error: null };
    try {
        const { lease } = currentLease();
        return { authorized: true, serial: lease.serial, expiresAt: lease.expiresAt, error: null };
    }
    catch (error) {
        return { authorized: false, serial: null, expiresAt: null, error: describeAxiosError(error) };
    }
}
async function approveCompanyOnline(company) {
    try {
        const registration = await backendRequest("POST", "connector/licensing/companies", { sourceId: company.guid, name: company.name, serial: String(company.metadata?.tallySerial ?? "").trim() });
        // Lease renewal must also succeed before the local selection becomes runnable.
        await renewConnectorLicense(false);
        return registration.id;
    }
    catch (error) {
        throw new Error(describeAxiosError(error));
    }
}
async function deleteCompany(companySourceId) {
    try {
        await new backend_sync_js_1.BackendSyncClient(backendRequest).deleteCompany(companySourceId);
        // Drop the old offline grant immediately after confirmed server removal.
        db_js_1.dbQueries.setLicenseCache(null);
        try {
            await renewConnectorLicense(false);
        }
        catch { /* Removal succeeded; collection remains paused until renewal. */ }
        return { ok: true };
    }
    catch (err) {
        return { ok: false, error: describeAxiosError(err) };
    }
}
class HttpCloudUploader {
    async uploadBatch(batch, options = {}) {
        try {
            if (batch.payloadHash && batch.payloadHash !== (0, outbox_1.payloadHash)(batch.payload))
                throw new sync_errors_1.SyncBlockedError("Local payload hash does not match; retained for repair");
            if (!db_js_1.dbQueries.getBackendSession())
                throw new sync_errors_1.SyncBlockedError("Sign in to the backend in Settings before syncing");
            const envelope = JSON.parse(batch.payload);
            if (!envelope.companyRegistrationId || envelope.companyRegistrationId !== db_js_1.dbQueries.getCompanySetting(batch.companyId)?.companyRegistrationId)
                throw new sync_errors_1.SyncBlockedError("Previous company registration; retained locally. Approve the company online and fetch fresh data.");
            if (["outstanding_payable", "outstanding_receivable"].includes(envelope.entityType) &&
                !envelope.report)
                throw new sync_errors_1.SyncBlockedError("Legacy outstanding batch lacks snapshot metadata; retained locally for a fresh report fetch");
            if (envelope.batchId !== batch.id ||
                envelope.companySourceId !== batch.companyId ||
                envelope.entityType !== batch.entityType)
                throw new sync_errors_1.SyncBlockedError("Local batch identity does not match its payload");
            await new backend_sync_js_1.BackendSyncClient(backendRequest).upload(envelope, options);
            return { ok: true };
        }
        catch (err) {
            return {
                ok: false,
                error: describeAxiosError(err),
                retryable: (0, sync_recovery_1.validationRetryDelay)(err) !== undefined || (0, sync_errors_1.retryable)(err),
                retryAfterMs: err instanceof sync_errors_1.SyncPendingError ? 5000 : (0, sync_recovery_1.validationRetryDelay)(err),
            };
        }
    }
}
exports.HttpCloudUploader = HttpCloudUploader;
