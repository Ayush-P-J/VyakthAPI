"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockItemBalanceBuilder = void 0;
const utils_1 = require("./utils");
/**
 * Per-stock-item closing value — `$MasterID`/`$Name` plus `$TBalOpening`/`$TBalClosing` (the same
 * T-Balance mechanism `stockvaluationsummary.builder.ts` uses, so it already respects each stock
 * group's configured valuation method), and nothing else. `fromDate`/`toDate` must be `YYYYMMDD`,
 * wired the same way `stockValuationSummaryBuilder` wires `SVFROMDATE`/`SVTODATE` — call with
 * `company.booksFrom` → today for a "closing balance as of now" pull.
 *
 * Deliberately minimal, after two rounds of real crashes on a live TallyPrime instance with a
 * richer version of this request:
 *   1. A per-(Godown, Batch) nested breakdown via a `<COLLECTION><TYPE>Batch</TYPE>
 *      <CHILDOF>#MBI_ItemBalName</CHILDOF>` construct — Batch isn't a real top-level collection
 *      type walkable this way, and it crashed Tally outright.
 *   2. Even item-level-only, a version with ~15 extra fields ($StandardCost, $LastPurcCost/Date/
 *      Party/Price, $LastSaleDate/Price, $AvgPurcCost/Price, $AvgSalePrice, $SODue, $PODue, plus
 *      several `$$BaseValue:$TBalX/$StkX` rate-division expressions) crashed/hung Tally too, most
 *      likely the $Avg* fields — averaging a whole item's transaction history, repeated across
 *      ~6,750 items, is real work Tally has to do per row.
 * `$ClosingBalance` (closing quantity, e.g. "79488.805 KGS") was added on 2026-10-29 after a live
 * check: all 6,752 items of a real company in 0.3s with Tally staying responsive. Do not add
 * other fields without verifying each addition against a disposable/test Tally company first.
 */
const stockItemBalanceBuilder = (companyName, fromDate, toDate) => {
    return `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>ItemBalanceXML</ID>
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
<REPORT NAME="ItemBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>ItemBalanceXML</FORMS>
   <VARIABLES>SvFromDate, SvToDate</VARIABLES>
   <SET>SVFromDate : ##SVFROMDATE</SET>
   <SET>SVToDate : ##SVTODATE</SET>
  </REPORT>
  <FORM NAME="ItemBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>ItemBalanceXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="ItemBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>ItemBalanceXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>ItemBalanceXML : ItemBalanceXMLColl</REPEAT>
  </PART>
  <LINE NAME="ItemBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_ItemBalID, MBI_ItemBalName, MBI_ItemBalOpValue, MBI_ItemBalClValue, MBI_ItemBalClQty</LEFTFIELDS>
   <XMLTAG>&quot;StockBalance&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_ItemBalID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemBalName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemBalOpValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalOpening</SET>
   <XMLTAG>&quot;OpeningValue&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemBalClValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalClosing</SET>
   <XMLTAG>&quot;ClosingValue&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemBalClQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyField</USE>
   <SET>$ClosingBalance</SET>
   <XMLTAG>&quot;ClosingQty&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="ItemBalanceXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>StockItem</TYPE>
  </COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;
};
exports.stockItemBalanceBuilder = stockItemBalanceBuilder;
