"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockJournalBuilder = void 0;
const utils_1 = require("./utils");
const stockJournalBuilder = (companyName, lastAlterId, dateRange) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>StockJournalTransXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="StockJournalTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>StockJournalTransXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
  </REPORT>
  <FORM NAME="StockJournalTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>StockJournalTransXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="StockJournalTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>StockJournalTransXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>StockJournalTransXML : STKJRNL_VCHCOLL</REPEAT>
  </PART>
  <PART NAME="StockInventoryInTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>StockInventoryInTrans</TOPLINES>
   <REPEAT>StockInventoryInTrans : INVENTORYENTRIESIN</REPEAT>
  </PART>
  <PART NAME="StockInventoryOutTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>StockInventoryOutTrans</TOPLINES>
   <REPEAT>StockInventoryOutTrans : INVENTORYENTRIESOUT</REPEAT>
  </PART>
  <PART NAME="StkJrnlLedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>StkJrnlLedgerTrans</TOPLINES>
   <REPEAT>StkJrnlLedgerTrans : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="BatchAllocationsTransOut" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>BatchAllocationsTransOut</TOPLINES>
   <REPEAT>BatchAllocationsTransOut : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="BatchAllocationsTransIn" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>BatchAllocationsTransIn</TOPLINES>
   <REPEAT>BatchAllocationsTransIn : BatchAllocations</REPEAT>
  </PART>
  <LINE NAME="StockJournalTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>STKJRNL_TALLYSLNO, STKJRNL_CMPID, STKJRNL_CMPNAME, STKJRNL_MID, STKJRNL_ALTERID, STKJRNL_ISCANCEL, STKJRNL_ISOPTIONAL, STKJRNL_MAINVCHTYPE, STKJRNL_VCHTYPE, STKJRNL_VCHTYPEID, STKJRNL_VCHNo, STKJRNL_VCHDt, STKJRNL_VCHRef, STKJRNL_VCHRefDt, STKJRNL_VCHNARR, ConnectorGUID, ConnectorPostDated, ConnectorInvoice</LEFTFIELDS>
   <XMLTAG>&quot;stockjrnltrans&quot;</XMLTAG>
   <EXPLODE>StockInventoryInTrans</EXPLODE>
   <EXPLODE>StockInventoryOutTrans</EXPLODE>
   <EXPLODE>StkJrnlLedgerTrans</EXPLODE>
  </LINE>
  <LINE NAME="StockInventoryInTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>InvIn_item, InvIn_itemID, InvIn_itemGroup, InvIn_itemGroupID, InvIn_itemCategory, InvIn_itemCategoryID, InvIn_itemActualqty, InvIn_itemBilledqty, InvIn_itemAltActualqty, InvIn_itemAltBilledqty, InvIn_itemrate, InvIn_itemamount</LEFTFIELDS>
   <XMLTAG>&quot;INVENTORYENTRIESIN&quot;</XMLTAG>
   <EXPLODE>BatchAllocationsTransIn</EXPLODE>
  </LINE>
  <LINE NAME="StockInventoryOutTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>InvOut_item, InvOut_itemID, InvOut_itemGroup, InvOut_itemGroupID, InvOut_itemCategory, InvOut_itemCategoryID, InvOut_itemActualqty, InvOut_itemBilledqty, InvOut_itemAltActualqty, InvOut_itemAltBilledqty, InvOut_itemrate, InvOut_itemamount</LEFTFIELDS>
   <XMLTAG>&quot;INVENTORYENTRIESOUT&quot;</XMLTAG>
   <EXPLODE>BatchAllocationsTransOut</EXPLODE>
  </LINE>
  <LINE NAME="StkJrnlLedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>InvStk_LedgerName, InvStk_LedgerNameID, InvStk_LedgerAmt, InvStk_LedgerIsDeemed</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
  </LINE>
  <LINE NAME="BatchAllocationsTransOut" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>InvOut_GDName, InvOut_GDNameID, InvOut_BatchName, InvOut_BatchMfd, InvOut_BatchExpiry, InvOut_ActualBatchqty, InvOut_BilledBatchqty, InvOut_AltActualBatchqty, InvOut_AltBilledBatchqty, InvOut_Batchrate, InvOut_Batchamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocationsOut&quot;</XMLTAG>
  </LINE>
  <LINE NAME="BatchAllocationsTransIn" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>InvIn_GDName, InvIn_GDNameID, InvIn_BatchName, InvIn_BatchMfd, InvIn_BatchExpiry, InvIn_ActualBatchqty, InvIn_BilledBatchqty, InvIn_AltActualBatchqty, InvIn_AltBilledBatchqty, InvIn_Batchrate, InvIn_Batchamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocationsIn&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="STKJRNL_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>&quot;Stock Journal&quot;</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvOut_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvIn_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvStk_LedgerName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvStk_LedgerNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvStk_LedgerAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="InvStk_LedgerIsDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="STKJRNL_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="STKJRNL_VCHCOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : Vouchertype</TYPE>
   <CHILDOF>$$VchTypeStockJrnl</CHILDOF>
   <BELONGSTO>Yes</BELONGSTO>
   <NATIVEMETHOD>INVENTORYENTRIESIN, INVENTORYENTRIESOUT, *</NATIVEMETHOD>
   <FILTERS>NOTIsOptionalVoucher</FILTERS>
   ${lastAlterId ? '<FILTERS>DeltaSyncFilter</FILTERS>' : ''}
   ${(0, utils_1.voucherDateRangeFilterRef)(dateRange)}
  </COLLECTION>
  ${lastAlterId ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  ` : ''}
${(0, utils_1.voucherDateRangeFilterDef)(dateRange)}
<FIELD NAME="ConnectorGUID"><SET>$GUID</SET><XMLTAG>GUID</XMLTAG></FIELD>
<FIELD NAME="ConnectorPostDated"><SET>$IsPostDated</SET><XMLTAG>ISPOSTDATED</XMLTAG></FIELD>
<FIELD NAME="ConnectorInvoice"><SET>$IsInvoice</SET><XMLTAG>ISINVOICE</XMLTAG></FIELD>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE>  `;
};
exports.stockJournalBuilder = stockJournalBuilder;
