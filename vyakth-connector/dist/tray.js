"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTray = initTray;
exports.updateTrayStatus = updateTrayStatus;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const sync_js_1 = require("./sync.js");
const settings_js_1 = require("./settings.js");
const app_branding_js_1 = require("./app-branding.js");
let tray = null;
let currentStatus = "Tally: Checking...";
function buildContextMenu() {
    return electron_1.Menu.buildFromTemplate([
        { id: "status", label: currentStatus, enabled: false },
        { id: "sync", label: "Sync Now", click: async () => await (0, sync_js_1.runAllSyncs)() },
        { id: "settings", label: "Open Settings", click: () => (0, settings_js_1.openSettings)() },
        {
            id: "logs",
            label: "Open Logs",
            click: () => {
                const appDir = path_1.default.join(os_1.default.homedir(), ".vyakth-connector");
                (0, child_process_1.exec)(`explorer.exe "${appDir}"`);
            },
        },
        { type: "separator" },
        {
            id: "quit",
            label: "Quit",
            click: () => {
                // db.close() happens in main.ts's 'will-quit' handler, not here — that only fires once
                // Electron has confirmed the quit is actually going through (see settings.ts's
                // isQuitting gate), not the moment this menu item is clicked.
                electron_1.app.quit();
            },
        },
    ]);
}
async function initTray() {
    await electron_1.app.whenReady();
    // Windows tray icons render best around 16x16; the source asset is a 1024x1024 master.
    const icon = electron_1.nativeImage
        .createFromPath((0, app_branding_js_1.connectorAssetPath)("icon.png"))
        .resize({ width: 16, height: 16 });
    tray = new electron_1.Tray(icon);
    tray.setToolTip(app_branding_js_1.CONNECTOR_NAME);
    tray.setContextMenu(buildContextMenu());
    tray.on("double-click", () => {
        void (0, settings_js_1.openSettings)();
    });
}
function updateTrayStatus(statusText) {
    if (tray) {
        currentStatus = statusText;
        tray.setToolTip(statusText);
        tray.setContextMenu(buildContextMenu());
    }
}
