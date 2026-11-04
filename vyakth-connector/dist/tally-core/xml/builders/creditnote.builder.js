"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditnoteBuilder = void 0;
const utils_1 = require("./utils");
const creditnoteBuilder = (companyName, lastAlterId, dateRange) => {
    return `
<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>InvCreditNoteTransXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="InvCreditNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>InvCreditNoteTransXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
  </REPORT>
  <FORM NAME="InvCreditNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>InvCreditNoteTransXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="InvCreditNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>InvCreditNoteTransXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>InvCreditNoteTransXML : Crnote_VCHCREDITNOTECOLL</REPEAT>
  </PART>
  <PART NAME="Crnote_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_InventoryTrans</TOPLINES>
   <REPEAT>Crnote_InventoryTrans : InventoryEntries</REPEAT>
  </PART>
  <PART NAME="Crnote_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_LedgerTrans</TOPLINES>
   <REPEAT>Crnote_LedgerTrans : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="Crnote_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_AccountingAllocTrans</TOPLINES>
   <REPEAT>Crnote_AccountingAllocTrans : AccountingAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_BatchAllocationsTrans</TOPLINES>
   <REPEAT>Crnote_BatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_AccAllocDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_AccAllocDtlsCostCategory</TOPLINES>
   <REPEAT>Crnote_AccAllocDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_RepDtlsCostCategory</TOPLINES>
   <REPEAT>Crnote_RepDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_AccTransInventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_AccTransInventoryTrans</TOPLINES>
   <REPEAT>Crnote_AccTransInventoryTrans : InventoryAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_RepDtlsCostCentre</TOPLINES>
   <REPEAT>Crnote_RepDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_AccAllocDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_AccAllocDtlsCostCentre</TOPLINES>
   <REPEAT>Crnote_AccAllocDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_AccTransBatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_AccTransBatchAllocationsTrans</TOPLINES>
   <REPEAT>Crnote_AccTransBatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="Crnote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_PartyAddressXML</TOPLINES>
   <REPEAT>Crnote_PartyAddressXML : Address</REPEAT>
  </PART>
  <PART NAME="Crnote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Crnote_BuyerAddressXML</TOPLINES>
   <REPEAT>Crnote_BuyerAddressXML : BasicBuyerAddress</REPEAT>
  </PART>
  <LINE NAME="InvCreditNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_TALLYSLNO, Crnote_CMPID, Crnote_CMPNAME, Crnote_MID, Crnote_ALTERID, Crnote_ISCANCEL, Crnote_ISOPTIONAL, Crnote_MAINVCHTYPE, Crnote_MAINVCHTYPEID, Crnote_VCHTYPE, Crnote_VCHTYPEID, Crnote_VCHNo, Crnote_VCHDt, Crnote_VCHRef, Crnote_VCHRefDt, Crnote_VCHNARR, Crnote_VCHAMOUNT, Crnote_PartyName, Crnote_PartyNameID, Crnote_PartyGSTIN, Crnote_PartyPinCode, Crnote_PartyCountry, Crnote_PartyState, Crnote_PartyPOS, Crnote_ConsigneeName, Crnote_ConsigneeNameID, Crnote_ConsigneeGSTIN, Crnote_ConsigneePinCode, Crnote_ConsigneeCountry, Crnote_ConsigneeState, ConnectorGUID, ConnectorPostDated, ConnectorInvoice</LEFTFIELDS>
   <EXPLODE>Crnote_PartyAddressXML</EXPLODE>
   <EXPLODE>Crnote_BuyerAddressXML</EXPLODE>
   <EXPLODE>Crnote_InventoryTrans</EXPLODE>
   <EXPLODE>Crnote_LedgerTrans</EXPLODE>
   <XMLTAG>&quot;invtrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_item, Crnote_itemID, Crnote_itemGroup, Crnote_itemGroupID, Crnote_itemCategory, Crnote_itemCategoryID, Crnote_itemActualqty, Crnote_itemBilledqty, Crnote_itemAltActualqty, Crnote_itemAltBilledqty, Crnote_itemrate, Crnote_itemdiscount, Crnote_itemamount, Crnote_itemGST, Crnote_itemHSN, Crnote_itemIGSTAmt, Crnote_itemCGSTAmt, Crnote_itemSGSTAmt, Crnote_itemCESSAmt, Crnote_itemTaxType, Crnote_itemdiscountamount, Crnote_Tradediscount, Crnote_VATTradediscount, Crnote_taxableamount, Crnote_vattaxableamount, Crnote_VATRate, Crnote_VATAmount, Crnote_itemTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;InventoryEntries&quot;</XMLTAG>
   <EXPLODE>Crnote_AccountingAllocTrans</EXPLODE>
   <EXPLODE>Crnote_BatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_LedgerName, Crnote_LedgerNameID, Crnote_LedgerAmt, Crnote_LedgerIsDeemed, Crnote_ledgerGST, Crnote_ledgerHSN, Crnote_ledgerIGSTAmt, Crnote_ledgerCGSTAmt, Crnote_ledgerSGSTAmt, Crnote_ledgerCESSAmt, Crnote_ledgerTaxType, Crnote_Ledgertradediscount, Crnote_LedgerVATtradediscount, Crnote_Ledgertaxableamount, Crnote_Ledgervattaxableamount, Crnote_LedgerVATRate, Crnote_LedgerVATAmount, Crnote_LedgerTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
   <EXPLODE>Crnote_RepDtlsCostCategory</EXPLODE>
   <EXPLODE>Crnote_AccTransInventoryTrans</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_AccountAllocName, Crnote_AccountAllocNameID, Crnote_AccountAllocamt, Crnote_AccountAllocisDeemed</LEFTFIELDS>
   <XMLTAG>&quot;AccountingAllocations&quot;</XMLTAG>
   <EXPLODE>Crnote_AccAllocDtlsCostCategory</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_GDName, Crnote_GDNameID, Crnote_BatchName, Crnote_BatchMfd, Crnote_BatchExpiry, Crnote_TrackingNumber, Crnote_OrderNo, Crnote_ActualBatchqty, Crnote_BilledBatchqty, Crnote_AltActualBatchqty, Crnote_AltBilledBatchqty, Crnote_Batchrate, Crnote_Batchdiscount, Crnote_Batchamount, Crnote_Batchdiscountamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_AccAllocDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_AccAllocCostCategory, Crnote_AccAllocCostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>Crnote_AccAllocDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_CostCategory, Crnote_CostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>Crnote_RepDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_AccTransInventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_Accitem, Crnote_AccitemID, Crnote_AccitemGroup, Crnote_AccitemGroupID, Crnote_AccitemCategory, Crnote_AccitemCategoryID, Crnote_AccitemActualqty, Crnote_AccitemBilledqty, Crnote_AccitemAltActualqty, Crnote_AccitemAltBilledqty, Crnote_Accitemrate, Crnote_Accitemdiscount, Crnote_Accitemamount, Crnote_AccitemGST, Crnote_AccitemHSN, Crnote_AccitemIGSTAmt, Crnote_AccitemCGSTAmt, Crnote_AccitemSGSTAmt, Crnote_AccitemCESSAmt, Crnote_AccitemTaxType, Crnote_AccitemdiscountAmount</LEFTFIELDS>
   <XMLTAG>&quot;InventoryAllocations&quot;</XMLTAG>
   <EXPLODE>Crnote_AccTransBatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="Crnote_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_CostCentre, Crnote_CostCentreID, Crnote_CostCentreAmount, Crnote_CostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_AccAllocDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_AccAllocCostCentre, Crnote_AccAllocCostCentreID, Crnote_AccAllocCostCentreAmount, Crnote_AccAllocCostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_AccTransBatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_AccGDName, Crnote_AccGDNameID, Crnote_AccBatchName, Crnote_AccBatchMfd, Crnote_AccBatchExpiry, Crnote_AccActualBatchqty, Crnote_AccBilledBatchqty, Crnote_AccAltActualBatchqty, Crnote_AccAltBilledBatchqty, Crnote_AccBatchrate, Crnote_AccBatchdiscount, Crnote_AccBatchamount, Crnote_AccBatchdiscountAmount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_PartyAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Crnote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Crnote_BuyerAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="Crnote_itemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>&quot;Credit Note&quot;</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_VCHAMOUNT" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyGSTIN</SET>
   <XMLTAG>&quot;PartyGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyPinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyPinCode</SET>
   <XMLTAG>&quot;PartyPinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CountryofResidence</SET>
   <XMLTAG>&quot;PartyCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$StateName</SET>
   <XMLTAG>&quot;PartyState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyPOS" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PlaceOfSupply</SET>
   <XMLTAG>&quot;PartyPOS&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneeName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneeNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneeGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ConsigneeGSTIN</SET>
   <XMLTAG>&quot;ConsigneeGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneePinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$Consigneepincode</INFO>
   <XMLTAG>&quot;ConsigneePinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneeCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeCountryName</INFO>
   <XMLTAG>&quot;ConsigneeCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ConsigneeState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeStateName</INFO>
   <XMLTAG>&quot;ConsigneeState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_itemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccountAllocName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccountAllocNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccountAllocamt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccountAllocisDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_TrackingNumber" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$TrackingNumber</SET>
   <XMLTAG>&quot;TrackingNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_OrderNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$OrderNo</SET>
   <XMLTAG>&quot;OrderNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Batchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_LedgerName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_LedgerNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_LedgerAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_LedgerIsDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_ledgerCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_CostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAllocCostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Accitem" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Accitemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Accitemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_Accitemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccitemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccGDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccGDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccAltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_AccBatchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address</SET>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Crnote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress</SET>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="Crnote_VCHCREDITNOTECOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>$$VchTypeCreditNote</CHILDOF>
   <BELONGSTO>Yes</BELONGSTO>
   <NATIVEMETHOD>Amount, *</NATIVEMETHOD>
   <FILTERS>NOTIsOptionalVoucher</FILTERS>
   ${lastAlterId ? "<FILTERS>DeltaSyncFilter</FILTERS>" : ""}
   ${(0, utils_1.voucherDateRangeFilterRef)(dateRange)}
  </COLLECTION>
  ${lastAlterId
        ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  `
        : ""}
${(0, utils_1.voucherDateRangeFilterDef)(dateRange)}
<FIELD NAME="ConnectorGUID"><SET>$GUID</SET><XMLTAG>GUID</XMLTAG></FIELD>
<FIELD NAME="ConnectorPostDated"><SET>$IsPostDated</SET><XMLTAG>ISPOSTDATED</XMLTAG></FIELD>
<FIELD NAME="ConnectorInvoice"><SET>$IsInvoice</SET><XMLTAG>ISINVOICE</XMLTAG></FIELD>
<FIELD NAME="Crnote_itemdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$DiscountAmount Then $$AsAmount:@discamt Else $DiscountAmount</SET>
   <XMLTAG>&quot;DiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $Discount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Crnote_Tradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Crnote_itemamount - #Crnote_taxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_VATTradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Crnote_itemamount - #Crnote_vattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_taxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_vattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_VATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_VATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$ComputedAssessableValue:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_itemTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_Ledgertradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Crnote_LedgerAmt - #Crnote_Ledgertaxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_LedgerVATtradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Crnote_LedgerAmt - #Crnote_Ledgervattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_Ledgertaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_Ledgervattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$VATAssesableVal_Cal</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_LedgerVATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_LedgerVATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$VATAssesableVal_Cal:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_LedgerTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Crnote_AccitemdiscountAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$DiscountAmount Then $$AsAmount:@discamt Else $DiscountAmount</SET>
   <XMLTAG>&quot;DiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $Discount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Crnote_Batchdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$BatchDiscountAmount Then $$AsAmount:@discamt Else $BatchDiscountAmount</SET>
   <XMLTAG>&quot;BatchDiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $BatchDiscount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Crnote_AccBatchdiscountAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$BatchDiscountAmount Then $$AsAmount:@discamt Else $BatchDiscountAmount</SET>
   <XMLTAG>&quot;BatchDiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $BatchDiscount / 100</LOCALFORMULA>
  </FIELD>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE>
`;
};
exports.creditnoteBuilder = creditnoteBuilder;
