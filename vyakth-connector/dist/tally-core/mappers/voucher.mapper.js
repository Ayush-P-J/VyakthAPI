"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapVoucher = mapVoucher;
exports.mapVoucherType = mapVoucherType;
exports.mapVouchers = mapVouchers;
exports.mapVoucherTypes = mapVoucherTypes;
exports.mapLedgerEntries = mapLedgerEntries;
exports.mapInventoryEntries = mapInventoryEntries;
exports.mapBillAllocations = mapBillAllocations;
exports.mapBankAllocations = mapBankAllocations;
exports.mapBatchAllocations = mapBatchAllocations;
exports.mapInventoryAccountingAllocations = mapInventoryAccountingAllocations;
exports.mapCostCentreAllocations = mapCostCentreAllocations;
const mapper_1 = require("../utils/mapper");
const tally_parsers_1 = require("../utils/tally-parsers");
function mapVoucher(raw, batchId, voucherCategory) {
    const partyAddr = (0, mapper_1.normalizeToArray)(raw.ADDRESS).map((a) => (0, mapper_1.toStringOrNull)(a.ADDRESS));
    const consigneeAddr = (0, mapper_1.normalizeToArray)(raw.BASICBUYERADDRESS).map((a) => (0, mapper_1.toStringOrNull)(a.BASICBUYERADDRESS));
    return {
        batchId,
        voucherCategory,
        tallySerial: (0, mapper_1.toStringOrNull)(raw.TALLYSERIAL),
        companyTallyId: (0, mapper_1.toStringOrNull)(raw.COMPANYID),
        companyName: (0, mapper_1.toStringOrNull)(raw.COMPANYNAME),
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        guid: (0, mapper_1.toStringOrNull)(raw.GUID),
        isCancelled: (0, mapper_1.toStringOrNull)(raw.ISCANCELLED),
        isOptional: (0, mapper_1.toStringOrNull)(raw.ISOPTIONAL),
        isPostDated: (0, mapper_1.toStringOrNull)(raw.ISPOSTDATED),
        isInvoice: (0, mapper_1.toStringOrNull)(raw.ISINVOICE),
        mainVoucherType: (0, mapper_1.toStringOrNull)(raw.MAINVOUCHERTYPENAME),
        mainVoucherTypeId: raw.MAINVOUCHERTYPENAMEID ? (0, mapper_1.toRequiredInt)(raw.MAINVOUCHERTYPENAMEID) : null,
        voucherType: (0, mapper_1.toStringOrNull)(raw.VOUCHERTYPENAME),
        voucherTypeId: raw.VOUCHERTYPENAMEID ? (0, mapper_1.toRequiredInt)(raw.VOUCHERTYPENAMEID) : null,
        voucherNumber: (0, mapper_1.toStringOrNull)(raw.VOUCHERNUMBER),
        voucherDate: (0, tally_parsers_1.parseTallyDate)((0, mapper_1.toStringOrNull)(raw.DATE)),
        reference: (0, mapper_1.toStringOrNull)(raw.REFERENCE),
        referenceDate: (0, tally_parsers_1.parseTallyDate)((0, mapper_1.toStringOrNull)(raw.REFERENCEDATE)),
        narration: (0, mapper_1.toStringOrNull)(raw.NARRATION),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        partyName: (0, mapper_1.toStringOrNull)(raw.PARTYNAME),
        partyMasterId: raw.PARTYNAMEID ? (0, mapper_1.toRequiredInt)(raw.PARTYNAMEID) : null,
        partyGstin: (0, mapper_1.toStringOrNull)(raw.PARTYGSTIN),
        partyAdd1: partyAddr[0] ?? null,
        partyAdd2: partyAddr[1] ?? null,
        partyAdd3: partyAddr[2] ?? null,
        partyAdd4: partyAddr[3] ?? null,
        partyCountry: (0, mapper_1.toStringOrNull)(raw.PARTYCOUNTRY),
        partyState: (0, mapper_1.toStringOrNull)(raw.PARTYSTATE),
        partyPincode: (0, mapper_1.toStringOrNull)(raw.PARTYPINCODE),
        partyPos: (0, mapper_1.toStringOrNull)(raw.PARTYPOS),
        consigneeName: (0, mapper_1.toStringOrNull)(raw.CONSIGNEENAME),
        consigneeMasterId: raw.CONSIGNEENAMEID ? (0, mapper_1.toRequiredInt)(raw.CONSIGNEENAMEID) : null,
        consigneeGstin: (0, mapper_1.toStringOrNull)(raw.CONSIGNEEGSTIN),
        consigneeAdd1: consigneeAddr[0] ?? null,
        consigneeAdd2: consigneeAddr[1] ?? null,
        consigneeAdd3: consigneeAddr[2] ?? null,
        consigneeAdd4: consigneeAddr[3] ?? null,
        consigneeCountry: (0, mapper_1.toStringOrNull)(raw.CONSIGNEECOUNTRY),
        consigneeState: (0, mapper_1.toStringOrNull)(raw.CONSIGNEESTATE),
        consigneePincode: (0, mapper_1.toStringOrNull)(raw.CONSIGNEEPINCODE),
    };
}
function mapVoucherType(raw, companyId) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        parent: (0, mapper_1.toStringOrNull)(raw.PARENT),
        originalName: (0, mapper_1.toStringOrNull)(raw.VOUCHERTYPEORIGNAME),
        voucherCategory: (0, mapper_1.toStringOrNull)(raw.VOUCHERCATEGORY),
        numberingMethod: (0, mapper_1.toStringOrNull)(raw.NUMBERINGMETHOD),
        prefix: (0, mapper_1.toStringOrNull)(raw.PREFIX),
        suffix: (0, mapper_1.toStringOrNull)(raw.SUFFIX),
        affectsStock: raw.AFFECTSTOCK === "Yes" ? 1 : 0,
    };
}
function mapVouchers(raw, batchId, voucherCategory) {
    return raw.map((voucher) => mapVoucher(voucher, batchId, voucherCategory));
}
function mapVoucherTypes(raw, companyId) {
    return raw.map((r) => mapVoucherType(r, companyId));
}
function mapLedgerEntries(rawList, batchId, voucherMasterId) {
    return rawList.map((raw, index) => ({
        batchId,
        voucherMasterId,
        entrySeq: index + 1,
        ledgerName: (0, mapper_1.toStringOrNull)(raw.LEDGERNAME),
        ledgerMasterId: raw.LEDGERNAMEID ? (0, mapper_1.toRequiredInt)(raw.LEDGERNAMEID) : null,
        ledgerGroup: (0, mapper_1.toStringOrNull)(raw.LEDGERGROUP),
        ledgerGroupId: raw.LEDGERGROUPID ? (0, mapper_1.toRequiredInt)(raw.LEDGERGROUPID) : null,
        ledgerType: (0, mapper_1.toStringOrNull)(raw.LEDGERTYPE),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        isDeemed: (0, mapper_1.toStringOrNull)(raw.ISDEEMED),
        isPartyLedger: (0, mapper_1.toStringOrNull)(raw.ISPARTYLEDGER),
        gstRate: (0, mapper_1.toStringOrNull)(raw.GSTRATE),
        hsnCode: (0, mapper_1.toStringOrNull)(raw.HSNCODE),
        taxType: (0, mapper_1.toStringOrNull)(raw.TAXTYPE),
        igstAmt: (0, mapper_1.toStringOrNull)(raw.IGSTAMT),
        cgstAmt: (0, mapper_1.toStringOrNull)(raw.CGSTAMT),
        sgstAmt: (0, mapper_1.toStringOrNull)(raw.SGSTAMT),
        cessAmt: (0, mapper_1.toStringOrNull)(raw.CESSAMT),
    }));
}
function mapInventoryEntries(rawList, batchId, voucherMasterId, parentEntrySeq, startingSeq = 0) {
    return rawList.map((raw, index) => ({
        batchId,
        voucherMasterId,
        entrySeq: startingSeq + index + 1,
        parentEntrySeq,
        inOut: (0, mapper_1.toStringOrNull)(raw.INOUT),
        stockItemName: (0, mapper_1.toStringOrNull)(raw.STOCKITEMNAME),
        stockItemMasterId: raw.STOCKITEMNAMEID ? (0, mapper_1.toRequiredInt)(raw.STOCKITEMNAMEID) : null,
        stockGroup: (0, mapper_1.toStringOrNull)(raw.STOCKGROUP),
        stockGroupId: raw.STOCKGROUPID ? (0, mapper_1.toRequiredInt)(raw.STOCKGROUPID) : null,
        stockCategory: (0, mapper_1.toStringOrNull)(raw.STOCKCATEGORY),
        stockCategoryId: raw.STOCKCATEGORYID ? (0, mapper_1.toRequiredInt)(raw.STOCKCATEGORYID) : null,
        actualQty: (0, mapper_1.toStringOrNull)(raw.ACTUALQTY),
        billedQty: (0, mapper_1.toStringOrNull)(raw.BILLEDQTY),
        altActualQty: (0, mapper_1.toStringOrNull)(raw.ALTACTUALQTY),
        altBilledQty: (0, mapper_1.toStringOrNull)(raw.ALTBILLEDQTY),
        rate: (0, mapper_1.toStringOrNull)(raw.RATE),
        discount: (0, mapper_1.toStringOrNull)(raw.DISCOUNT),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        gstRate: (0, mapper_1.toStringOrNull)(raw.GSTRATE),
        hsnCode: (0, mapper_1.toStringOrNull)(raw.HSNCODE),
        taxType: (0, mapper_1.toStringOrNull)(raw.TAXTYPE),
        igstAmt: (0, mapper_1.toStringOrNull)(raw.IGSTAMT),
        cgstAmt: (0, mapper_1.toStringOrNull)(raw.CGSTAMT),
        sgstAmt: (0, mapper_1.toStringOrNull)(raw.SGSTAMT),
        cessAmt: (0, mapper_1.toStringOrNull)(raw.CESSAMT),
        trackingNumber: (0, mapper_1.toStringOrNull)(raw.TRACKINGNUMBER),
        orderNumber: (0, mapper_1.toStringOrNull)(raw.ORDERNUMBER ?? raw.ORDERNO),
    }));
}
function mapBillAllocations(rawList, batchId, voucherMasterId, parentEntrySeq) {
    return rawList.map((raw) => ({
        batchId,
        voucherMasterId,
        parentEntrySeq,
        billType: (0, mapper_1.toStringOrNull)(raw.BILLTYPE),
        billName: (0, mapper_1.toStringOrNull)(raw.NAME) || (0, mapper_1.toStringOrNull)(raw.BILLNO),
        billCreditPeriod: (0, mapper_1.toStringOrNull)(raw.BILLEXPIRYPERIOD) || (0, mapper_1.toStringOrNull)(raw.BILLCREDITPERIOD),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        isDeemed: (0, mapper_1.toStringOrNull)(raw.ISDEEMED),
    }));
}
function mapBankAllocations(rawList, batchId, voucherMasterId, parentEntrySeq) {
    return rawList.map((raw) => ({
        batchId,
        voucherMasterId,
        parentEntrySeq,
        bankLedgerName: (0, mapper_1.toStringOrNull)(raw.BANKLEDGERNAME),
        transType: (0, mapper_1.toStringOrNull)(raw.TRANSTYPE),
        instrumentNumber: (0, mapper_1.toStringOrNull)(raw.INSTANTNO),
        instrumentDate: (0, mapper_1.toStringOrNull)(raw.INSTANTDATE),
        bankersDate: null,
        favouringName: (0, mapper_1.toStringOrNull)(raw.FAVOURINGNAME),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        isDeemed: (0, mapper_1.toStringOrNull)(raw.ISDEEMED),
    }));
}
function mapBatchAllocations(rawList, batchId, voucherMasterId, parentEntrySeq) {
    return rawList.map((raw) => ({
        batchId,
        voucherMasterId,
        parentEntrySeq,
        godownName: (0, mapper_1.toStringOrNull)(raw.GODOWNNAME),
        godownMasterId: raw.GODOWNNAMEID ? (0, mapper_1.toRequiredInt)(raw.GODOWNNAMEID) : null,
        batchName: (0, mapper_1.toStringOrNull)(raw.BATCHNAME),
        mfdOn: (0, mapper_1.toStringOrNull)(raw.MFDON),
        expiryPeriod: (0, mapper_1.toStringOrNull)(raw.EXPIRYPERIOD),
        actualQty: (0, mapper_1.toStringOrNull)(raw.ACTUALQTY),
        billedQty: (0, mapper_1.toStringOrNull)(raw.BILLEDQTY),
        altActualQty: (0, mapper_1.toStringOrNull)(raw.ALTACTUALQTY),
        altBilledQty: (0, mapper_1.toStringOrNull)(raw.ALTBILLEDQTY),
        batchRate: (0, mapper_1.toStringOrNull)(raw.BATCHRATE),
        batchDiscount: (0, mapper_1.toStringOrNull)(raw.BATCHDISCOUNT ?? raw.BATCHDISCOUNTPERCENTAGE),
        discountAmount: (0, mapper_1.toStringOrNull)(raw.BATCHDISCOUNTAMOUNT),
        trackingNumber: (0, mapper_1.toStringOrNull)(raw.TRACKINGNUMBER),
        orderNumber: (0, mapper_1.toStringOrNull)(raw.ORDERNO),
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
    }));
}
function mapInventoryAccountingAllocations(rawList, batchId, voucherMasterId, parentEntrySeq) {
    return rawList.map((raw) => ({
        batchId,
        voucherMasterId,
        parentEntrySeq,
        ledgerName: (0, mapper_1.toStringOrNull)(raw.LEDGERNAME),
        ledgerMasterId: raw.LEDGERNAMEID ? (0, mapper_1.toRequiredInt)(raw.LEDGERNAMEID) : null,
        amount: (0, mapper_1.toStringOrNull)(raw.AMOUNT),
        isDeemed: (0, mapper_1.toStringOrNull)(raw.ISDEEMED),
    }));
}
function mapCostCentreAllocations(rawList, batchId, voucherMasterId, parentEntryKind, parentEntrySeq) {
    const result = [];
    // These read camelCase keys (cat.CostCentreAllocations, cat.CostCategory, centre.CostCentre...)
    // which never matched: stream-parser.ts upper-cases every tag name, and the builders emit
    // CATEGORYNAME / COSTCENTRENAME rather than COSTCATEGORY / COSTCENTRE. The nested lookup
    // resolved to undefined, so this produced zero rows for every voucher.
    for (const cat of rawList) {
        const centres = (0, mapper_1.normalizeToArray)(cat.COSTCENTREALLOCATIONS);
        for (const centre of centres) {
            result.push({
                batchId,
                voucherMasterId,
                parentEntryKind,
                parentEntrySeq,
                categoryName: (0, mapper_1.toStringOrNull)(cat.CATEGORYNAME),
                categoryMasterId: cat.CATEGORYNAMEID ? (0, mapper_1.toRequiredInt)(cat.CATEGORYNAMEID) : null,
                costCentreName: (0, mapper_1.toStringOrNull)(centre.COSTCENTRENAME),
                costCentreMasterId: centre.COSTCENTRENAMEID ? (0, mapper_1.toRequiredInt)(centre.COSTCENTRENAMEID) : null,
                amount: (0, mapper_1.toStringOrNull)(centre.AMOUNT),
            });
        }
    }
    return result;
}
