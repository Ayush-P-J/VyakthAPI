"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseBuilder = void 0;
const utils_1 = require("./utils");
const purchaseBuilder = (companyName, lastAlterId, dateRange) => {
    return `
<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>InvPurchaseTransXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
 <REPORT NAME="InvPurchaseTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>InvPurchaseTransXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
  </REPORT>
  <FORM NAME="InvPurchaseTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>InvPurchaseTransXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="InvPurchaseTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>InvPurchaseTransXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>InvPurchaseTransXML : Purc_VCHPURCHASECOLL</REPEAT>
  </PART>
  <PART NAME="Purc_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_InventoryTrans</TOPLINES>
   <REPEAT>Purc_InventoryTrans : InventoryEntries</REPEAT>
  </PART>
  <PART NAME="Purc_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_LedgerTrans</TOPLINES>
   <REPEAT>Purc_LedgerTrans : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="Purc_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_AccountingAllocTrans</TOPLINES>
   <REPEAT>Purc_AccountingAllocTrans : AccountingAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_BatchAllocationsTrans</TOPLINES>
   <REPEAT>Purc_BatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_AccAllocDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_AccAllocDtlsCostCategory</TOPLINES>
   <REPEAT>Purc_AccAllocDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_RepDtlsCostCategory</TOPLINES>
   <REPEAT>Purc_RepDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_AccTransInventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_AccTransInventoryTrans</TOPLINES>
   <REPEAT>Purc_AccTransInventoryTrans : InventoryAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_RepDtlsCostCentre</TOPLINES>
   <REPEAT>Purc_RepDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_AccAllocDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_AccAllocDtlsCostCentre</TOPLINES>
   <REPEAT>Purc_AccAllocDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_AccTransBatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_AccTransBatchAllocationsTrans</TOPLINES>
   <REPEAT>Purc_AccTransBatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="Purc_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_PartyAddressXML</TOPLINES>
   <REPEAT>Purc_PartyAddressXML : Address</REPEAT>
  </PART>
  <PART NAME="Purc_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Purc_BuyerAddressXML</TOPLINES>
   <REPEAT>Purc_BuyerAddressXML : BasicBuyerAddress</REPEAT>
  </PART>
  <LINE NAME="InvPurchaseTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_TALLYSLNO, Purc_CMPID, Purc_CMPNAME, Purc_MID, Purc_ALTERID, Purc_ISCANCEL, Purc_ISOPTIONAL, Purc_MAINVCHTYPE, Purc_MAINVCHTYPEID, Purc_VCHTYPE, Purc_VCHTYPEID, Purc_VCHNo, Purc_VCHDt, Purc_VCHRef, Purc_VCHRefDt, Purc_VCHNARR, Purc_VCHAMOUNT, Purc_PartyName, Purc_PartyNameID, Purc_PartyGSTIN, Purc_PartyPinCode, Purc_PartyCountry, Purc_PartyState, Purc_PartyPOS, Purc_ConsigneeName, Purc_ConsigneeNameID, Purc_ConsigneeGSTIN, Purc_ConsigneePinCode, Purc_ConsigneeCountry, Purc_ConsigneeState, ConnectorGUID, ConnectorPostDated, ConnectorInvoice</LEFTFIELDS>
   <EXPLODE>Purc_PartyAddressXML</EXPLODE>
   <EXPLODE>Purc_BuyerAddressXML</EXPLODE>
   <EXPLODE>Purc_InventoryTrans</EXPLODE>
   <EXPLODE>Purc_LedgerTrans</EXPLODE>
   <XMLTAG>&quot;invtrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_item, Purc_itemID, Purc_itemGroup, Purc_itemGroupID, Purc_itemCategory, Purc_itemCategoryID, Purc_itemActualqty, Purc_itemBilledqty, Purc_itemAltActualqty, Purc_itemAltBilledqty, Purc_itemrate, Purc_itemdiscount, Purc_itemamount, Purc_itemGST, Purc_itemHSN, Purc_itemIGSTAmt, Purc_itemCGSTAmt, Purc_itemSGSTAmt, Purc_itemCESSAmt, Purc_itemTaxType, Purc_itemdiscountamount, Purc_Tradediscount, Purc_VATTradediscount, Purc_taxableamount, Purc_vattaxableamount, Purc_VATRate, Purc_VATAmount, Purc_itemTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;InventoryEntries&quot;</XMLTAG>
   <EXPLODE>Purc_AccountingAllocTrans</EXPLODE>
   <EXPLODE>Purc_BatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="Purc_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_LedgerName, Purc_LedgerNameID, Purc_LedgerAmt, Purc_LedgerIsDeemed, Purc_ledgerGST, Purc_ledgerHSN, Purc_ledgerIGSTAmt, Purc_ledgerCGSTAmt, Purc_ledgerSGSTAmt, Purc_ledgerCESSAmt, Purc_ledgerTaxType, Purc_Ledgertradediscount, Purc_LedgerVATtradediscount, Purc_Ledgertaxableamount, Purc_Ledgervattaxableamount, Purc_LedgerVATRate, Purc_LedgerVATAmount, Purc_LedgerTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
   <EXPLODE>Purc_RepDtlsCostCategory</EXPLODE>
   <EXPLODE>Purc_AccTransInventoryTrans</EXPLODE>
  </LINE>
  <LINE NAME="Purc_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_AccountAllocName, Purc_AccountAllocNameID, Purc_AccountAllocamt, Purc_AccountAllocisDeemed</LEFTFIELDS>
   <XMLTAG>&quot;AccountingAllocations&quot;</XMLTAG>
   <EXPLODE>Purc_AccAllocDtlsCostCategory</EXPLODE>
  </LINE>
  <LINE NAME="Purc_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_GDName, Purc_GDNameID, Purc_BatchName, Purc_BatchMfd, Purc_BatchExpiry, Purc_TrackingNumber, Purc_OrderNo, Purc_ActualBatchqty, Purc_BilledBatchqty, Purc_AltActualBatchqty, Purc_AltBilledBatchqty, Purc_Batchrate, Purc_Batchdiscount, Purc_Batchamount, Purc_Batchdiscountamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_AccAllocDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_AccAllocCostCategory, Purc_AccAllocCostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>Purc_AccAllocDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="Purc_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_CostCategory, Purc_CostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>Purc_RepDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="Purc_AccTransInventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_Accitem, Purc_AccitemID, Purc_AccitemGroup, Purc_AccitemGroupID, Purc_AccitemCategory, Purc_AccitemCategoryID, Purc_AccitemActualqty, Purc_AccitemBilledqty, Purc_AccitemAltActualqty, Purc_AccitemAltBilledqty, Purc_Accitemrate, Purc_Accitemdiscount, Purc_Accitemamount, Purc_AccitemGST, Purc_AccitemHSN, Purc_AccitemIGSTAmt, Purc_AccitemCGSTAmt, Purc_AccitemSGSTAmt, Purc_AccitemCESSAmt, Purc_AccitemTaxType, Purc_AccitemdiscountAmount</LEFTFIELDS>
   <XMLTAG>&quot;InventoryAllocations&quot;</XMLTAG>
   <EXPLODE>Purc_AccTransBatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="Purc_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_CostCentre, Purc_CostCentreID, Purc_CostCentreAmount, Purc_CostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_AccAllocDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_AccAllocCostCentre, Purc_AccAllocCostCentreID, Purc_AccAllocCostCentreAmount, Purc_AccAllocCostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_AccTransBatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_AccGDName, Purc_AccGDNameID, Purc_AccBatchName, Purc_AccBatchMfd, Purc_AccBatchExpiry, Purc_AccActualBatchqty, Purc_AccBilledBatchqty, Purc_AccAltActualBatchqty, Purc_AccAltBilledBatchqty, Purc_AccBatchrate, Purc_AccBatchdiscount, Purc_AccBatchamount, Purc_AccBatchdiscountAmount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_PartyAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </LINE>
  <LINE NAME="Purc_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>Purc_BuyerAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="Purc_itemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>&quot;Purchase&quot;</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_VCHAMOUNT" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyGSTIN</SET>
   <XMLTAG>&quot;PartyGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyPinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyPinCode</SET>
   <XMLTAG>&quot;PartyPinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CountryofResidence</SET>
   <XMLTAG>&quot;PartyCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$StateName</SET>
   <XMLTAG>&quot;PartyState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyPOS" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PlaceOfSupply</SET>
   <XMLTAG>&quot;PartyPOS&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneeName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneeNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneeGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ConsigneeGSTIN</SET>
   <XMLTAG>&quot;ConsigneeGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneePinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$Consigneepincode</INFO>
   <XMLTAG>&quot;ConsigneePinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneeCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeCountryName</INFO>
   <XMLTAG>&quot;ConsigneeCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ConsigneeState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeStateName</INFO>
   <XMLTAG>&quot;ConsigneeState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_itemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccountAllocName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccountAllocNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccountAllocamt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccountAllocisDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_TrackingNumber" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$TrackingNumber</SET>
   <XMLTAG>&quot;TrackingNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_OrderNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$OrderNo</SET>
   <XMLTAG>&quot;OrderNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Batchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_LedgerName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_LedgerNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_LedgerAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_LedgerIsDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_ledgerCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_CostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAllocCostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Accitem" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Accitemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Accitemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_Accitemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccitemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccGDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccGDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccAltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_AccBatchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address</SET>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="Purc_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress</SET>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="Purc_VCHPURCHASECOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>$$VchTypePurchase</CHILDOF>
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
<FIELD NAME="Purc_itemdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$DiscountAmount Then $$AsAmount:@discamt Else $DiscountAmount</SET>
   <XMLTAG>&quot;DiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $Discount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Purc_Tradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Purc_itemamount - #Purc_taxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_VATTradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Purc_itemamount - #Purc_vattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_taxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_vattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_VATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_VATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$ComputedAssessableValue:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_itemTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_Ledgertradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Purc_LedgerAmt - #Purc_Ledgertaxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_LedgerVATtradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#Purc_LedgerAmt - #Purc_Ledgervattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_Ledgertaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_Ledgervattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$VATAssesableVal_Cal</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_LedgerVATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_LedgerVATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$VATAssesableVal_Cal:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_LedgerTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="Purc_AccitemdiscountAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$DiscountAmount Then $$AsAmount:@discamt Else $DiscountAmount</SET>
   <XMLTAG>&quot;DiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $Discount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Purc_Batchdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$BatchDiscountAmount Then $$AsAmount:@discamt Else $BatchDiscountAmount</SET>
   <XMLTAG>&quot;BatchDiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $BatchDiscount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="Purc_AccBatchdiscountAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
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
exports.purchaseBuilder = purchaseBuilder;
