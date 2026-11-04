"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLedgerGroup = mapLedgerGroup;
exports.mapLedger = mapLedger;
exports.mapLedgerGroups = mapLedgerGroups;
exports.mapLedgers = mapLedgers;
const mapper_1 = require("../utils/mapper");
const tally_parsers_1 = require("../utils/tally-parsers");
function optionalIdentifier(value, maxLength) {
    const normalized = (0, mapper_1.toStringOrNull)(value);
    return normalized && normalized.length <= maxLength ? normalized : null;
}
function mapLedgerGroup(raw, companyId, groupNameToId) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        alias: null,
        parentGroupId: raw.PARENT ? (groupNameToId.get(raw.PARENT) ?? null) : null,
        primaryGroup: (0, mapper_1.toStringOrNull)(raw.PRIMARYGROUP),
        nature: (0, mapper_1.toStringOrNull)(raw.NATURE),
        affectsGrossProfit: raw.AFFECTSGROSSPROFIT === "Yes" ? 1 : 0,
    };
}
function mapLedger(raw, companyId, groupNameToId) {
    const openingBills = (0, mapper_1.normalizeToArray)(raw.OPENINGBALANCELIST).map((b) => ({
        billDate: (0, mapper_1.toStringOrNull)(b.BILLDATE),
        billName: (0, mapper_1.toStringOrNull)(b.NAME) || "",
        billCreditPeriod: (0, mapper_1.toStringOrNull)(b.BILLCREDITPERIOD),
        openingBalance: (0, mapper_1.toRequiredInt)(b.OPENINGBALANCE),
        isDeemedPositive: (0, mapper_1.toDeemedPositive)(b.ISDEEMEDPOSITIVE),
    }));
    const addressArr = (0, mapper_1.normalizeToArray)(raw.ADDRESS).map((a) => (0, mapper_1.toStringOrNull)(a.ADDRESS));
    const creditLimit = raw.CREDITLIMIT ? (0, mapper_1.toInt)(raw.CREDITLIMIT) : null;
    return {
        companyId,
        ledgerGroupId: raw.PARENT ? (groupNameToId.get(raw.PARENT) ?? null) : null,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        alias: (0, mapper_1.toStringOrNull)(raw.ONLYALIAS),
        isBillwiseOn: raw.ISBILLWISEON === "Yes" ? 1 : 0,
        billCreditPeriod: (0, mapper_1.toStringOrNull)(raw.BILLCREDITPERIOD),
        creditLimit: creditLimit != null && creditLimit < 0 ? null : creditLimit,
        address1: addressArr[0] ?? null,
        address2: addressArr[1] ?? null,
        address3: addressArr[2] ?? null,
        address4: addressArr[3] ?? null,
        country: (0, mapper_1.toStringOrNull)(raw.COUNTRY),
        state: (0, mapper_1.toStringOrNull)(raw.STATE),
        pincode: (0, mapper_1.toStringOrNull)(raw.PINCODE),
        contactPerson: (0, mapper_1.toStringOrNull)(raw.LEDGERCONTACT),
        mobile: (0, mapper_1.toStringOrNull)(raw.LEDGERMOBILE),
        phone: (0, mapper_1.toStringOrNull)(raw.LEDGERPHONE),
        email: (0, mapper_1.toStringOrNull)(raw.EMAIL),
        website: (0, mapper_1.toStringOrNull)(raw.WEBSITE),
        panNumber: optionalIdentifier(raw.INCOMETAXNUMBER, 10),
        gstRegistrationType: (0, mapper_1.toStringOrNull)(raw.GSTREGISTRATIONTYPE),
        gstin: optionalIdentifier(raw.GSTIN, 15),
        hsnCode: (0, mapper_1.toStringOrNull)(raw.HSN),
        gstRate: (0, tally_parsers_1.parseNumber)(raw.GSTRATE == null ? null : String(raw.GSTRATE)),
        openingBalance: (0, mapper_1.toRequiredInt)(raw.OPENINGBALANCE),
        isDeemedPositive: (0, mapper_1.toDeemedPositive)(raw.ISDEEMEDPOSITIVE),
        openingBills,
    };
}
function mapLedgerGroups(raw, companyId, map) {
    return raw.map((r) => mapLedgerGroup(r, companyId, map));
}
function mapLedgers(raw, companyId, map) {
    return raw.map((r) => mapLedger(r, companyId, map));
}
