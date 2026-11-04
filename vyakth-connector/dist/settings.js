"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLaunchAtLogin = applyLaunchAtLogin;
exports.wasLaunchedAtLogin = wasLaunchedAtLogin;
exports.openSettings = openSettings;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const app_branding_js_1 = require("./app-branding.js");
const sync_scheduler_js_1 = require("./sync-scheduler.js");
const company_selection_js_1 = require("./company-selection.js");
const db_js_1 = require("./db.js");
const backend_config_js_1 = require("./backend-config.js");
const client_js_1 = require("./tally-core/xml/client.js");
const cloud_js_1 = require("./cloud.js");
const sync_js_1 = require("./sync.js");
const MIN_SYNC_INTERVAL_MINUTES = 5;
const MAX_SYNC_INTERVAL_MINUTES = 30 * 24 * 60; // 30 days
let window = null;
let ipcRegistered = false;
let isQuitting = false;
let discoveredCompanies = [];
function requireSignIn() {
    if (!db_js_1.dbQueries.isBackendAuthenticated())
        throw new Error("Sign in before managing companies");
}
electron_1.app.on("before-quit", () => {
    isQuitting = true;
});
// Windows auto-start passes this flag so a login launch stays in the tray, while a launch the
// user starts themselves opens the window (otherwise it's unclear the app is running at all).
const LOGIN_LAUNCH_ARG = "--launched-at-login";
function applyLaunchAtLogin(enabled) {
    // Dev runs would register the bare node_modules electron.exe as a login item.
    if (electron_1.app.isPackaged)
        electron_1.app.setLoginItemSettings({ openAtLogin: enabled, args: [LOGIN_LAUNCH_ARG] });
}
function wasLaunchedAtLogin() {
    return process.argv.includes(LOGIN_LAUNCH_ARG);
}
async function openSettings() {
    if (window) {
        if (window.isMinimized())
            window.restore();
        window.show();
        window.focus();
        return;
    }
    await electron_1.app.whenReady();
    if (!ipcRegistered) {
        electron_1.ipcMain.handle("get-state", async () => {
            // Authentication must render immediately even when Tally is offline or slow.
            const isReachable = !db_js_1.dbQueries.isBackendAuthenticated()
                ? false
                : (0, sync_scheduler_js_1.isSyncBusy)()
                    ? true
                    : await (0, sync_js_1.checkTallyReachability)();
            const lastError = db_js_1.dbQueries.getLastError();
            // "My Companies" is the persisted set (see db.ts's getAllCompanySettings doc comment) —
            // always shown regardless of whether Tally is reachable right now. Discovering NEW
            // companies is a separate, explicit action (the "Add Company" page's discover-companies
            // handler below), not something this general state poll triggers on every 5s auto-refresh.
            const companySettings = db_js_1.dbQueries.getAllCompanySettings();
            const companies = companySettings.map((cs) => {
                const entities = sync_js_1.ALL_ENTITY_TYPES.map((type) => {
                    const run = db_js_1.dbQueries.getLastSyncRun(cs.companyId, type);
                    const pendingCount = db_js_1.dbQueries.getPendingCount(cs.companyId, type);
                    const durationMs = run && run.finishedAt
                        ? new Date(run.finishedAt).getTime() -
                            new Date(run.startedAt).getTime()
                        : null;
                    return {
                        type,
                        lastSyncAt: run
                            ? new Date(run.startedAt).toLocaleString()
                            : "Never",
                        lastSyncAtMs: run ? new Date(run.startedAt).getTime() : 0,
                        recordCount: run ? run.recordCount : 0,
                        pendingCount,
                        durationMs,
                    };
                });
                return {
                    name: cs.companyName,
                    guid: cs.companyId,
                    entities,
                    syncEnabled: cs.syncEnabled === 1,
                    approved: !!cs.companyRegistrationId,
                    lastFullSyncAtMs: cs.lastFullSyncFinishedAt
                        ? new Date(cs.lastFullSyncFinishedAt).getTime()
                        : null,
                    lastFullSyncDurationMs: cs.lastFullSyncStartedAt && cs.lastFullSyncFinishedAt
                        ? new Date(cs.lastFullSyncFinishedAt).getTime() -
                            new Date(cs.lastFullSyncStartedAt).getTime()
                        : null,
                };
            });
            const credential = db_js_1.dbQueries.getBackendSession();
            const connectorSettings = db_js_1.dbQueries.getAppSettings();
            return {
                tallyReachable: isReachable,
                lastError,
                blockedBatches: db_js_1.dbQueries.getBlockedBatches(),
                failedBatches: db_js_1.dbQueries.getFailedBatches(),
                failedFetches: db_js_1.dbQueries.getFailedFetches(),
                companies,
                appVersion: electron_1.app.getVersion(),
                lastAutoSyncAttempt: sync_js_1.lastAutoSyncAttempt,
                autoSyncIntervalMs: (0, sync_js_1.getAutoSyncIntervalMs)(),
                isSignedIn: db_js_1.dbQueries.isBackendAuthenticated(),
                cloudBaseUrl: credential?.cloudBaseUrl ?? null,
                accountEmail: credential?.email ?? null,
                installationId: db_js_1.dbQueries.getConnectorInstallationId(),
                signedInAt: credential?.signedInAt ?? null,
                connectorSettings,
                licensing: (0, cloud_js_1.connectorLicenseStatus)(),
            };
        });
        // Custom-titlebar window controls (the window is frameless — see BrowserWindow options
        // below): maximize/restore and close (hide-not-quit, see the close listener below) only —
        // no minimize or quit control by design; quitting for real stays tray-menu-only (tray.ts).
        electron_1.ipcMain.on("window-toggle-maximize", () => {
            if (!window)
                return;
            if (window.isMaximized())
                window.unmaximize();
            else
                window.maximize();
        });
        electron_1.ipcMain.on("window-close", () => window?.close());
        // Discovery lists candidates; only add-company records explicit enrollment.
        electron_1.ipcMain.handle("discover-companies", async () => {
            requireSignIn();
            if ((0, sync_scheduler_js_1.isSyncBusy)())
                return {
                    ok: false,
                    error: "Sync is running. Discover companies after it finishes.",
                    companies: [],
                };
            const isReachable = (0, sync_js_1.getSyncProgress)().inProgress
                ? true
                : await (0, sync_js_1.checkTallyReachability)();
            if (!isReachable) {
                return { ok: true, tallyReachable: false, companies: [] };
            }
            let companies = [];
            await (0, sync_scheduler_js_1.runExclusiveSync)(async () => {
                companies = await (0, sync_js_1.discoverCompanies)();
            });
            discoveredCompanies = companies;
            return {
                ok: true,
                tallyReachable: true,
                companies: companies.map((company) => ({
                    name: company.name,
                    guid: company.guid,
                    added: db_js_1.dbQueries.getCompanySetting(company.guid)?.selected === 1 && !!db_js_1.dbQueries.getCompanySetting(company.guid)?.companyRegistrationId,
                })),
            };
        });
        electron_1.ipcMain.handle("add-company", async (_event, companyId) => {
            try {
                requireSignIn();
                if ((0, sync_scheduler_js_1.isSyncBusy)())
                    throw new Error("Wait for sync to finish before approving a company");
                const discovered = discoveredCompanies.find(company => company.guid === companyId);
                if (!discovered)
                    throw new Error("Discover companies from Tally before adding this company");
                await (0, sync_scheduler_js_1.runExclusiveSync)(async () => {
                    const registrationId = await (0, cloud_js_1.approveCompanyOnline)(discovered);
                    (0, company_selection_js_1.selectDiscoveredCompany)(db_js_1.dbQueries.isBackendAuthenticated(), companyId, discoveredCompanies, (company) => db_js_1.dbQueries.selectCompany(company.guid, company.name, company.metadata ?? {}));
                    db_js_1.dbQueries.setCompanyRegistration(companyId, registrationId);
                });
                void (0, sync_js_1.runAllSyncs)().catch((error) => console.error("Selected company sync failed:", error));
                return { ok: true };
            }
            catch (error) {
                return {
                    ok: false,
                    error: error instanceof Error ? error.message : "Could not add company",
                };
            }
        });
        // companyId here is the Tally GUID (company_settings.companyId / discoverCompanies()'s
        // .guid), which is exactly what h7004's DELETE /v1/connector/companies/:companySourceId
        // expects — no translation needed. Only deletes locally after the cloud confirms the delete,
        // so a network/cloud failure never leaves the user thinking data is gone when it isn't (or
        // vice versa) — except when this installation was never paired at all, where there's no cloud
        // data under this credential to begin with, so the cloud call is skipped rather than treated
        // as a failure that blocks removing an entry the user can plainly see is just clutter.
        electron_1.ipcMain.handle("remove-company", async (event, companyId) => {
            requireSignIn();
            let result = { ok: false, error: "Removal did not complete" };
            await (0, sync_scheduler_js_1.runExclusiveSync)(async () => {
                const setting = db_js_1.dbQueries.getCompanySetting(companyId);
                if (setting?.selected !== 1) {
                    result = { ok: false, error: "Company is not selected" };
                    return;
                }
                if (!db_js_1.dbQueries.getBackendSession()) {
                    result = { ok: false, error: "Sign in online before removing this company" };
                    return;
                }
                const { deleteCompany } = await Promise.resolve().then(() => __importStar(require("./cloud.js")));
                const removed = await deleteCompany(companyId);
                if (!removed.ok) {
                    result = removed;
                    return;
                }
                db_js_1.dbQueries.deleteCompanySetting(companyId);
                result = { ok: true };
            });
            return result;
        });
        electron_1.ipcMain.handle("retry-failed-fetches", async (_event, companyId) => {
            requireSignIn();
            if (typeof companyId !== "string")
                throw new Error("Invalid company");
            db_js_1.dbQueries.retryFailedFetches(companyId);
            await (0, sync_js_1.runAllSyncs)();
            return true;
        });
        electron_1.ipcMain.handle("retry-blocked-batch", async (_event, id) => {
            requireSignIn();
            if (typeof id !== "string")
                throw new Error("Invalid batch ID");
            db_js_1.dbQueries.retryBlockedBatch(id);
            await (0, sync_js_1.retrySweep)();
            return true;
        });
        electron_1.ipcMain.handle("retry-batch-now", async (_event, id) => {
            requireSignIn();
            if (typeof id !== "string")
                throw new Error("Invalid batch ID");
            await (0, sync_js_1.retryOutboxBatchNow)(id);
            return true;
        });
        // Opens the customer's reports in their browser; the connector itself shows no reports.
        electron_1.ipcMain.handle("open-dashboard", async () => {
            const backendUrl = db_js_1.dbQueries.getBackendSession()?.cloudBaseUrl ??
                (0, backend_config_js_1.configuredBackendUrl)(electron_1.app.isPackaged);
            await electron_1.shell.openExternal((0, backend_config_js_1.configuredWebUrl)(backendUrl) + "/dashboard");
            return true;
        });
        electron_1.ipcMain.handle("sync-now", async () => {
            await (0, sync_js_1.runAllSyncs)();
            return true;
        });
        electron_1.ipcMain.handle("backend-sign-in", async (event, email, password) => {
            const { signIn } = await Promise.resolve().then(() => __importStar(require("./cloud.js")));
            const result = await signIn(email, password);
            if (result.ok)
                void (0, sync_js_1.runAllSyncs)().catch((error) => console.error("Sign-in sync failed:", error));
            return result;
        });
        // Waits for any in-flight sync so tokens aren't pulled out from under its uploads.
        electron_1.ipcMain.handle("backend-sign-out", async () => {
            const { signOut } = await Promise.resolve().then(() => __importStar(require("./cloud.js")));
            await (0, sync_scheduler_js_1.runExclusiveSync)(async () => signOut());
            return { ok: true };
        });
        electron_1.ipcMain.handle("toggle-sync", async (event, companyId, companyName, enabled) => {
            const { toggleCompanySync } = await Promise.resolve().then(() => __importStar(require("./sync.js")));
            toggleCompanySync(companyId, companyName, enabled);
            return true;
        });
        electron_1.ipcMain.handle("save-connector-settings", async (event, raw) => {
            const tallyHost = String(raw?.tallyHost ?? "").trim();
            const tallyPort = Math.trunc(Number(raw?.tallyPort));
            const syncIntervalMinutes = Math.trunc(Number(raw?.syncIntervalMinutes));
            const launchAtLogin = raw?.launchAtLogin ? 1 : 0;
            const proxyEnabled = raw?.proxyEnabled ? 1 : 0;
            const proxyUrl = String(raw?.proxyUrl ?? "").trim();
            const tallyRetryAttempts = Math.trunc(Number(raw?.tallyRetryAttempts));
            const notificationsEnabled = raw?.notificationsEnabled ? 1 : 0;
            const masterChunkSize = Math.trunc(Number(raw?.masterChunkSize));
            const deletedVoucherSyncEnabled = raw?.deletedVoucherSyncEnabled ? 1 : 0;
            const deletedVoucherSyncFrequencyMinutes = Math.trunc(Number(raw?.deletedVoucherSyncFrequencyMinutes));
            if (!tallyHost) {
                return { ok: false, error: "Tally host cannot be empty" };
            }
            if (!Number.isInteger(tallyPort) || tallyPort < 1 || tallyPort > 65535) {
                return { ok: false, error: "Tally port must be between 1 and 65535" };
            }
            if (!Number.isInteger(syncIntervalMinutes) ||
                syncIntervalMinutes < MIN_SYNC_INTERVAL_MINUTES ||
                syncIntervalMinutes > MAX_SYNC_INTERVAL_MINUTES) {
                return {
                    ok: false,
                    error: `Sync interval must be between ${MIN_SYNC_INTERVAL_MINUTES} minutes and 30 days`,
                };
            }
            if (proxyEnabled) {
                if (!proxyUrl) {
                    return {
                        ok: false,
                        error: "Proxy URL cannot be empty when the proxy is enabled",
                    };
                }
                try {
                    new URL(proxyUrl);
                }
                catch {
                    return {
                        ok: false,
                        error: "Proxy URL must look like https://[user:pass@]host:port",
                    };
                }
            }
            if (!Number.isInteger(tallyRetryAttempts) ||
                tallyRetryAttempts < 0 ||
                tallyRetryAttempts > 10) {
                return {
                    ok: false,
                    error: "Tally retry attempts must be between 0 and 10",
                };
            }
            if (!Number.isInteger(masterChunkSize) ||
                masterChunkSize < 100 ||
                masterChunkSize > 10_000) {
                return {
                    ok: false,
                    error: "Chunk size must be between 100 and 10,000",
                };
            }
            if (deletedVoucherSyncEnabled) {
                if (!Number.isInteger(deletedVoucherSyncFrequencyMinutes) ||
                    deletedVoucherSyncFrequencyMinutes < 15 ||
                    deletedVoucherSyncFrequencyMinutes > 24 * 60) {
                    return {
                        ok: false,
                        error: "Deleted-voucher sync frequency must be between 15 minutes and 24 hours",
                    };
                }
            }
            const previous = db_js_1.dbQueries.getAppSettings();
            const outstandingReportSyncEnabled = raw?.outstandingReportSyncEnabled === undefined
                ? previous.outstandingReportSyncEnabled
                : raw.outstandingReportSyncEnabled
                    ? 1
                    : 0;
            const outstandingReportSyncFrequencyMinutes = raw?.outstandingReportSyncFrequencyMinutes === undefined
                ? previous.outstandingReportSyncFrequencyMinutes
                : Number(raw.outstandingReportSyncFrequencyMinutes);
            if (!Number.isInteger(outstandingReportSyncFrequencyMinutes) ||
                outstandingReportSyncFrequencyMinutes < 5 ||
                outstandingReportSyncFrequencyMinutes > 43200)
                return {
                    ok: false,
                    error: "Outstanding report frequency must be between 5 minutes and 30 days",
                };
            db_js_1.dbQueries.setAppSettings({
                tallyHost,
                tallyPort,
                syncIntervalMinutes,
                launchAtLogin,
                proxyEnabled,
                proxyUrl,
                tallyRetryAttempts,
                notificationsEnabled,
                masterChunkSize,
                deletedVoucherSyncEnabled,
                deletedVoucherSyncFrequencyMinutes,
                outstandingReportSyncEnabled,
                outstandingReportSyncFrequencyMinutes,
            });
            // Takes effect immediately for the next Tally request and the next auto-sync tick — no
            // restart needed (see main.ts's scheduleAutoSync and this connector's use of a single
            // module-level tallyClient instance rather than one bound to a fixed host/port at startup).
            client_js_1.tallyClient.configure(tallyHost, tallyPort);
            applyLaunchAtLogin(launchAtLogin === 1);
            return { ok: true };
        });
        electron_1.ipcMain.handle("get-sync-progress", () => (0, sync_js_1.getSyncProgress)());
        // Registered once, not per-window-open — the module-level `window` variable it closes over
        // always reflects whichever window (or none) currently exists, so this keeps forwarding to a
        // freshly (re)opened Settings window without needing to re-subscribe.
        (0, sync_js_1.onSyncProgress)((progress) => {
            window?.webContents.send("sync-progress", progress);
        });
        ipcRegistered = true;
    }
    const windowIcon = electron_1.nativeImage.createFromPath((0, app_branding_js_1.connectorAssetPath)("icon.png"));
    if (windowIcon.isEmpty())
        throw new Error("Could not load the Vyakth app icon");
    // Landscape 16:10, matching the sidebar layout; scaled down to fit smaller screens.
    const workArea = electron_1.screen.getPrimaryDisplay().workAreaSize;
    const scale = Math.min(1, (workArea.width * 0.9) / 960, (workArea.height * 0.9) / 600);
    window = new electron_1.BrowserWindow({
        title: app_branding_js_1.CONNECTOR_NAME,
        icon: windowIcon,
        width: Math.round(960 * scale),
        height: Math.round(600 * scale),
        minWidth: 720,
        minHeight: 450,
        show: false,
        // Frameless — settings.html draws its own titlebar (logo/title + quit/maximize/close) to
        // match the reference design, so the OS-native title bar/frame would just be a duplicate.
        frame: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            // This is a customer-facing tray app (per CLAUDE.md), not a dev tool — end users shouldn't
            // be able to open DevTools (F12 / Ctrl+Shift+I / right-click "Inspect") on the Settings
            // window. Still enabled for our own use while unpackaged (`npm run dev`).
            devTools: !electron_1.app.isPackaged,
        },
    });
    if (process.platform === "win32") {
        window.setIcon(windowIcon);
        window.setAppDetails({
            appId: app_branding_js_1.CONNECTOR_APP_ID,
            appIconPath: (0, app_branding_js_1.connectorAssetPath)("icon.ico"),
            appIconIndex: 0,
            relaunchCommand: (0, app_branding_js_1.connectorRelaunchCommand)(),
            relaunchDisplayName: app_branding_js_1.CONNECTOR_NAME,
        });
    }
    // This is a minimal settings panel, not a document-editing app — Electron's default native
    // menu bar (File/Edit/View/Window) has no business here, and its View menu carries a "Toggle
    // Developer Tools" item regardless of the devTools:false webPreference above.
    window.removeMenu();
    // Resizing keeps the 16:10 shape (maximizing still fills the screen).
    window.setAspectRatio(16 / 10);
    // Forwarded to the renderer so the custom titlebar's maximize/restore icon can reflect the
    // actual window state, including when it changes via OS gestures (double-click, Win+Up) that
    // don't go through the 'window-toggle-maximize' IPC channel at all.
    window.on("maximize", () => window?.webContents.send("window-maximized-changed", true));
    window.on("unmaximize", () => window?.webContents.send("window-maximized-changed", false));
    window.on("close", (event) => {
        // Letting this window veto its own close (to hide-not-destroy for a fast reopen) also vetoes
        // app.quit() itself — Electron aborts a quit if any window's close gets prevented. Without
        // this isQuitting check, clicking "Quit" in the tray while Settings is open would run
        // tray.ts's db.close() but never actually exit, leaving every timer/IPC call after that
        // hitting a closed database connection.
        if (isQuitting)
            return;
        event.preventDefault();
        window?.hide();
    });
    window.once("ready-to-show", () => {
        window?.show();
    });
    // Loaded from dist/ (copied there at build time — see package.json's build/dev scripts), not
    // src/, since electron-builder.json5 only packages "dist" — a path reaching back into src/
    // would 404 once the app is actually packaged, even though it happens to still resolve when
    // running unpackaged straight out of the repo.
    window.loadFile(path_1.default.join(__dirname, "settings.html"));
}
