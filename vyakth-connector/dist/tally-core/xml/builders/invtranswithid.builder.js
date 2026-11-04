"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invTransWithIDBuilder = void 0;
const utils_1 = require("./utils");
const invTransWithIDBuilder = (companyName) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>InvTransIDXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="InvTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>InvTransIDXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
  </REPORT>
  <FORM NAME="InvTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>InvTransIDXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="InvTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>InvTransIDXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>InvTransIDXML : INVTID_VCHIDCOLL</REPEAT>
  </PART>
  <PART NAME="INVTID_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_InventoryTrans</TOPLINES>
   <REPEAT>INVTID_InventoryTrans : InventoryEntries</REPEAT>
  </PART>
  <PART NAME="INVTID_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_LedgerTrans</TOPLINES>
   <REPEAT>INVTID_LedgerTrans : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="INVTID_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_AccountingAllocTrans</TOPLINES>
   <REPEAT>INVTID_AccountingAllocTrans : AccountingAllocations</REPEAT>
  </PART>
  <PART NAME="INVTID_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_BatchAllocationsTrans</TOPLINES>
   <REPEAT>INVTID_BatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="INVTID_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_RepDtlsCostCategory</TOPLINES>
   <REPEAT>INVTID_RepDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="INVTID_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>INVTID_RepDtlsCostCentre</TOPLINES>
   <REPEAT>INVTID_RepDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <LINE NAME="InvTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_TALLYSLNO, INVTID_CMPID, INVTID_CMPNAME, INVTID_MID, INVTID_ALTERID, INVTID_ISCANCEL, INVTID_ISOPTIONAL, INVTID_MAINVCHTYPE, INVTID_MAINVCHTYPEID, INVTID_VCHTYPE, INVTID_VCHTYPEID, INVTID_VCHNo, INVTID_VCHDt, INVTID_VCHRef, INVTID_VCHRefDt, INVTID_VCHNARR, INVTID_VCHAMOUNT, INVTID_PartyName, INVTID_PartyNameID, INVTID_PartyGSTIN, INVTID_PartyAdd1, INVTID_PartyAdd2, INVTID_PartyAdd3, INVTID_PartyAdd4, INVTID_PartyPinCode, INVTID_PartyCountry, INVTID_PartyState, INVTID_PartyPOS, INVTID_ConsigneeName, INVTID_ConsigneeNameID, INVTID_ConsigneeGSTIN, INVTID_ConsigneeAdd1, INVTID_ConsigneeAdd2, INVTID_ConsigneeAdd3, INVTID_ConsigneeAdd4, INVTID_ConsigneePinCode, INVTID_ConsigneeCountry, INVTID_ConsigneeState</LEFTFIELDS>
   <EXPLODE>INVTID_InventoryTrans</EXPLODE>
   <EXPLODE>INVTID_LedgerTrans</EXPLODE>
   <XMLTAG>&quot;invtrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="INVTID_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_item, INVTID_itemID, INVTID_itemGroup, INVTID_itemGroupID, INVTID_itemCategory, INVTID_itemCategoryID, INVTID_itemActualqty, INVTID_itemBilledqty, INVTID_itemAltActualqty, INVTID_itemAltBilledqty, INVTID_itemrate, INVTID_itemdiscount, INVTID_itemamount, INVTID_itemGST, INVTID_itemHSN, INVTID_itemIGSTAmt, INVTID_itemCGSTAmt, INVTID_itemSGSTAmt, INVTID_itemCESSAmt, INVTID_itemTaxType, INVTID_itemdiscountamount, INVTID_Tradediscount, INVTID_VATTradediscount, INVTID_taxableamount, INVTID_vattaxableamount, INVTID_VATRate, INVTID_VATAmount, INVTID_itemTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;InventoryEntries&quot;</XMLTAG>
   <EXPLODE>INVTID_AccountingAllocTrans</EXPLODE>
   <EXPLODE>INVTID_BatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="INVTID_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_LedgerName, INVTID_LedgerNameID, INVTID_LedgerAmt, INVTID_LedgerIsDeemed, INVTID_ledgerGST, INVTID_ledgerHSN, INVTID_ledgerIGSTAmt, INVTID_ledgerCGSTAmt, INVTID_ledgerSGSTAmt, INVTID_ledgerCESSAmt, INVTID_ledgerTaxType, INVTID_Ledgertradediscount, INVTID_LedgerVATtradediscount, INVTID_Ledgertaxableamount, INVTID_Ledgervattaxableamount, INVTID_LedgerVATRate, INVTID_LedgerVATAmount, INVTID_LedgerTypeofSupply</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
   <EXPLODE>INVTID_RepDtlsCostCategory</EXPLODE>
  </LINE>
  <LINE NAME="INVTID_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_AccountAllocName, INVTID_AccountAllocNameID, INVTID_AccountAllocamt, INVTID_AccountAllocisDeemed</LEFTFIELDS>
   <XMLTAG>&quot;AccountingAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="INVTID_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_GDName, INVTID_GDNameID, INVTID_BatchName, INVTID_BatchMfd, INVTID_BatchExpiry, INVTID_ActualBatchqty, INVTID_BilledBatchqty, INVTID_AltActualBatchqty, INVTID_AltBilledBatchqty, INVTID_Batchrate, INVTID_Batchdiscount, INVTID_Batchamount, INVTID_Batchdiscountamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="INVTID_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_CostCategory, INVTID_CostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>INVTID_RepDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="INVTID_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>INVTID_CostCentre, INVTID_CostCentreID, INVTID_CostCentreAmount, INVTID_CostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="INVTID_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeOrigName:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_VCHAMOUNT" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyGSTIN</SET>
   <XMLTAG>&quot;PartyGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyAdd1" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address[1].Address</SET>
   <XMLTAG>&quot;PartyAdd1&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyAdd2" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address[2].Address</SET>
   <XMLTAG>&quot;PartyAdd2&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyAdd3" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address[3].Address</SET>
   <XMLTAG>&quot;PartyAdd3&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyAdd4" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address[4].Address</SET>
   <XMLTAG>&quot;PartyAdd4&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyPinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyPinCode</SET>
   <XMLTAG>&quot;PartyPinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CountryofResidence</SET>
   <XMLTAG>&quot;PartyCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$StateName</SET>
   <XMLTAG>&quot;PartyState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_PartyPOS" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PlaceOfSupply</SET>
   <XMLTAG>&quot;PartyPOS&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ConsigneeGSTIN</SET>
   <XMLTAG>&quot;ConsigneeGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeAdd1" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress[1].BasicBuyerAddress</SET>
   <XMLTAG>&quot;ConsigneeAdd1&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeAdd2" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress[2].BasicBuyerAddress</SET>
   <XMLTAG>&quot;ConsigneeAdd2&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeAdd3" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress[3].BasicBuyerAddress</SET>
   <XMLTAG>&quot;ConsigneeAdd3&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeAdd4" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$BasicBuyerAddress[4].BasicBuyerAddress</INFO>
   <XMLTAG>&quot;ConsigneeAdd4&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneePinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$Consigneepincode</INFO>
   <XMLTAG>&quot;ConsigneePinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeCountryName</INFO>
   <XMLTAG>&quot;ConsigneeCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ConsigneeState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeStateName</INFO>
   <XMLTAG>&quot;ConsigneeState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AccountAllocName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AccountAllocNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AccountAllocamt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AccountAllocisDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_Batchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_LedgerName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_LedgerNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_LedgerAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_LedgerIsDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_itemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_ledgerTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="INVTID_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="INVTID_VCHIDCOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <PARMVAR>vvtempid : String : &quot;ID:7&quot;</PARMVAR>
   <OBJECTS>Voucher:##vvtempid</OBJECTS>
  </COLLECTION>
<FIELD NAME="INVTID_itemdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$DiscountAmount Then $$AsAmount:@discamt Else $DiscountAmount</SET>
   <XMLTAG>&quot;DiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $Discount / 100</LOCALFORMULA>
  </FIELD>
<FIELD NAME="INVTID_Tradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#INVTID_itemamount - #INVTID_taxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_VATTradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#INVTID_itemamount - #INVTID_vattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_taxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_vattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_VATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_VATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$ComputedAssessableValue:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_itemTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_Ledgertradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#INVTID_LedgerAmt - #INVTID_Ledgertaxableamount</SET>
   <XMLTAG>&quot;GSTtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_LedgerVATtradediscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>#INVTID_LedgerAmt - #INVTID_Ledgervattaxableamount</SET>
   <XMLTAG>&quot;VATtradediscount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_Ledgertaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedAssessableValue</SET>
   <XMLTAG>&quot;GSTtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_Ledgervattaxableamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$VATAssesableVal_Cal</SET>
   <XMLTAG>&quot;VATtaxableamount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_LedgerVATRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$GVATTaxRate</SET>
   <XMLTAG>&quot;VATRate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_LedgerVATAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$$MulDivAmt:$VATAssesableVal_Cal:$GVATTaxRate:100</SET>
   <XMLTAG>&quot;VATAmount&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_LedgerTypeofSupply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;TypeofSupply&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="INVTID_Batchdiscountamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsEmpty:$BatchDiscountAmount Then $$AsAmount:@discamt Else $BatchDiscountAmount</SET>
   <XMLTAG>&quot;BatchDiscountAmount&quot;</XMLTAG>
   <LOCALFORMULA>discamt : ($BilledQty * $RAte) * $BatchDiscount / 100</LOCALFORMULA>
  </FIELD>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE>  `;
};
exports.invTransWithIDBuilder = invTransWithIDBuilder;
