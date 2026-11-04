"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherDateCountBuilder = exports.VOUCHER_TYPE_SYSTEM_VARS = void 0;
const utils_1 = require("./utils");
// Maps our voucherConfigs `name` (electron/services/sync/voucher-sync.service.ts) to the
// same Tally $$VchType... system variable each corresponding full builder already scopes to.
exports.VOUCHER_TYPE_SYSTEM_VARS = {
    Contra: "$$VchTypeContra",
    CreditNote: "$$VchTypeCreditNote",
    DebitNote: "$$VchTypeDebitNote",
    DeliveryNote: "$$VchTypeDelNote",
    Journal: "$$VchTypeJournal",
    Payment: "$$VchTypePayment",
    Purchase: "$$VchTypePurchase",
    PurchaseOrder: "$$VchTypePurcOrder",
    Receipt: "$$VchTypeReceipt",
    ReceiptNote: "$$VchTypeRcptNote",
    Sales: "$$VchTypeSales",
    SalesOrder: "$$VchTypeSalesOrder",
    StockJournal: "$$VchTypeStockJrnl",
    PhysicalStock: "$$VchTypePhysStock",
};
/**
 * Lightweight report returning one row per voucher — just its $Date, nothing else — for one
 * voucher type across a date range. No ledger/inventory/bill/bank data is fetched, so each row
 * is a few bytes instead of a full voucher's worth of nested XML. The caller aggregates rows
 * into (date, count) buckets in TypeScript. Used to compute adaptively-sized date batches for
 * the initial historical pull, so a single Tally request never has to build a full-voucher
 * response covering an unbounded number of vouchers regardless of how volume is distributed
 * across the calendar.
 *
 * Deliberately NOT using Tally's native BY/AGGRCOMPUTE collection aggregation: live testing
 * showed a SOURCECOLLECTION-derived aggregation collection does not reliably honor the
 * REPORT-level SVFromDate/SVToDate period scope (single-day ranges worked, multi-day ranges
 * silently returned dates outside the requested window). REPEATing directly over the base
 * "Vouchers : VoucherType" collection — exactly like every other voucher builder does — is the
 * pattern confirmed to work. Date scoping, when a range is given, comes from
 * `voucherDateRangeFilterRef`/`Def` (see ./utils), NOT from SVFromDate/SVToDate, which do not
 * restrict these collections at all.
 *
 * The collection mirrors the real voucher builders attribute-for-attribute, and `<BELONGSTO>Yes`
 * in particular is load-bearing: without it, CHILDOF matches only vouchers whose type is
 * *literally* named "Sales"/"Purchase"/etc., and companies that file everything under custom
 * voucher types ("Gst Sales", "Purchase Gst", "CASH PAYMENT", ...) count as zero — which made
 * the planner skip those types entirely while the real builders happily fetched them.
 *
 * `dateRange` is optional, and omitting it is the normal case for planning: the defaults below
 * are copied verbatim from the full voucher builders (see sales.builder.ts) and let *Tally*
 * resolve the company's real history window itself at query time. That's deliberate — our own
 * `companies.booksFrom`/`financialYearFrom` columns proved unreliable as a history-span source
 * (they resolve to the current financial year, so date windows derived from them found zero
 * vouchers), whereas these system-variable expressions are the mechanism the working voucher
 * pull has always used.
 */
const voucherDateCountBuilder = (companyName, voucherTypeSystemVar, dateRange) => {
    const uid = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const reportName = `VoucherDateCountReport_${uid}`;
    const formName = `VoucherDateCountForm_${uid}`;
    const partName = `VoucherDateCountPart_${uid}`;
    const lineName = `VoucherDateCountLine_${uid}`;
    const dateFieldName = `DateField_${uid}`;
    const baseCollName = `VoucherDateCountBase_${uid}`;
    return `
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>${reportName}</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<REPORT NAME="${reportName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>${formName}</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
</REPORT>
<FORM NAME="${formName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>${partName}</TOPPARTS>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
</FORM>
<PART NAME="${partName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>${lineName}</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <REPEAT>${lineName} : ${baseCollName}</REPEAT>
</PART>
<LINE NAME="${lineName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>${dateFieldName}</LEFTFIELDS>
   <XMLTAG>&quot;row&quot;</XMLTAG>
</LINE>
<FIELD NAME="${dateFieldName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;DATEVALUE&quot;</XMLTAG>
</FIELD>
<COLLECTION NAME="${baseCollName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>${voucherTypeSystemVar}</CHILDOF>
   <BELONGSTO>Yes</BELONGSTO>
   ${(0, utils_1.voucherDateRangeFilterRef)(dateRange)}
</COLLECTION>
${(0, utils_1.voucherDateRangeFilterDef)(dateRange)}
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>
`;
};
exports.voucherDateCountBuilder = voucherDateCountBuilder;
