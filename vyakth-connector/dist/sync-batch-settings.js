"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncBatchSettings = getSyncBatchSettings;
exports.reloadSyncBatchSettings = reloadSyncBatchSettings;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const electron_1 = require("electron");
const DEFAULTS = {
    targetVouchersPerBatch: 2000,
    targetMastersPerBatch: 5000,
    maxSplitDepth: 6,
    maxAttemptsPerBatch: 3,
    requestTimeoutMs: 120_000,
    maxBatchDurationMs: 180_000,
    maxResponseBytes: 200_000_000,
    memoryPressureThresholdBytes: 1_200_000_000,
    retryBackoffBaseMs: 2_000,
    retryBackoffMultiplier: 2,
};
// Same packaged-vs-dev split as db.ts's resolveDbPath — packaged installs can't write next to the
// code (e.g. under Program Files).
function resolveSettingsPath() {
    if (electron_1.app.isPackaged) {
        const appDir = path_1.default.join(os_1.default.homedir(), '.vyakth-connector');
        if (!fs_1.default.existsSync(appDir))
            fs_1.default.mkdirSync(appDir, { recursive: true });
        return path_1.default.join(appDir, 'sync-batch-settings.json');
    }
    return path_1.default.join(__dirname, '..', 'sync-batch-settings.json');
}
function readSettingsFile() {
    const settingsPath = resolveSettingsPath();
    try {
        const raw = fs_1.default.readFileSync(settingsPath, 'utf8');
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULTS, ...parsed };
        const allNumbers = Object.keys(DEFAULTS).every((key) => typeof merged[key] === 'number' && Number.isFinite(merged[key]));
        if (allNumbers)
            return merged;
    }
    catch (e) {
        // Missing or corrupt file — fall back to defaults.
    }
    return { ...DEFAULTS };
}
let cached = null;
function getSyncBatchSettings() {
    if (!cached)
        cached = readSettingsFile();
    return cached;
}
function reloadSyncBatchSettings() {
    cached = readSettingsFile();
    return cached;
}
