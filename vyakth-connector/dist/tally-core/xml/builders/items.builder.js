"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemsBuilder = void 0;
const utils_1 = require("./utils");
const itemsBuilder = (companyName, lastAlterId) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>ItemsXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="ItemsXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>ItemsXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $StartingFrom:Company:##SVCurrentCompany</SET>
  </REPORT>
  <FORM NAME="ItemsXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>ItemsXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="ItemsXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>ItemsXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>ItemsXML : ItemsXMLColl</REPEAT>
  </PART>
  <PART NAME="ItemsComponentlistXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>ItemsComponentlistXML</TOPLINES>
   <REPEAT>ItemsComponentlistXML : MultiComponentlist</REPEAT>
  </PART>
  <PART NAME="ItemsOPXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>ItemsOPXML</TOPLINES>
   <REPEAT>ItemsOPXML : BatchAllocations</REPEAT>
  </PART>
  <PART NAME="ItemsComponentItemlistXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>ItemsComponentItemlistXML</TOPLINES>
   <REPEAT>ItemsComponentItemlistXML : MultiComponentItemlist</REPEAT>
  </PART>
  <LINE NAME="ItemsXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBIIT_TALLYSLNO, MBIIT_CMPID, MBIIT_CMPNAME, MBI_ItemID, MBI_ItemAID, MBI_ItemName, MBI_ItemAlias, MBI_ItemPart, MBI_ItemGroup, MBI_ItemCategory, MBI_ItemUnit, MBI_ItemAdditionalUnit, MBI_ItemUnitConversion, MBI_ItemUnitDenominator, MBI_ItemTypOfSuply, MBI_ItemQty, MBI_ItemAltQty, MBI_ItemRate, MBI_ItemValue</LEFTFIELDS>
   <EXPLODE>ItemsComponentlistXML</EXPLODE>
   <EXPLODE>Vyakth_ItemGSTDetails</EXPLODE>
   <EXPLODE>vyakth_ItemHSNDetails</EXPLODE>
   <EXPLODE>vyakth_ItemVATDetails</EXPLODE>
   <EXPLODE>ItemsOPXML</EXPLODE>
   <XMLTAG>&quot;Itemslist&quot;</XMLTAG>
  </LINE>
  <LINE NAME="ItemsComponentlistXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_ItemListName, MBI_ItemListQty</LEFTFIELDS>
   <XMLTAG>&quot;MultiComponentlist&quot;</XMLTAG>
   <EXPLODE>ItemsComponentItemlistXML</EXPLODE>
  </LINE>
  <LINE NAME="ItemsOPXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_ItemGodown, MBI_ItemBatch, MBI_ItemMfg, MBI_ItemExp, MBI_ItemOpQty, MBI_ItemOpAltQty, MBI_ItemOpRate, MBI_ItemOpValue</LEFTFIELDS>
   <XMLTAG>&quot;openingbalancelist&quot;</XMLTAG>
  </LINE>
  <LINE NAME="ItemsComponentItemlistXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_ItemLName, MBI_ItemLNameID, MBI_ItemLGodown, MBI_ItemLQty</LEFTFIELDS>
   <XMLTAG>&quot;MultiComponentItemlist&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_ItemID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemAID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemAlias" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$OnlyAlias</SET>
   <XMLTAG>&quot;OnlyAlias&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemPart" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Partno</SET>
   <XMLTAG>&quot;Partno&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PARENT</SET>
   <XMLTAG>&quot;PARENT&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;Category&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemUnit" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BASEUNITS</SET>
   <XMLTAG>&quot;BASEUNITS&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemAdditionalUnit" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$AdditionalUnits</SET>
   <XMLTAG>&quot;AdditionalUnits&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemUnitConversion" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Conversion</SET>
   <XMLTAG>&quot;Conversion&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemUnitDenominator" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Denominator</SET>
   <XMLTAG>&quot;Denominator&quot;</XMLTAG>
  </FIELD>
  
  
  
  
  
  <FIELD NAME="MBI_ItemTypOfSuply" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$GSTTypeofSupply</SET>
   <XMLTAG>&quot;GSTTypeofSupply&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemAltQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;AltOpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$OpeningRAte</SET>
   <XMLTAG>&quot;OpeningRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningValue</SET>
   <XMLTAG>&quot;OpeningValue&quot;</XMLTAG>
  </FIELD>
  
  <FIELD NAME="MBI_ItemRev" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$GSTDETAILS[Last].ISREVERSECHARGEAPPLICABLE</SET>
   <XMLTAG>&quot;ISREVERSECHARGEAPPLICABLE&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemListName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ComponentListName</SET>
   <XMLTAG>&quot;ComponentListName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemListQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ComponentBasicQty</SET>
   <XMLTAG>&quot;ComponentBasicQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemLName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$StockItemName</SET>
   <XMLTAG>&quot;StockItemName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemLNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$MasterID:StockItem:$StockItemName</SET>
   <XMLTAG>&quot;StockItemNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemLGodown" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemLQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$ActualQty</SET>
   <XMLTAG>&quot;ActualQty&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemGodown" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$GodownName</SET>
   <XMLTAG>&quot;GodownName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemBatch" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BAtchName</SET>
   <XMLTAG>&quot;BAtchName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemMfg" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MfdOn</SET>
   <XMLTAG>&quot;MfdOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemExp" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ExpiryPeriod</SET>
   <XMLTAG>&quot;ExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemOpQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtyPrimaryField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemOpAltQty" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>QtySecondaryField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;AltOpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemOpRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>RatePriceField</USE>
   <SET>$OpeningRAte</SET>
   <XMLTAG>&quot;OpeningRate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_ItemOpValue" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningValue</SET>
   <XMLTAG>&quot;OpeningValue&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIIT_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIIT_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIIT_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="ItemsXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>StockItem</TYPE>
   ${lastAlterId ? '<FILTERS>DeltaSyncFilter</FILTERS>' : ''}
  </COLLECTION>
  ${lastAlterId ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  ` : ''}
<PART NAME="vyakth_ItemVATDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_ItemVATDetails</TOPLINES>
   <REPEAT>vyakth_ItemVATDetails : VATDETAILS</REPEAT>
  </PART>
<PART NAME="Vyakth_ItemGSTDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>Vyakth_ItemGSTDetails</TOPLINES>
   <REPEAT>Vyakth_ItemGSTDetails : GSTDetails</REPEAT>
  </PART>
<PART NAME="vyakth_ItemHSNDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_ItemHSNDetails</TOPLINES>
   <REPEAT>vyakth_ItemHSNDetails : HSNDetails</REPEAT>
  </PART>
<PART NAME="vyakth_ItemGSTRateDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_ItemGSTRateDetails</TOPLINES>
   <REPEAT>vyakth_ItemGSTRateDetails : ItemInsightGSTRateDetailsColl</REPEAT>
  </PART>
<LINE NAME="vyakth_ItemVATDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>ItemVAT_FromDate, ItemVAT_TAXTYPE, ItemVAT_RATE</LEFTFIELDS>
   <XMLTAG>&quot;VATDETAILS&quot;</XMLTAG>
  </LINE>
<LINE NAME="Vyakth_ItemGSTDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>ItemGST_AppDate, ItemGST_CalculationType, ItemGST_HSN, ItemGST_Hsncode, ItemGST_Gstnatureoftransaction, ItemGST_Isnongstgoods, ItemGST_Isreversechargeapplicable, ItemGST_Natureofgoods, ItemGST_Reportinguom, ItemGST_Supplytype, ItemGST_Taxability</LEFTFIELDS>
   <XMLTAG>&quot;GSTDetails&quot;</XMLTAG>
   <EXPLODE>vyakth_ItemGSTRateDetails</EXPLODE>
  </LINE>
<LINE NAME="vyakth_ItemHSNDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>ItemHSN_ApplicableFrom, ItemHSN_HSN, ItemHSN_HSNCode</LEFTFIELDS>
   <XMLTAG>&quot;HSNDetails&quot;</XMLTAG>
  </LINE>
<LINE NAME="vyakth_ItemGSTRateDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>ItemGST_GSTRate, ItemGST_Gstratedutyhead, ItemGST_Gstraterperunit, ItemGST_Gstratevaluationtype</LEFTFIELDS>
   <XMLTAG>&quot;RateDetails&quot;</XMLTAG>
  </LINE>
<FIELD NAME="ItemVAT_FromDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$FROMDATE</SET>
   <XMLTAG>&quot;FROMDATE&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemVAT_TAXTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$TAXTYPE</SET>
   <XMLTAG>&quot;TAXTYPE&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemVAT_RATE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$RATEOFVAT</SET>
   <XMLTAG>&quot;RATEOFVAT&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_AppDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ApplicableFrom</SET>
   <XMLTAG>&quot;ApplicableFrom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_CalculationType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CalculationType</SET>
   <XMLTAG>&quot;CalculationType&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_HSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSN</SET>
   <XMLTAG>&quot;HSNDescription&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Hsncode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSNCode</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Gstnatureoftransaction" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Gstnatureoftransaction</SET>
   <XMLTAG>&quot;Gstnatureoftransaction&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Isnongstgoods" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Isnongstgoods</SET>
   <XMLTAG>&quot;Isnongstgoods&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Isreversechargeapplicable" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Isreversechargeapplicable</SET>
   <XMLTAG>&quot;Isreversechargeapplicable&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Natureofgoods" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Natureofgoods</SET>
   <XMLTAG>&quot;Natureofgoods&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Reportinguom" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reportinguom</SET>
   <XMLTAG>&quot;Reportinguom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Supplytype" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Supplytype</SET>
   <XMLTAG>&quot;Supplytype&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Taxability" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Taxability</SET>
   <XMLTAG>&quot;Taxability&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_GSTRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGSTRate</SET>
   <XMLTAG>&quot;Gstrate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Gstratedutyhead" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstratedutyhead</SET>
   <XMLTAG>&quot;Gstratedutyhead&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Gstraterperunit" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstraterperunit</SET>
   <XMLTAG>&quot;Gstraterperunit&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemGST_Gstratevaluationtype" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstratevaluationtype</SET>
   <XMLTAG>&quot;Gstratevaluationtype&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemHSN_ApplicableFrom" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ApplicableFrom</SET>
   <XMLTAG>&quot;ApplicableFrom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemHSN_HSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSN</SET>
   <XMLTAG>&quot;HSNDescription&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="ItemHSN_HSNCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSNCode</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
<COLLECTION NAME="ItemInsightGSTRateDetailsColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <SOURCECOLLECTION>Default</SOURCECOLLECTION>
   <WALK>Statewisedetails</WALK>
   <WALK>RateDetails</WALK>
   <METHOD>vGSTRate    : $Gstrate</METHOD>
   <METHOD>vGstratedutyhead  : $Gstratedutyhead</METHOD>
   <METHOD>vGstraterperunit  : $Gstraterperunit</METHOD>
   <METHOD>vGstratevaluationtype : $Gstratevaluationtype</METHOD>
  </COLLECTION>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.itemsBuilder = itemsBuilder;
