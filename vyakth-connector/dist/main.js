"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const db_js_1 = require("./db.js");
const client_js_1 = require("./tally-core/xml/client.js");
const tray_js_1 = require("./tray.js");
const sync_js_1 = require("./sync.js");
const sync_scheduler_js_1 = require("./sync-scheduler.js");
const deleted_voucher_sync_js_1 = require("./deleted-voucher-sync.js");
const settings_js_1 = require("./settings.js");
const cloud_js_1 = require("./cloud.js");
const app_branding_js_1 = require("./app-branding.js");
if (!electron_1.app.requestSingleInstanceLock())
    electron_1.app.quit();
if (process.platform === "win32") {
    electron_1.app.setAppUserModelId(app_branding_js_1.CONNECTOR_APP_ID);
}
async function main() {
    if (!electron_1.app.hasSingleInstanceLock())
        return;
    (0, db_js_1.initDb)();
    (0, cloud_js_1.reconcileBackendConfiguration)();
    // Minimal tray panel, not a document-editing app — no window here should ever get Electron's
    // default File/Edit/View/Window menu bar (settings.ts also calls removeMenu() on its own
    // window; this covers any future window that forgets to).
    electron_1.Menu.setApplicationMenu(null);
    // Only fires once Electron has confirmed the quit is actually proceeding (all windows closed,
    // nothing vetoed it) — see settings.ts's isQuitting gate on its window's close handler.
    electron_1.app.on("will-quit", () => {
        db_js_1.db.close();
    });
    const settings = db_js_1.dbQueries.getAppSettings();
    client_js_1.tallyClient.configure(settings.tallyHost, settings.tallyPort);
    (0, settings_js_1.applyLaunchAtLogin)(settings.launchAtLogin === 1);
    await electron_1.app.whenReady();
    // Prevent app from quitting when windows close
    electron_1.app.on("window-all-closed", () => {
        // Empty handler prevents default quit
    });
    await (0, tray_js_1.initTray)();
    electron_1.app.on("second-instance", () => {
        void (0, settings_js_1.openSettings)();
    });
    if (!db_js_1.dbQueries.isBackendAuthenticated() || !(0, settings_js_1.wasLaunchedAtLogin)())
        await (0, settings_js_1.openSettings)();
    if (db_js_1.dbQueries.isBackendAuthenticated())
        void (0, sync_js_1.runAutoSync)().catch((error) => console.error("Startup sync failed:", error));
    // Start the background retry sweep (every 30s). Skipped while a sync is actively running — all
    // cloud uploads now happen only in the trailing flush phase at the end of runAllSyncsInternal
    // (sync.ts), specifically so no upload traffic overlaps with Tally fetch traffic; this timer
    // firing mid-sync would undo that by uploading whatever's landed in the outbox so far.
    setInterval(async () => {
        if ((0, sync_scheduler_js_1.isSyncBusy)())
            return;
        try {
            await (0, sync_js_1.retrySweep)();
        }
        catch (e) {
            console.error("Retry sweep failed:", e);
        }
    }, 30 * 1000);
    // Self-rescheduling rather than setInterval(fn, AUTO_SYNC_INTERVAL_MS): reads the current
    // interval from settings on every tick, so a change saved in Settings takes effect on the next
    // run instead of only after an app restart.
    function scheduleAutoSync() {
        setTimeout(async () => {
            try {
                await (0, sync_js_1.runAutoSync)();
            }
            catch (e) {
                console.error("Auto-sync loop failed:", e);
            }
            scheduleAutoSync();
        }, (0, sync_js_1.getAutoSyncIntervalMs)());
    }
    scheduleAutoSync();
    // Separate report schedule. Due checks are persisted per report; this cheap tick does not
    // pull Tally again until the report frequency has elapsed and master uploads are committed.
    setInterval(() => {
        void (0, sync_js_1.runOutstandingReports)().catch((error) => console.error("Outstanding report cycle failed:", error));
    }, 30_000);
    // Same self-rescheduling pattern as scheduleAutoSync, on its own independent interval
    // (Settings → Sync → "Sync Deleted Vouchers Frequency") — off entirely by default, and a no-op
    // per tick when off (runDeletedVoucherProbe checks the setting itself), so this costs nothing
    // for an install that hasn't opted in beyond one extra timer firing.
    function scheduleDeletedVoucherProbe() {
        setTimeout(async () => {
            try {
                await (0, deleted_voucher_sync_js_1.runDeletedVoucherProbe)();
            }
            catch (e) {
                console.error("Deleted-voucher probe failed:", e);
            }
            scheduleDeletedVoucherProbe();
        }, db_js_1.dbQueries.getAppSettings().deletedVoucherSyncFrequencyMinutes * 60 * 1000);
    }
    scheduleDeletedVoucherProbe();
    // Start the Tally reachability check for tray status (every 30s). Skipped while a sync is
    // actively running — TallyPrime's HTTP interface effectively serves one request at a time, and
    // this ping firing mid-way through a heavy master/voucher fetch was landing a second concurrent
    // request on Tally, destabilizing it under load (observed as a 30s timeout on the next probe,
    // then Tally's listener refusing connections outright). A sync already in progress is itself
    // proof Tally was reachable moments ago, so skipping this tick loses no real status information.
    setInterval(async () => {
        if ((0, sync_scheduler_js_1.isSyncBusy)())
            return;
        try {
            const isReachable = await (0, sync_js_1.checkTallyReachability)();
            if (isReachable) {
                (0, tray_js_1.updateTrayStatus)("Tally: Connected");
            }
            else {
                (0, tray_js_1.updateTrayStatus)("Tally: Not detected");
            }
        }
        catch (e) {
            (0, tray_js_1.updateTrayStatus)("Tally: Status unknown");
        }
    }, 30 * 1000);
    // Initial check
    (0, sync_js_1.checkTallyReachability)().then((isReachable) => {
        if (isReachable) {
            (0, tray_js_1.updateTrayStatus)("Tally: Connected");
        }
        else {
            (0, tray_js_1.updateTrayStatus)("Tally: Not detected");
        }
    });
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
