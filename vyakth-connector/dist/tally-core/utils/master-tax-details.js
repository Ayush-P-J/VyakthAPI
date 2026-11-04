"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterTaxDetails = masterTaxDetails;
exports.withMasterTaxValues = withMasterTaxValues;
const mapper_1 = require("./mapper");
const rows = (value) => (0, mapper_1.normalizeToArray)(value);
const field = (row, key) => (0, mapper_1.toStringOrNull)(row[key]);
function masterTaxDetails(raw) {
    return {
        gst: rows(raw.GSTDETAILS).map((row) => ({
            applicableFrom: field(row, "APPLICABLEFROM"),
            calculationType: field(row, "CALCULATIONTYPE"),
            hsnDescription: field(row, "HSNDESCRIPTION"),
            hsnCode: field(row, "HSNCODE"),
            natureOfTransaction: field(row, "GSTNATUREOFTRANSACTION"),
            isNonGstGoods: field(row, "ISNONGSTGOODS"),
            isReverseChargeApplicable: field(row, "ISREVERSECHARGEAPPLICABLE"),
            natureOfGoods: field(row, "NATUREOFGOODS"),
            reportingUom: field(row, "REPORTINGUOM"),
            supplyType: field(row, "SUPPLYTYPE"),
            taxability: field(row, "TAXABILITY"),
            rates: rows(row.RATEDETAILS).map((rate) => ({
                rate: field(rate, "GSTRATE"),
                dutyHead: field(rate, "GSTRATEDUTYHEAD"),
                ratePerUnit: field(rate, "GSTRATERPERUNIT"),
                valuationType: field(rate, "GSTRATEVALUATIONTYPE"),
            })),
        })),
        hsn: rows(raw.HSNDETAILS).map((row) => ({
            applicableFrom: field(row, "APPLICABLEFROM"),
            description: field(row, "HSNDESCRIPTION"),
            code: field(row, "HSNCODE"),
        })),
        vat: rows(raw.VATDETAILS).map((row) => ({
            fromDate: field(row, "FROMDATE"),
            taxType: field(row, "TAXTYPE"),
            rate: field(row, "RATEOFVAT"),
        })),
    };
}
// Keep existing snapshot fields populated when the XML uses nested tax histories.
function withMasterTaxValues(raw) {
    const details = masterTaxDetails(raw);
    const gst = details.gst.at(-1);
    const hsn = details.hsn.at(-1);
    const rate = gst?.rates.find((row) => /integrated|igst/i.test(row.dutyHead ?? ""));
    const cess = gst?.rates.find((row) => /cess/i.test(row.dutyHead ?? ""));
    return {
        ...raw,
        HSN: raw.HSN ?? hsn?.code ?? gst?.hsnCode,
        APPLICABLEFROM: raw.APPLICABLEFROM ?? gst?.applicableFrom ?? hsn?.applicableFrom,
        TAXABILITY: raw.TAXABILITY ?? gst?.taxability,
        GSTRATE: raw.GSTRATE ?? rate?.rate,
        CESSRATE: raw.CESSRATE ?? cess?.rate,
        GSTSUPPLYTYPE: raw.GSTSUPPLYTYPE ?? gst?.supplyType,
    };
}
