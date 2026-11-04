"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapStockGroup = mapStockGroup;
exports.resolveEffectiveStockGroupGst = resolveEffectiveStockGroupGst;
exports.resolveEffectiveStockGroupCostingMethod = resolveEffectiveStockGroupCostingMethod;
exports.mapStockCategory = mapStockCategory;
exports.mapUnit = mapUnit;
exports.mapGodown = mapGodown;
exports.mapStockItem = mapStockItem;
exports.mapStockGroups = mapStockGroups;
exports.mapStockCategories = mapStockCategories;
exports.mapUnits = mapUnits;
exports.mapGodowns = mapGodowns;
exports.mapStockItems = mapStockItems;
exports.mapStockItemValuation = mapStockItemValuation;
exports.mapBoms = mapBoms;
const mapper_1 = require("../utils/mapper");
function mapStockGroup(raw, companyId, map) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        parentGroupId: raw.PARENT ? (map.get(raw.PARENT) ?? null) : null,
        hsnCode: (0, mapper_1.toStringOrNull)(raw.HSN),
        hsnApplicableFrom: (0, mapper_1.toStringOrNull)(raw.APPLICABLEFROM),
        taxability: (0, mapper_1.toStringOrNull)(raw.TAXABILITY),
        gstRate: raw.GSTRATE ? (0, mapper_1.toInt)(raw.GSTRATE) : null,
        cessRate: raw.CESSRATE ? (0, mapper_1.toInt)(raw.CESSRATE) : null,
        gstSupplyType: (0, mapper_1.toStringOrNull)(raw.GSTSUPPLYTYPE),
        costingMethod: (0, mapper_1.toStringOrNull)(raw.COSTINGMETHOD),
    };
}
const EMPTY_GST_DETAILS = {
    hsnCode: null,
    hsnApplicableFrom: null,
    taxability: null,
    gstRate: null,
    cessRate: null,
    gstSupplyType: null,
};
/**
 * A stock item that doesn't override GST/HSN itself inherits it from its Stock Group (Tally
 * leaves $HSNDETAILS/$GSTDETAILS blank on the item in that case) — and a group can itself
 * inherit from its own parent group. Resolves each group's *effective* GST/HSN by walking up
 * the PARENT chain field-by-field (a group can override just the HSN code but not the GST rate,
 * for instance), memoized per group id since many items/groups share the same ancestor chain.
 */
function resolveEffectiveStockGroupGst(stockGroups) {
    const byId = new Map(stockGroups.map((g) => [g.id, g]));
    const resolved = new Map();
    const resolve = (id) => {
        const cached = resolved.get(id);
        if (cached)
            return cached;
        const group = byId.get(id);
        const parent = group?.parentGroupId != null ? resolve(group.parentGroupId) : EMPTY_GST_DETAILS;
        const details = {
            hsnCode: group?.hsnCode ?? parent.hsnCode,
            hsnApplicableFrom: group?.hsnApplicableFrom ?? parent.hsnApplicableFrom,
            taxability: group?.taxability ?? parent.taxability,
            gstRate: group?.gstRate ?? parent.gstRate,
            cessRate: group?.cessRate ?? parent.cessRate,
            gstSupplyType: group?.gstSupplyType ?? parent.gstSupplyType,
        };
        resolved.set(id, details);
        return details;
    };
    for (const g of stockGroups)
        resolve(g.id);
    return resolved;
}
/**
 * A stock group's valuation method ("FIFO", "Last Sale Price", ...) can itself be "Default",
 * meaning "inherit from parent group" — walks up the PARENT chain (same shape as
 * resolveEffectiveStockGroupGst) until it finds a group with a real method set, or returns null
 * if nothing in the chain overrides it (Tally's own ultimate fallback then applies).
 */
function resolveEffectiveStockGroupCostingMethod(stockGroups) {
    const byId = new Map(stockGroups.map((g) => [g.id, g]));
    const resolved = new Map();
    const ownMethod = (method) => method && method !== "Default" ? method : null;
    const resolve = (id) => {
        if (resolved.has(id))
            return resolved.get(id) ?? null;
        const group = byId.get(id);
        const own = ownMethod(group?.costingMethod);
        const value = own ?? (group?.parentGroupId != null ? resolve(group.parentGroupId) : null);
        resolved.set(id, value);
        return value;
    };
    for (const g of stockGroups)
        resolve(g.id);
    return resolved;
}
function mapStockCategory(raw, companyId, map) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        parentCategoryId: raw.PARENT ? (map.get(raw.PARENT) ?? null) : null,
    };
}
function mapUnit(raw, companyId) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        formalName: (0, mapper_1.toStringOrNull)(raw.FORMALNAME),
        uqc: (0, mapper_1.toStringOrNull)(raw.UQC),
        decimalPlaces: (0, mapper_1.toRequiredInt)(raw.DECIMALPLACES),
    };
}
function mapGodown(raw, companyId, map) {
    return {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        parentGodownId: raw.PARENT ? (map.get(raw.PARENT) ?? null) : null,
    };
}
function mapStockItem(raw, companyId, lookups) {
    const openingBills = (0, mapper_1.normalizeToArray)(raw.OPENINGBALANCELIST).map((b) => {
        const dynamicBill = b;
        return {
            godownId: b.GODOWNNAME ? (lookups.godownMap.get(b.GODOWNNAME) ?? null) : null,
            batchName: (0, mapper_1.toStringOrNull)(b.BATCHNAME),
            manufacturedOn: (0, mapper_1.toStringOrNull)(b.MANUFACTURINGDATE),
            expiryDate: (0, mapper_1.toStringOrNull)(b.EXPIRYDATE),
            openingBalance: (0, mapper_1.toRequiredInt)(b.OPENINGBALANCE),
            altOpeningBalance: dynamicBill.ALTOPENINGBALANCE
                ? (0, mapper_1.toInt)(dynamicBill.ALTOPENINGBALANCE)
                : null,
            openingRate: b.OPENINGRATE ? (0, mapper_1.toInt)(b.OPENINGRATE) : null,
            openingValue: b.OPENINGVALUE ? (0, mapper_1.toInt)(b.OPENINGVALUE) : null,
        };
    });
    const stockGroupId = raw.PARENT ? (lookups.stockGroupMap.get(raw.PARENT) ?? null) : null;
    // Tally leaves the item's own $HSNDETAILS/$GSTDETAILS blank when it's set to inherit from its
    // Stock Group rather than overriding them itself — fall back to the group's resolved
    // (already-walked-up-its-own-parent-chain) GST/HSN in that case, field by field.
    const inheritedGst = stockGroupId != null ? lookups.effectiveGstByGroupId.get(stockGroupId) : undefined;
    // Same "blank/'Default' means inherit" rule as GST/HSN above, but for the valuation method.
    const ownCostingMethod = (0, mapper_1.toStringOrNull)(raw.COSTINGMETHOD);
    const costingMethod = (ownCostingMethod && ownCostingMethod !== "Default" ? ownCostingMethod : null) ??
        (stockGroupId != null ? (lookups.effectiveCostingMethodByGroupId.get(stockGroupId) ?? null) : null);
    const item = {
        companyId,
        masterId: (0, mapper_1.toRequiredInt)(raw.MASTERID),
        alterId: (0, mapper_1.toRequiredInt)(raw.ALTERID),
        name: (0, mapper_1.toStringOrNull)(raw.NAME) || "",
        alias: (0, mapper_1.toStringOrNull)(raw.ONLYALIAS),
        partNumber: (0, mapper_1.toStringOrNull)(raw.PARTNUMBER),
        stockGroupId,
        stockCategoryId: raw.CATEGORY ? (lookups.categoryMap.get(raw.CATEGORY) ?? null) : null,
        baseUnitId: raw.BASEUNITS ? (lookups.unitMap.get(raw.BASEUNITS) ?? null) : null,
        additionalUnitId: raw.ADDITIONALUNITS ? (lookups.unitMap.get(raw.ADDITIONALUNITS) ?? null) : null,
        conversion: raw.CONVERSION ? (0, mapper_1.toInt)(raw.CONVERSION) : null,
        denominator: raw.DENOMINATOR ? (0, mapper_1.toInt)(raw.DENOMINATOR) : null,
        hsnCode: (0, mapper_1.toStringOrNull)(raw.HSN) ?? inheritedGst?.hsnCode ?? null,
        hsnApplicableFrom: (0, mapper_1.toStringOrNull)(raw.APPLICABLEFROM) ?? inheritedGst?.hsnApplicableFrom ?? null,
        taxability: (0, mapper_1.toStringOrNull)(raw.TAXABILITY) ?? inheritedGst?.taxability ?? null,
        gstRate: (raw.GSTRATE ? (0, mapper_1.toInt)(raw.GSTRATE) : null) ?? inheritedGst?.gstRate ?? null,
        cessRate: (raw.CESSRATE ? (0, mapper_1.toInt)(raw.CESSRATE) : null) ?? inheritedGst?.cessRate ?? null,
        gstSupplyType: (0, mapper_1.toStringOrNull)(raw.GSTSUPPLYTYPE) ?? inheritedGst?.gstSupplyType ?? null,
        reorderLevel: raw.REORDERLEVEL ? (0, mapper_1.toInt)(raw.REORDERLEVEL) : null,
        minimumLevel: raw.MINIMUMLEVEL ? (0, mapper_1.toInt)(raw.MINIMUMLEVEL) : null,
        maximumLevel: raw.MAXIMUMLEVEL ? (0, mapper_1.toInt)(raw.MAXIMUMLEVEL) : null,
        openingBalance: (0, mapper_1.toRequiredInt)(raw.OPENINGBALANCE),
        altOpeningBalance: raw.ALTOPENINGBALANCE ? (0, mapper_1.toInt)(raw.ALTOPENINGBALANCE) : null,
        openingRate: raw.OPENINGRATE ? (0, mapper_1.toInt)(raw.OPENINGRATE) : null,
        openingValue: raw.OPENINGVALUE ? (0, mapper_1.toInt)(raw.OPENINGVALUE) : null,
        openingBills,
        costingMethod,
    };
    return item;
}
function mapStockGroups(raw, companyId, map) {
    return raw.map((r) => mapStockGroup(r, companyId, map));
}
function mapStockCategories(raw, companyId, map) {
    return raw.map((r) => mapStockCategory(r, companyId, map));
}
function mapUnits(raw, companyId) {
    return raw.map((r) => mapUnit(r, companyId));
}
function mapGodowns(raw, companyId, map) {
    return raw.map((r) => mapGodown(r, companyId, map));
}
function mapStockItems(raw, companyId, lookups) {
    return raw.map((r) => mapStockItem(r, companyId, lookups));
}
/**
 * Tally's raw export reports asset/stock values as negative for $TBalOpening/$TBalClosing (same
 * quirk documented + flipped in financial-snapshot-sync.service.ts's toPositiveAmount) — flip
 * those to a normal positive value.
 */
const toPositiveAmount = (raw) => {
    if (raw === undefined || raw === "")
        return 0;
    return -Number(raw) || 0;
};
function mapStockItemValuation(raw, companyId, stockItemId) {
    return {
        companyId,
        stockItemId,
        openingValue: toPositiveAmount(raw.OPENINGVALUE),
        closingValue: toPositiveAmount(raw.CLOSINGVALUE),
    };
}
function mapBoms(rawItems, companyId, lookups) {
    const boms = [];
    for (const raw of rawItems) {
        if (raw.MULTICOMPONENTLIST) {
            const rawBoms = (0, mapper_1.normalizeToArray)(raw.MULTICOMPONENTLIST);
            for (const rawBom of rawBoms) {
                if (!rawBom.COMPONENTLISTNAME)
                    continue;
                const parentId = lookups.stockItemMasterIdMap.get((0, mapper_1.toRequiredInt)(raw.MASTERID));
                if (!parentId)
                    continue;
                const bom = {
                    companyId,
                    stockItemId: parentId,
                    name: (0, mapper_1.toStringOrNull)(rawBom.COMPONENTLISTNAME) || "",
                    baseQty: (0, mapper_1.toStringOrNull)(rawBom.COMPONENTBASICQTY) || "1",
                    isDeleted: 0,
                };
                const components = [];
                if (rawBom.MULTICOMPONENTITEMLIST) {
                    const rawComps = (0, mapper_1.normalizeToArray)(rawBom.MULTICOMPONENTITEMLIST);
                    for (const rawComp of rawComps) {
                        if (!rawComp.STOCKITEMNAME)
                            continue;
                        const compStockItemId = lookups.stockItemNameMap.get(rawComp.STOCKITEMNAME);
                        if (!compStockItemId)
                            continue;
                        components.push({
                            companyId,
                            stockItemId: compStockItemId,
                            godownId: rawComp.GODOWNNAME ? (lookups.godownMap.get(rawComp.GODOWNNAME) || null) : null,
                            qty: (0, mapper_1.toStringOrNull)(rawComp.ACTUALQTY) || "0",
                            type: "Component",
                            isDeleted: 0,
                        });
                    }
                }
                boms.push({ bom, components });
            }
        }
    }
    return boms;
}
