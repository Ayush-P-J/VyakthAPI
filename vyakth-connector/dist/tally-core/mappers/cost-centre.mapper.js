"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCostCategories = mapCostCategories;
exports.mapCostCentres = mapCostCentres;
const tally_core_utils_1 = require("../utils/tally-core.utils");
function mapCostCategories(rawCategories, companyId) {
    return rawCategories.map((raw) => {
        return {
            companyId,
            masterId: Number((0, tally_core_utils_1.unwrapTallyValue)(raw.MASTERID)) || 0,
            alterId: Number((0, tally_core_utils_1.unwrapTallyValue)(raw.ALTERID)) || 0,
            name: String((0, tally_core_utils_1.unwrapTallyValue)(raw.NAME) || ""),
            isDeleted: 0,
        };
    });
}
function mapCostCentres(rawCentres, companyId, categoryMap, costCentreMap) {
    return rawCentres.map((raw) => {
        const parentName = (0, tally_core_utils_1.unwrapTallyValue)(raw.PARENT) ? String((0, tally_core_utils_1.unwrapTallyValue)(raw.PARENT)) : null;
        const parentId = parentName ? (costCentreMap.get(parentName) || null) : null;
        const categoryName = (0, tally_core_utils_1.unwrapTallyValue)(raw.CATEGORY) ? String((0, tally_core_utils_1.unwrapTallyValue)(raw.CATEGORY)) : null;
        const categoryId = categoryName ? (categoryMap.get(categoryName) || null) : null;
        return {
            companyId,
            masterId: Number((0, tally_core_utils_1.unwrapTallyValue)(raw.MASTERID)) || 0,
            alterId: Number((0, tally_core_utils_1.unwrapTallyValue)(raw.ALTERID)) || 0,
            name: String((0, tally_core_utils_1.unwrapTallyValue)(raw.NAME) || ""),
            costCategoryId: categoryId,
            parentCostCentreId: parentId,
            isDeleted: 0,
        };
    });
}
