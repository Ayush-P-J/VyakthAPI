"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingAccountGroupClosingBuilder = void 0;
const utils_1 = require("./utils");
/**
 * Per-group `$ClosingBalance` for the four Trading Account root groups (Sales Accounts, Purchase
 * Accounts, Direct Incomes, Direct Expenses), for a date range. This is Tally's own fully-adjusted
 * closing balance for each group — it already nets out accruals like "Purchase Bills to Come"
 * (goods received but not yet invoiced) that have no corresponding ledger or voucher row to
 * reconstruct from synced data. Verified live against a real company: this group's `Purchase
 * Accounts` closing balance matched TallyPrime's own Group Summary screen (grand total net of the
 * "Purchase Bills to Come" line) to the rupee — see docs/DATABASE.md's Gross Profit reconciliation
 * writeup for the full comparison.
 *
 * Sign convention matches the rest of the app (negative = Dr, positive = Cr): Sales
 * Accounts/Direct Incomes come back positive (Cr-natured), Purchase Accounts/Direct Expenses come
 * back negative (Dr-natured).
 *
 * `fromDate`/`toDate` must be `YYYYMMDD`, same as `stockValuationSummaryBuilder`.
 */
const tradingAccountGroupClosingBuilder = (companyName, fromDate, toDate) => {
    return `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>TradingAccountGroupClosingXML</ID>
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
<REPORT NAME="TradingAccountGroupClosingXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>TradingAccountGroupClosingXML</FORMS>
   <VARIABLES>SvFromDate, SvToDate</VARIABLES>
   <SET>SVFromDate : ##SVFROMDATE</SET>
   <SET>SVToDate : ##SVTODATE</SET>
  </REPORT>
  <FORM NAME="TradingAccountGroupClosingXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>TradingAccountGroupClosingXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="TradingAccountGroupClosingXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TradingAccountGroupClosingXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>TradingAccountGroupClosingXML : TradingAccountGroupColl</REPEAT>
  </PART>
  <LINE NAME="TradingAccountGroupClosingXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TAG_Name, TAG_Closing</LEFTFIELDS>
   <XMLTAG>&quot;TradingAccountGroup&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="TAG_Name" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TAG_Closing" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ClosingBalance</SET>
   <XMLTAG>&quot;ClosingBalance&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="TradingAccountGroupColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Group</TYPE>
   <FILTER>IsTargetGroup</FILTER>
  </COLLECTION>
  <SYSTEM TYPE="Formulae" NAME="IsTargetGroup">$Name = "Sales Accounts" OR $Name = "Purchase Accounts" OR $Name = "Direct Incomes" OR $Name = "Direct Expenses"</SYSTEM>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;
};
exports.tradingAccountGroupClosingBuilder = tradingAccountGroupClosingBuilder;
