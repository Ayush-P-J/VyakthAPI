"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesDetails = salesDetails;
const mapper_1 = require("./mapper");
function salesDetails(raw) {
    return {
        discountAmount: (0, mapper_1.toStringOrNull)(raw.DISCOUNTAMOUNT),
        gstTaxableAmount: (0, mapper_1.toStringOrNull)(raw.GSTTAXABLEAMOUNT),
        gstTradeDiscount: (0, mapper_1.toStringOrNull)(raw.GSTTRADEDISCOUNT),
        vatTaxableAmount: (0, mapper_1.toStringOrNull)(raw.VATTAXABLEAMOUNT),
        vatTradeDiscount: (0, mapper_1.toStringOrNull)(raw.VATTRADEDISCOUNT),
        vatRate: (0, mapper_1.toStringOrNull)(raw.VATRATE),
        vatAmount: (0, mapper_1.toStringOrNull)(raw.VATAMOUNT),
        typeOfSupply: (0, mapper_1.toStringOrNull)(raw.TYPEOFSUPPLY),
    };
}
