"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accVchWithIDBuilder = void 0;
const utils_1 = require("./utils");
const accVchWithIDBuilder = (companyName) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>AccTransIDXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
 <REPORT NAME="AccTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>AccTransIDXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
  </REPORT>
  <FORM NAME="AccTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>AccTransIDXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="AccTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>AccTransIDXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>AccTransIDXML : TSAPID_VCHIDCOLL</REPEAT>
  </PART>
  <PART NAME="TSAPID_RepDtlsLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TSAPID_RepDtlsLedger</TOPLINES>
   <REPEAT>TSAPID_RepDtlsLedger : LedgerEntries</REPEAT>
  </PART>
  <PART NAME="TSAPID_RepDtlsBills" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TSAPID_RepDtlsBills</TOPLINES>
   <REPEAT>TSAPID_RepDtlsBills : BillAllocations</REPEAT>
  </PART>
  <PART NAME="TSAPID_RepDtlsBankTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TSAPID_RepDtlsBankTrans</TOPLINES>
   <REPEAT>TSAPID_RepDtlsBankTrans : BankAllocations</REPEAT>
  </PART>
  <PART NAME="TSAPID_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TSAPID_RepDtlsCostCategory</TOPLINES>
   <REPEAT>TSAPID_RepDtlsCostCategory : CategoryAllocations</REPEAT>
  </PART>
  <PART NAME="TSAPID_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>TSAPID_RepDtlsCostCentre</TOPLINES>
   <REPEAT>TSAPID_RepDtlsCostCentre : CostCentreAllocations</REPEAT>
  </PART>
  <LINE NAME="AccTransIDXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_TALLYSLNO, TSAPID_CMPID, TSAPID_CMPNAME, TSAPID_MID, TSAPID_ALTERID, TSAPID_ISCANCEL, TSAPID_ISOPTIONAL, TSAPID_MAINVCHTYPE, TSAPID_MAINVCHTYPEID, TSAPID_VCHTYPE, TSAPID_VCHTYPEID, TSAPID_VCHNo, TSAPID_VCHDt, TSAPID_VCHRef, TSAPID_VCHRefDt, TSAPID_VCHNARR</LEFTFIELDS>
   <EXPLODE>TSAPID_RepDtlsLedger</EXPLODE>
   <XMLTAG>&quot;acctrans&quot;</XMLTAG>
  </LINE>
  <LINE NAME="TSAPID_RepDtlsLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_Ledger, TSAPID_LedgerID, TSAPID_LedgerGroup, TSAPID_LedgerGroupID, TSAPID_LedgerType, TSAPID_Amount, TSAPID_Isdeemed</LEFTFIELDS>
   <XMLTAG>&quot;LedgerEntries&quot;</XMLTAG>
   <EXPLODE>TSAPID_RepDtlsBills</EXPLODE>
   <EXPLODE>TSAPID_RepDtlsBankTrans</EXPLODE>
   <EXPLODE>TSAPID_RepDtlsCostCategory</EXPLODE>
  </LINE>
  <LINE NAME="TSAPID_RepDtlsBills" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_RefLedger, TSAPID_RefLedgerID, TSAPID_RefType, TSAPID_BillNo, TSAPID_BillExp, TSAPID_RefAmount, TSAPID_RefIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;billallocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="TSAPID_RepDtlsBankTrans" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_BankLedger, TSAPID_BankTransType, TSAPID_BankInstNo, TSAPID_BankInstDate, TSAPID_BankAmount, TSAPID_BankIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;bankallocations&quot;</XMLTAG>
  </LINE>
  <LINE NAME="TSAPID_RepDtlsCostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_CostCategory, TSAPID_CostCategoryID</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryAllocations&quot;</XMLTAG>
   <EXPLODE>TSAPID_RepDtlsCostCentre</EXPLODE>
  </LINE>
  <LINE NAME="TSAPID_RepDtlsCostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>TSAPID_CostCentre, TSAPID_CostCentreID, TSAPID_CostCentreAmount, TSAPID_CostCentreIsdeemed</LEFTFIELDS>
   <XMLTAG>&quot;CostCentreAllocations&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="TSAPID_MID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_ALTERID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_ISCANCEL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISCANCELLED</SET>
   <XMLTAG>&quot;ISCANCELLED&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_ISOPTIONAL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ISOPTIONAL</SET>
   <XMLTAG>&quot;ISOPTIONAL&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_MAINVCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeOrigName:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;MainVoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_MAINVCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:($Parent:VoucherType:$VoucherTypeName)</SET>
   <XMLTAG>&quot;MainVoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHTYPE" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHTYPEID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:VoucherType:$VoucherTypeName</SET>
   <XMLTAG>&quot;VoucherTypeNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$VoucherNumber</SET>
   <XMLTAG>&quot;VoucherNumber&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Date</SET>
   <XMLTAG>&quot;Date&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHRef" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Reference</SET>
   <XMLTAG>&quot;Reference&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHRefDt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ReferenceDate</SET>
   <XMLTAG>&quot;ReferenceDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_VCHNARR" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Narration</SET>
   <XMLTAG>&quot;Narration&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_Ledger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_LedgerID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MAsterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_LedgerGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Parent:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerGroup&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_LedgerGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MAsterID:Group:($Parent:Ledger:$LedgerName)</SET>
   <XMLTAG>&quot;LedgerGroupID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_LedgerType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsLedOfGrp:$LedgerName:$$GroupCash Then &quot;Cash Transaction&quot; Else if  ($$IsLedOfGrp:$LedgerName:$$GroupBank or $$IsLedOfGrp:$LedgerName:$$GroupBankOD) Then &quot;Bank Transaction&quot; Else &quot;Other Transaction&quot;</SET>
   <XMLTAG>&quot;LedgerType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_Amount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_Isdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;Isdeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_RefLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerName</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_RefLedgerID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$LedgerName</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_RefType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillType</SET>
   <XMLTAG>&quot;BillType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BillNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;BillNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BillExp" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillExpiryPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_RefAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_RefIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankLedger" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BankPartyName</SET>
   <XMLTAG>&quot;BankLedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankTransType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$TransactionType</SET>
   <XMLTAG>&quot;TransType&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankInstNo" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$InstrumentNumber</SET>
   <XMLTAG>&quot;InstantNo&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankInstDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$InstrumentDate</SET>
   <XMLTAG>&quot;InstantDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_BankIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCategory" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$Category</SET>
   <XMLTAG>&quot;CategoryName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCategoryID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCategory:$Category</SET>
   <XMLTAG>&quot;CategoryNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCentre" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$NAme</SET>
   <XMLTAG>&quot;CostCentreName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCentreID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NAmeField</USE>
   <SET>$MasterID:CostCentre:$NAme</SET>
   <XMLTAG>&quot;CostCentreNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCentreAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$Amount</SET>
   <XMLTAG>&quot;Amount&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CostCentreIsdeemed" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$Amount Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;IsDeemed&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="TSAPID_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="TSAPID_VCHIDCOLL" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <PARMVAR>vvtempid : String : &quot;ID:7&quot;</PARMVAR>
   <OBJECTS>Voucher:##vvtempid</OBJECTS>
  </COLLECTION>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.accVchWithIDBuilder = accVchWithIDBuilder;
