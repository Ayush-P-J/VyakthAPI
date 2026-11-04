"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockValuationSummaryBuilder = void 0;
const utils_1 = require("./utils");
/**
 * Per-stock-item opening/closing value for a date range, using Tally's own `$TBalOpening`/
 * `$TBalClosing` (the same T-Balance mechanism Tally's native Balance Sheet uses for its
 * "Closing Stock" line — verified live: summing `ClosingValue` here across all items reproduced
 * the Balance Sheet's Closing Stock figure exactly). Deliberately minimal — only the two value
 * fields, since this exists purely to sum a COGS input, not to show a per-item report.
 *
 * `fromDate`/`toDate` must be `YYYYMMDD`. Unlike `SVFROMDATE` on a raw voucher `<COLLECTION>`
 * (which does nothing — see `voucherDateRangeFilterDef` in utils.ts), this report-level
 * `SVFromDate`/`SVToDate` (wired via `##SVFROMDATE`/`##SVTODATE`) does correctly scope the
 * `$TBalOpening`/`$TBalClosing` computation — confirmed against a live TallyPrime instance.
 */
const stockValuationSummaryBuilder = (companyName, fromDate, toDate) => {
    return `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>StockValuationSummaryXML</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
<SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
<SVTODATE TYPE="Date">${toDate}</SVTODATE>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<REPORT NAME="StockValuationSummaryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>StockValuationSummaryXML</FORMS>
   <VARIABLES>SvFromDate, SvToDate</VARIABLES>
   <SET>SVFromDate : ##SVFROMDATE</SET>
   <SET>SVToDate : ##SVTODATE</SET>
  </REPORT>
  <FORM NAME="StockValuationSummaryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>StockValuationSummaryXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="StockValuationSummaryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>StockValuationSummaryXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>StockValuationSummaryXML : StockValuationXMLColl</REPEAT>
  </PART>
  <LINE NAME="StockValuationSummaryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>SVS_OpeningValue, SVS_ClosingValue</LEFTFIELDS>
   <XMLTAG>&quot;StockValuation&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="SVS_OpeningValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalOpening</SET>
   <XMLTAG>&quot;OpeningValue&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="SVS_ClosingValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalClosing</SET>
   <XMLTAG>&quot;ClosingValue&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="StockValuationXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>StockItem</TYPE>
  </COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;
};
exports.stockValuationSummaryBuilder = stockValuationSummaryBuilder;
