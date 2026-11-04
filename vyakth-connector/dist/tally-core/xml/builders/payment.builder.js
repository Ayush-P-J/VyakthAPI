"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentBuilder = void 0;
const utils_1 = require("./utils");
const paymentBuilder = (companyName, lastAlterId, dateRange) => {
    return `
<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>AccPaymentTransXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="AccPaymentTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>AccPaymentTransXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : ${dateRange ? `"${dateRange.from}"` : "$StartingFrom:Company:##SVCurrentCompany"}</SET>
   <SET>SVToDate         : ${dateRange ? `"${dateRange.to}"` : "$$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany"}</SET>
  </REPORT>
  <FORM NAME="AccPaymentTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>AccPaymentTransXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="AccPaymentTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>AccPaymentTransXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>AccPaymentTransXML : PYMT_VCHPAYMENTCOLL</REPEAT>
  </PART>
  <PART NAME="PYMT_RepDtlsLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>PYMT_RepDtlsLedger</TOPLINES>
   <REPEAT>PYMT_RepDtlsLedger : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="PYMT_RepDtlsBills" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>PYMT_RepDtlsBills</TOPLINES>
   <REPEAT>PYMT_RepDtlsBills : BillAllocations</REPEAT>
  </PART>
  <PART NAME="PYMT_RepDtlsBankTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>PYMT_RepDtlsBankTrans</TOPLINES>
   <REPEAT>PYMT_RepDtlsBankTrans : BankAllocations</REPEAT>
  </PART>
  <PART NAME="PYMT_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>PYMT_RepDtlsCostCategory</TOPLINES>
   <REPEAT>PYMT_RepDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="PYMT_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>PYMT_RepDtlsCostCentre</TOPLINES>
   <REPEAT>PYMT_RepDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <LINE NAME="AccPaymentTransXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_TALLYSLNO, PYMT_CMPID, PYMT_CMPNAME, PYMT_MID, PYMT_ALTERID, PYMT_ISCANCEL, PYMT_ISOPTIONAL, PYMT_MAINVCHTYPE, PYMT_MAINVCHTYPEID, PYMT_VCHTYPE, PYMT_VCHTYPEID, PYMT_VCHNo, PYMT_VCHDt, PYMT_VCHRef, PYMT_VCHRefDt, PYMT_VCHNARR, ConnectorGUID, ConnectorPostDated, ConnectorInvoice</LEFTFIELDS>
   <EXPLODE>PYMT_RepDtlsLedger</EXPLODE>
   <XMLTAG>&quot;acctrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="PYMT_RepDtlsLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_Ledger, PYMT_LedgerID, PYMT_LedgerGroup, PYMT_LedgerGroupID, PYMT_LedgerType, PYMT_Amount, PYMT_Isdeemed</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
   <EXPLODE>PYMT_RepDtlsBills</EXPLODE>
   <EXPLODE>PYMT_RepDtlsBankTrans</EXPLODE>
   <EXPLODE>PYMT_RepDtlsCostCategory</EXPLODE>
  </LINE>
  <LINE NAME="PYMT_RepDtlsBills" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_RefLedger, PYMT_RefLedgerID, PYMT_RefType, PYMT_BillNo, PYMT_BillExp, PYMT_RefAmount, PYMT_RefIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;billallocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="PYMT_RepDtlsBankTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_BankLedger, PYMT_BankTransType, PYMT_BankInstNo, PYMT_BankInstDate, PYMT_BankAmount, PYMT_BankIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;bankallocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="PYMT_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_CostCategory, PYMT_CostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>PYMT_RepDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="PYMT_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>PYMT_CostCentre, PYMT_CostCentreID, PYMT_CostCentreAmount, PYMT_CostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="PYMT_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>&quot;Payment&quot;</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_Ledger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_LedgerID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MAsterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_LedgerGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Parent:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_LedgerGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MAsterID:Group:($Parent:Ledger:$LedgerName)</SET>
   <XMLTAG>&quot;LedgerGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_LedgerType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsLedOfGrp:$LedgerName:$$GroupCash Then &quot;Cash Transaction&quot; Else if  ($$IsLedOfGrp:$LedgerName:$$GroupBank or $$IsLedOfGrp:$LedgerName:$$GroupBankOD) Then &quot;Bank Transaction&quot; Else &quot;Other Transaction&quot;</SET>
   <XMLTAG>&quot;LedgerType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_Amount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_Isdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_RefLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_RefLedgerID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_RefType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillType</SET>
   <XMLTAG>&quot;BillType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BillNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;BillNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BillExp" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_RefAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_RefIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BankPartyName</SET>
   <XMLTAG>&quot;BankLedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankTransType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$TransactionType</SET>
   <XMLTAG>&quot;TransType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankInstNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$InstrumentNumber</SET>
   <XMLTAG>&quot;InstantNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankInstDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$InstrumentDate</SET>
   <XMLTAG>&quot;InstantDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_BankIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="PYMT_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="PYMT_VCHPAYMENTCOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>$$VchTypePayment</CHILDOF>
   <BELONGSTO>Yes</BELONGSTO>
   <NATIVEMETHOD>Amount, *</NATIVEMETHOD>
   <FILTERS>NOTIsOptionalVoucher</FILTERS>
   ${lastAlterId ? "<FILTERS>DeltaSyncFilter</FILTERS>" : ""}
   ${(0, utils_1.voucherDateRangeFilterRef)(dateRange)}
  </COLLECTION>
  ${lastAlterId ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  ` : ""}
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
exports.paymentBuilder = paymentBuilder;
