"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncBusy = isSyncBusy;
exports.runExclusiveSync = runExclusiveSync;
exports.waitForExclusiveSync = waitForExclusiveSync;
let active = null;
function isSyncBusy() {
    return active !== null;
}
/** Tally serves one request at a time; masters, reports and deletion probes share this lane. */
function runExclusiveSync(work) {
    if (active)
        return active.catch(() => { }).then(() => runExclusiveSync(work));
    active = Promise.resolve()
        .then(work)
        .finally(() => {
        active = null;
    });
    return active;
}
async function waitForExclusiveSync() {
    while (active)
        await active.catch(() => { });
}
