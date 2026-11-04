"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getState: () => electron_1.ipcRenderer.invoke("get-state"),
    retryFailedFetches: (companyId) => electron_1.ipcRenderer.invoke("retry-failed-fetches", companyId),
    retryBlockedBatch: (id) => electron_1.ipcRenderer.invoke("retry-blocked-batch", id),
    retryBatchNow: (id) => electron_1.ipcRenderer.invoke("retry-batch-now", id),
    syncNow: () => electron_1.ipcRenderer.invoke("sync-now"),
    openDashboard: () => electron_1.ipcRenderer.invoke("open-dashboard"),
    toggleSync: (companyId, companyName, enabled) => electron_1.ipcRenderer.invoke("toggle-sync", companyId, companyName, enabled),
    discoverCompanies: () => electron_1.ipcRenderer.invoke("discover-companies"),
    addCompany: (companyId) => electron_1.ipcRenderer.invoke("add-company", companyId),
    removeCompany: (companyId) => electron_1.ipcRenderer.invoke("remove-company", companyId),
    signIn: (email, password) => electron_1.ipcRenderer.invoke("backend-sign-in", email, password),
    signOut: () => electron_1.ipcRenderer.invoke("backend-sign-out"),
    saveConnectorSettings: (settings) => electron_1.ipcRenderer.invoke("save-connector-settings", settings),
    getSyncProgress: () => electron_1.ipcRenderer.invoke("get-sync-progress"),
    onSyncProgress: (callback) => {
        electron_1.ipcRenderer.on("sync-progress", (_event, progress) => callback(progress));
    },
    toggleMaximizeWindow: () => electron_1.ipcRenderer.send("window-toggle-maximize"),
    closeWindow: () => electron_1.ipcRenderer.send("window-close"),
    onWindowMaximizedChange: (callback) => {
        electron_1.ipcRenderer.on("window-maximized-changed", (_event, isMaximized) => callback(isMaximized));
    },
});
