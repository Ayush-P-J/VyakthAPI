"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverynoteBuilder = void 0;
const utils_1 = require("./utils");
const deliverynoteBuilder = (companyName, lastAlterId, dateRange) => {
    return `
<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>InvDeliveryNoteTransXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
 <REPORT NAME="InvDeliveryNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>InvDeliveryNoteTransXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
  </REPORT>
  <FORM NAME="InvDeliveryNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>InvDeliveryNoteTransXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="InvDeliveryNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>InvDeliveryNoteTransXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>InvDeliveryNoteTransXML : DLVNote_VCHDELIVERYNOTECOLL</REPEAT>
  </PART>
  <PART NAME="DLVNote_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_InventoryTrans</TOPLINES>
   <REPEAT>DLVNote_InventoryTrans : InventoryEntries</REPEAT>
  </PART>
  <PART NAME="DLVNote_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_LedgerTrans</TOPLINES>
   <REPEAT>DLVNote_LedgerTrans : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="DLVNote_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_AccountingAllocTrans</TOPLINES>
   <REPEAT>DLVNote_AccountingAllocTrans : AccountingAllocations</REPEAT>
  </PART>
  <PART NAME="DLVNote_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_BatchAllocationsTrans</TOPLINES>
   <REPEAT>DLVNote_BatchAllocationsTrans : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="DLVNote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_PartyAddressXML</TOPLINES>
   <REPEAT>DLVNote_PartyAddressXML : Address</REPEAT>
  </PART>
  <PART NAME="DLVNote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>DLVNote_BuyerAddressXML</TOPLINES>
   <REPEAT>DLVNote_BuyerAddressXML : BasicBuyerAddress</REPEAT>
  </PART>
  <LINE NAME="InvDeliveryNoteTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_TALLYSLNO, DLVNote_CMPID, DLVNote_CMPNAME, DLVNote_MID, DLVNote_ALTERID, DLVNote_ISCANCEL, DLVNote_ISOPTIONAL, DLVNote_MAINVCHTYPE, DLVNote_MAINVCHTYPEID, DLVNote_VCHTYPE, DLVNote_VCHTYPEID, DLVNote_VCHNo, DLVNote_VCHDt, DLVNote_VCHRef, DLVNote_VCHRefDt, DLVNote_VCHNARR, DLVNote_VCHAMOUNT, DLVNote_PartyName, DLVNote_PartyNameID, DLVNote_PartyGSTIN, DLVNote_PartyPinCode, DLVNote_PartyCountry, DLVNote_PartyState, DLVNote_PartyPOS, DLVNote_ConsigneeName, DLVNote_ConsigneeNameID, DLVNote_ConsigneeGSTIN, DLVNote_ConsigneePinCode, DLVNote_ConsigneeCountry, DLVNote_ConsigneeState, ConnectorGUID, ConnectorPostDated, ConnectorInvoice</LEFTFIELDS>
   <EXPLODE>DLVNote_PartyAddressXML</EXPLODE>
   <EXPLODE>DLVNote_BuyerAddressXML</EXPLODE>
   <EXPLODE>DLVNote_InventoryTrans</EXPLODE>
   <EXPLODE>DLVNote_LedgerTrans</EXPLODE>
   <XMLTAG>&quot;invtrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="DLVNote_InventoryTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_item, DLVNote_itemID, DLVNote_itemGroup, DLVNote_itemGroupID, DLVNote_itemCategory, DLVNote_itemCategoryID, DLVNote_itemActualqty, DLVNote_itemBilledqty, DLVNote_itemAltActualqty, DLVNote_itemAltBilledqty, DLVNote_itemrate, DLVNote_itemdiscount, DLVNote_itemamount, DLVNote_itemGST, DLVNote_itemHSN, DLVNote_itemIGSTAmt, DLVNote_itemCGSTAmt, DLVNote_itemSGSTAmt, DLVNote_itemCESSAmt, DLVNote_itemTaxType</LEFTFIELDS>
   <XMLTAG>&quot;InventoryEntries&quot;</XMLTAG>
   <EXPLODE>DLVNote_AccountingAllocTrans</EXPLODE>
   <EXPLODE>DLVNote_BatchAllocationsTrans</EXPLODE>
  </LINE>
  <LINE NAME="DLVNote_LedgerTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_LedgerName, DLVNote_LedgerNameID, DLVNote_LedgerAmt, DLVNote_LedgerIsDeemed, DLVNote_ledgerGST, DLVNote_ledgerHSN, DLVNote_ledgerIGSTAmt, DLVNote_ledgerCGSTAmt, DLVNote_ledgerSGSTAmt, DLVNote_ledgerCESSAmt, DLVNote_ledgerTaxType</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
  </LINE>
  <LINE NAME="DLVNote_AccountingAllocTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_AccountAllocName, DLVNote_AccountAllocNameID, DLVNote_AccountAllocamt, DLVNote_AccountAllocisDeemed</LEFTFIELDS>
   <XMLTAG>&quot;AccountingAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="DLVNote_BatchAllocationsTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_GDName, DLVNote_GDNameID, DLVNote_BatchName, DLVNote_BatchMfd, DLVNote_BatchExpiry, DLVNote_TrackingNumber, DLVNote_OrderNo, DLVNote_ActualBatchqty, DLVNote_BilledBatchqty, DLVNote_AltActualBatchqty, DLVNote_AltBilledBatchqty, DLVNote_Batchrate, DLVNote_Batchdiscount, DLVNote_Batchamount</LEFTFIELDS>
   <XMLTAG>&quot;BatchAllocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="DLVNote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_PartyAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </LINE>
  <LINE NAME="DLVNote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>DLVNote_BuyerAddressXML</LEFTFIELDS>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="DLVNote_itemTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerTaxType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTItemTaxType</SET>
   <XMLTAG>&quot;TaxType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>&quot;Delivery Note&quot;</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_VCHAMOUNT" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$PartyLedgerName</SET>
   <XMLTAG>&quot;PartyNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyGSTIN</SET>
   <XMLTAG>&quot;PartyGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyPinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PartyPinCode</SET>
   <XMLTAG>&quot;PartyPinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CountryofResidence</SET>
   <XMLTAG>&quot;PartyCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$StateName</SET>
   <XMLTAG>&quot;PartyState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyPOS" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PlaceOfSupply</SET>
   <XMLTAG>&quot;PartyPOS&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneeName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneeNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$BasicBuyerName</SET>
   <XMLTAG>&quot;ConsigneeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneeGSTIN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ConsigneeGSTIN</SET>
   <XMLTAG>&quot;ConsigneeGSTIN&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneePinCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$Consigneepincode</INFO>
   <XMLTAG>&quot;ConsigneePinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneeCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeCountryName</INFO>
   <XMLTAG>&quot;ConsigneeCountry&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ConsigneeState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$ConsigneeStateName</INFO>
   <XMLTAG>&quot;ConsigneeState&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_item" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Parent:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockGroup:($Parent:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockCategory&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MAsterID:StockCategory:($Category:StockItem:$StockItemName)</SET>
   <XMLTAG>&quot;StockCategoryID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemAltActualqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemAltBilledqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RAtePriceField</USE>
   <SET>$RAte</SET>
   <XMLTAG>&quot;RAte&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$Discount</SET>
   <XMLTAG>&quot;Discount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_itemCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AccountAllocName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AccountAllocNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AccountAllocamt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AccountAllocisDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_GDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_GDNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Godown:$GodownName</SET>
   <XMLTAG>&quot;GodownNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_BatchName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$BatchName</SET>
   <XMLTAG>&quot;BatchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_TrackingNumber" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$TrackingNumber</SET>
   <XMLTAG>&quot;TrackingNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_OrderNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$OrderNo</SET>
   <XMLTAG>&quot;OrderNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_BatchMfd" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_BatchExpiry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_BilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;BilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AltActualBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;AltActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_AltBilledBatchqty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$BilledQty</SET>
   <XMLTAG>&quot;AltBilledQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_Batchrate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$BatchRate</SET>
   <XMLTAG>&quot;BatchRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_Batchdiscount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$BatchDiscount</SET>
   <XMLTAG>&quot;BatchDiscount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_Batchamount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_LedgerName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_LedgerNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_LedgerAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_LedgerIsDeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerGST" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$IGSTRate</SET>
   <XMLTAG>&quot;GSTRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerHSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$GSTHSNCode:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerIGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedIGST</SET>
   <XMLTAG>&quot;IGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerCGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCGST</SET>
   <XMLTAG>&quot;CGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerSGSTAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedSGST</SET>
   <XMLTAG>&quot;SGSTAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_ledgerCESSAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ComputedCESS</SET>
   <XMLTAG>&quot;CESSAmt&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_PartyAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address</SET>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="DLVNote_BuyerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BasicBuyerAddress</SET>
   <XMLTAG>&quot;BasicBuyerAddress&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="DLVNote_VCHDELIVERYNOTECOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>$$VchTypeDelNote</CHILDOF>
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
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE>
`;
};
exports.deliverynoteBuilder = deliverynoteBuilder;
