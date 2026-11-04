"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectDiscoveredCompany = selectDiscoveredCompany;
exports.canSyncCompany = canSyncCompany;
function selectDiscoveredCompany(signedIn, companyId, discovered, save) {
    if (!signedIn)
        throw new Error("Sign in before adding companies");
    const company = discovered.find((item) => item.guid === companyId);
    if (!company || !company.guid.trim() || !company.name.trim())
        throw new Error("Discover companies from Tally again before adding this company");
    save(company);
}
function canSyncCompany(signedIn, setting) {
    return signedIn && setting?.selected === 1 && setting.syncEnabled === 1;
}
