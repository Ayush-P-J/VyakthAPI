"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeVoucherRecord = composeVoucherRecord;
const tally_core_utils_1 = require("./tally-core/utils/tally-core.utils");
const mapper_1 = require("./tally-core/utils/mapper");
const voucher_mapper_1 = require("./tally-core/mappers/voucher.mapper");
const sales_details_1 = require("./tally-core/utils/sales-details");
const rawName = (value) => (0, tally_core_utils_1.unwrapTallyValue)(value);
const mapVoucherCostAllocations = (raw, voucherMasterId, parentEntryKind, parentEntrySeq) => (0, voucher_mapper_1.mapCostCentreAllocations)(raw, 0, voucherMasterId, parentEntryKind, parentEntrySeq).map(({ categoryName, categoryMasterId, ...allocation }) => ({
    ...allocation,
    // Backend voucher ingestion resolves these contract names against cost-categories.
    costCategoryName: categoryName,
    costCategoryMasterId: categoryMasterId,
}));
function composeVoucherRecord(raw, voucherCategory) {
    const voucherMasterId = (0, mapper_1.toRequiredInt)(raw.MASTERID);
    const base = (0, voucher_mapper_1.mapVoucher)(raw, 0, voucherCategory);
    const rawLedgers = (0, tally_core_utils_1.ensureArray)(raw.LEDGERENTRIES).filter((l) => rawName(l.LEDGERNAME) || Number(rawName(l.LEDGERNAMEID))).map((ledger) => ({ ...ledger }));
    for (const bill of (0, tally_core_utils_1.ensureArray)(raw.BILLALLOCATIONS)) {
        const billLedgerId = (0, mapper_1.toStringOrNull)(bill.LEDGERNAMEID);
        const billLedgerName = (0, mapper_1.toStringOrNull)(bill.LEDGERNAME);
        const matches = rawLedgers.filter((ledger) => billLedgerId && Number(billLedgerId) > 0
            ? (0, mapper_1.toStringOrNull)(ledger.LEDGERNAMEID) === billLedgerId
            : billLedgerName && (0, mapper_1.toStringOrNull)(ledger.LEDGERNAME) === billLedgerName);
        if (matches.length !== 1)
            throw new Error(`Voucher ${voucherMasterId}: bill allocation has no unique ledger`);
        const ledger = matches[0];
        ledger.BILLALLOCATIONS = [...(0, tally_core_utils_1.ensureArray)(ledger.BILLALLOCATIONS), bill];
    }
    if (!Number.isSafeInteger(voucherMasterId) ||
        voucherMasterId <= 0 ||
        !Number.isSafeInteger(base.alterId) ||
        base.alterId < 0)
        throw new Error("Invalid Tally voucher identity");
    const mappedLedgerEntries = (0, voucher_mapper_1.mapLedgerEntries)(rawLedgers, 0, voucherMasterId);
    // Journal vouchers can carry stock movements nested under a ledger entry
    // (InventoryAllocations -> BatchAllocations); this counter keeps entrySeq globally unique
    // across every ledger entry's inventory allocations within this voucher, same as h7001.
    let journalInvEntrySeq = 0;
    const ledgerEntries = rawLedgers.map((l, idx) => {
        const entrySeq = idx + 1;
        const rawBillAllocations = (0, tally_core_utils_1.ensureArray)(l.BILLALLOCATIONS);
        const namedBillAllocations = rawBillAllocations.filter((bill) => (0, mapper_1.toStringOrNull)(bill.NAME) || (0, mapper_1.toStringOrNull)(bill.BILLNO));
        const omittedUnnamedBills = rawBillAllocations.length - namedBillAllocations.length;
        if (omittedUnnamedBills)
            console.warn(`[Sync] Voucher ${voucherMasterId}: omitted ${omittedUnnamedBills} bill allocation(s) with no bill name or bill number`);
        const billAllocations = (0, voucher_mapper_1.mapBillAllocations)(namedBillAllocations, 0, voucherMasterId, entrySeq);
        const bankAllocations = l.BANKALLOCATIONS
            ? (0, voucher_mapper_1.mapBankAllocations)((0, tally_core_utils_1.ensureArray)(l.BANKALLOCATIONS), 0, voucherMasterId, entrySeq)
            : [];
        const costCentreAllocations = l.COSTCATEGORYALLOCATIONS
            ? mapVoucherCostAllocations((0, tally_core_utils_1.ensureArray)(l.COSTCATEGORYALLOCATIONS), voucherMasterId, "ledger", entrySeq)
            : [];
        let inventoryAllocations = [];
        if (l.INVENTORYALLOCATIONS) {
            const rawJournalInv = (0, tally_core_utils_1.ensureArray)(l.INVENTORYALLOCATIONS);
            const mappedJournalInv = (0, voucher_mapper_1.mapInventoryEntries)(rawJournalInv, 0, voucherMasterId, entrySeq, journalInvEntrySeq);
            inventoryAllocations = rawJournalInv.map((invItem, invIdx) => ({
                ...mappedJournalInv[invIdx],
                ...(0, sales_details_1.salesDetails)(invItem),
                accountingAllocations: (0, tally_core_utils_1.ensureArray)(invItem.ACCOUNTINGALLOCATIONS).map((a) => ({
                    ...(0, voucher_mapper_1.mapInventoryAccountingAllocations)([a], 0, voucherMasterId, journalInvEntrySeq + invIdx + 1)[0],
                    costCentreAllocations: a.COSTCATEGORYALLOCATIONS
                        ? mapVoucherCostAllocations((0, tally_core_utils_1.ensureArray)(a.COSTCATEGORYALLOCATIONS), voucherMasterId, "inventoryAccounting", journalInvEntrySeq + invIdx + 1)
                        : [],
                })),
                batchAllocations: invItem.BATCHALLOCATIONS
                    ? (0, voucher_mapper_1.mapBatchAllocations)((0, tally_core_utils_1.ensureArray)(invItem.BATCHALLOCATIONS), 0, voucherMasterId, journalInvEntrySeq + invIdx + 1)
                    : [],
            }));
            journalInvEntrySeq += rawJournalInv.length;
        }
        return {
            ...mappedLedgerEntries[idx],
            ...(0, sales_details_1.salesDetails)(l),
            billAllocations,
            bankAllocations,
            costCentreAllocations,
            inventoryAllocations,
        };
    });
    // Stock journals encode direction in the element name (INVENTORYENTRIESIN/OUT, each with its
    // own BATCHALLOCATIONSIN/OUT child) instead of INVENTORYENTRIES + an INOUT field — normalise
    // both shapes into the common one mapInventoryEntries expects, same as processMicroBatch.
    const withDirection = (entries, suffix, inOut) => (0, tally_core_utils_1.ensureArray)(entries).map((entry) => ({
        ...entry,
        INOUT: inOut,
        BATCHALLOCATIONS: entry[`BATCHALLOCATIONS${suffix}`] ?? entry.BATCHALLOCATIONS,
    }));
    const rawInventory = [
        ...(0, tally_core_utils_1.ensureArray)(raw.INVENTORYENTRIES),
        ...withDirection(raw.INVENTORYENTRIESIN, "IN", "In"),
        ...withDirection(raw.INVENTORYENTRIESOUT, "OUT", "Out"),
    ];
    const mappedInventoryEntries = (0, voucher_mapper_1.mapInventoryEntries)(rawInventory, 0, voucherMasterId, null);
    const inventoryEntries = rawInventory.map((inv, idx) => {
        const entrySeq = idx + 1;
        const batchAllocations = inv.BATCHALLOCATIONS
            ? (0, voucher_mapper_1.mapBatchAllocations)((0, tally_core_utils_1.ensureArray)(inv.BATCHALLOCATIONS), 0, voucherMasterId, entrySeq)
            : [];
        let accountingAllocations = [];
        if (inv.ACCOUNTINGALLOCATIONS) {
            const rawAcc = (0, tally_core_utils_1.ensureArray)(inv.ACCOUNTINGALLOCATIONS);
            const mappedAcc = (0, voucher_mapper_1.mapInventoryAccountingAllocations)(rawAcc, 0, voucherMasterId, entrySeq);
            accountingAllocations = rawAcc.map((acc, i) => ({
                ...mappedAcc[i],
                costCentreAllocations: acc.COSTCATEGORYALLOCATIONS
                    ? mapVoucherCostAllocations((0, tally_core_utils_1.ensureArray)(acc.COSTCATEGORYALLOCATIONS), voucherMasterId, "inventoryAccounting", entrySeq)
                    : [],
            }));
        }
        return {
            ...mappedInventoryEntries[idx],
            ...(0, sales_details_1.salesDetails)(inv),
            batchAllocations,
            accountingAllocations,
        };
    });
    return {
        ...base,
        basicBuyersSalesTaxNo: (0, mapper_1.toStringOrNull)(raw.BASICBUYERSSALESTAXNO),
        ledgerEntries,
        inventoryEntries,
    };
}
