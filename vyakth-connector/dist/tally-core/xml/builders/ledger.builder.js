"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerBuilder = void 0;
const utils_1 = require("./utils");
// `masterIdRange` splits the full pull into several smaller requests. At 25,131 ledgers this is a
// single 24 MB / 7.6s response â€” the largest thing the sync asks Tally to build in one go.
const ledgerBuilder = (companyName, lastAlterId, masterIdRange) => {
    return `
<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>LedgerXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
 <REPORT NAME="LedgerXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>LedgerXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $StartingFrom:Company:##SVCurrentCompany</SET>
  </REPORT>
  <FORM NAME="LedgerXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>LedgerXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="LedgerXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>LedgerXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>LedgerXML : LedgerXMLColl</REPEAT>
  </PART>
  <PART NAME="LedgerOpXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>LedgerOpXML</TOPLINES>
   <REPEAT>LedgerOpXML : BillAllocations</REPEAT>
  </PART>
  <PART NAME="LedgerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>LedgerAddressXML</TOPLINES>
   <REPEAT>LedgerAddressXML : Address</REPEAT>
  </PART>
  <LINE NAME="LedgerXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBILED_TALLYSLNO, MBILED_CMPID, MBILED_CMPNAME, MBI_LEDID, MBI_LEDAID, MBI_LEDName, MBI_LEDAlias, MBI_LEDGroup, MBI_LEDBillByBill, MBI_LEDCreditPeriod, MBI_LEDCountry, MBI_LEDState, MBI_LEDPincode, MBI_LEDContactPerson, MBI_LEDMobile, MBI_LEDPhone, MBI_LEDEmail, MBI_LEDWebsite, MBI_LEDPAN, MBI_LEDGSTRegType, MBI_LEDGSTNo, MBI_LEDOpening, MBI_LEDOpeningDRCR</LEFTFIELDS>
   <EXPLODE>LedgerAddressXML</EXPLODE>
   <EXPLODE>LedgerOpXML</EXPLODE>
   <EXPLODE>vyakth_LedgerGSTDetails</EXPLODE>
   <EXPLODE>vyakth_LedgerHSNDetails</EXPLODE>
   <EXPLODE>vyakth_LedgerVATDetails</EXPLODE>
   <XMLTAG>&quot;ledgerlist&quot;</XMLTAG>
  </LINE>
  <LINE NAME="LedgerOpXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_LEDBillDate, MBI_LEDBillName, MBI_LEDBillDueDate, MBI_LEDBillAmount, MBI_LEDBillAmountCrDr</LEFTFIELDS>
   <XMLTAG>&quot;openingbalancelist&quot;</XMLTAG>
  </LINE>
  <LINE NAME="LedgerAddressXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_LEDAddress</LEFTFIELDS>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBILED_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILED_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILED_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDAID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;NAme&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDAlias" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$OnlyAlias</SET>
   <XMLTAG>&quot;OnlyAlias&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PArent</SET>
   <XMLTAG>&quot;PArent&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillByBill" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$IsBillWiseOn</SET>
   <XMLTAG>&quot;IsBillWiseOn&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDCreditPeriod" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillCreditPeriod&quot;</XMLTAG>
  </FIELD>
  
  <FIELD NAME="MBI_LEDCountry" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedMailingDetails[Last].Country</SET>
   <XMLTAG>&quot;Country&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDState" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <INFO>$LedMailingDetails[Last].State</INFO>
   <XMLTAG>&quot;State&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDPincode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PinCode</SET>
   <XMLTAG>&quot;PinCode&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDContactPerson" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerContact</SET>
   <XMLTAG>&quot;LedgerContact&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDMobile" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerMobile</SET>
   <XMLTAG>&quot;LedgerMobile&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDPhone" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerPhone</SET>
   <XMLTAG>&quot;LedgerPhone&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDEmail" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$EMail</SET>
   <XMLTAG>&quot;EMail&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDWebsite" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Website</SET>
   <XMLTAG>&quot;Website&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDPAN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$IncomeTaxNumber</SET>
   <XMLTAG>&quot;IncomeTaxNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDGSTRegType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LEDGSTREGDETAILS[Last].GSTREGISTRATIONTYPE</SET>
   <XMLTAG>&quot;GSTREGISTRATIONTYPE&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDGSTNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LEDGSTREGDETAILS[Last].GSTIN</SET>
   <XMLTAG>&quot;GSTIN&quot;</XMLTAG>
  </FIELD>
  
  
  <FIELD NAME="MBI_LEDOpening" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDOpeningDRCR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$OpeningBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillDate</SET>
   <XMLTAG>&quot;BillDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillDueDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillCreditPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDBillAmountCrDr" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$OpeningBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LEDAddress" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Address</SET>
   <XMLTAG>&quot;Address&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="LedgerXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Ledger</TYPE>
   ${lastAlterId ? "<FILTERS>DeltaSyncFilter</FILTERS>" : ""}
   ${(0, utils_1.masterIdRangeFilterRef)(masterIdRange)}
  </COLLECTION>
  ${lastAlterId
        ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  `
        : ""}
  ${(0, utils_1.masterIdRangeFilterDef)(masterIdRange)}
<PART NAME="vyakth_LedgerVATDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_LedgerVATDetails</TOPLINES>
   <REPEAT>vyakth_LedgerVATDetails : VATDETAILS</REPEAT>
  </PART>
<PART NAME="vyakth_LedgerGSTDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_LedgerGSTDetails</TOPLINES>
   <REPEAT>vyakth_LedgerGSTDetails : GSTDetails</REPEAT>
  </PART>
<PART NAME="vyakth_LedgerHSNDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_LedgerHSNDetails</TOPLINES>
   <REPEAT>vyakth_LedgerHSNDetails : HSNDetails</REPEAT>
  </PART>
<PART NAME="vyakth_LedgerGSTRateDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>vyakth_LedgerGSTRateDetails</TOPLINES>
   <REPEAT>vyakth_LedgerGSTRateDetails : InsightGSTRateDetailsColl</REPEAT>
  </PART>
<LINE NAME="vyakth_LedgerVATDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>LedgerVAT_FromDate, LedgerVAT_TAXTYPE, LedgerVAT_RATE</LEFTFIELDS>
   <XMLTAG>&quot;VATDETAILS&quot;</XMLTAG>
  </LINE>
<LINE NAME="vyakth_LedgerGSTDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>LedgerGST_AppDate, LedgerGST_CalculationType, LedgerGST_HSN, LedgerGST_Hsncode, LedgerGST_Gstnatureoftransaction, LedgerGST_Isnongstgoods, LedgerGST_Isreversechargeapplicable, LedgerGST_Natureofgoods, LedgerGST_Reportinguom, LedgerGST_Supplytype, LedgerGST_Taxability</LEFTFIELDS>
   <EXPLODE>vyakth_LedgerGSTRateDetails</EXPLODE>
   <XMLTAG>&quot;GSTDetails&quot;</XMLTAG>
  </LINE>
<LINE NAME="vyakth_LedgerHSNDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>LedgerHSN_ApplicableFrom, LedgerHSN_HSN, LedgerHSN_HSNCode</LEFTFIELDS>
   <XMLTAG>&quot;HSNDetails&quot;</XMLTAG>
  </LINE>
<LINE NAME="vyakth_LedgerGSTRateDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>LedgerGST_GSTRate, LedgerGST_Gstratedutyhead, LedgerGST_Gstraterperunit, LedgerGST_Gstratevaluationtype</LEFTFIELDS>
   <XMLTAG>&quot;RateDetails&quot;</XMLTAG>
  </LINE>
<FIELD NAME="LedgerVAT_FromDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$FROMDATE</SET>
   <XMLTAG>&quot;FROMDATE&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerVAT_TAXTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$TAXTYPE</SET>
   <XMLTAG>&quot;TAXTYPE&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerVAT_RATE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$RATEOFVAT</SET>
   <XMLTAG>&quot;RATEOFVAT&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_AppDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ApplicableFrom</SET>
   <XMLTAG>&quot;ApplicableFrom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_CalculationType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CalculationType</SET>
   <XMLTAG>&quot;CalculationType&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_HSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSN</SET>
   <XMLTAG>&quot;HSNDescription&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Hsncode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSNCode</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Gstnatureoftransaction" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Gstnatureoftransaction</SET>
   <XMLTAG>&quot;Gstnatureoftransaction&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Isnongstgoods" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Isnongstgoods</SET>
   <XMLTAG>&quot;Isnongstgoods&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Isreversechargeapplicable" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Isreversechargeapplicable</SET>
   <XMLTAG>&quot;Isreversechargeapplicable&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Natureofgoods" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Natureofgoods</SET>
   <XMLTAG>&quot;Natureofgoods&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Reportinguom" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reportinguom</SET>
   <XMLTAG>&quot;Reportinguom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Supplytype" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Supplytype</SET>
   <XMLTAG>&quot;Supplytype&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Taxability" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Taxability</SET>
   <XMLTAG>&quot;Taxability&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_GSTRate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NumberField</USE>
   <SET>$$Number:$vGSTRate</SET>
   <XMLTAG>&quot;Gstrate&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Gstratedutyhead" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstratedutyhead</SET>
   <XMLTAG>&quot;Gstratedutyhead&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Gstraterperunit" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstraterperunit</SET>
   <XMLTAG>&quot;Gstraterperunit&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerGST_Gstratevaluationtype" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$vGstratevaluationtype</SET>
   <XMLTAG>&quot;Gstratevaluationtype&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerHSN_ApplicableFrom" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ApplicableFrom</SET>
   <XMLTAG>&quot;ApplicableFrom&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerHSN_HSN" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSN</SET>
   <XMLTAG>&quot;HSNDescription&quot;</XMLTAG>
  </FIELD>
<FIELD NAME="LedgerHSN_HSNCode" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$HSNCode</SET>
   <XMLTAG>&quot;HSNCode&quot;</XMLTAG>
  </FIELD>
<COLLECTION NAME="InsightGSTRateDetailsColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
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
</ENVELOPE>
`;
};
exports.ledgerBuilder = ledgerBuilder;
