"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oSReceivablesBuilder = void 0;
const utils_1 = require("./utils");
const outstanding_context_builder_1 = require("./outstanding-context.builder");
const oSReceivablesBuilder = (companyName, snapshot = false) => {
    const context = snapshot
        ? (0, outstanding_context_builder_1.outstandingContext)("OSReceivablesXMLColl", "outstanding_receivable")
        : null;
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>OSReceivablesXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
 <REPORT NAME="OSReceivablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>OSReceivablesXML</FORMS>
   <VARIABLES>SVFromDate</VARIABLES><VARIABLES>SVToDate</VARIABLES>
   <SET>SVFromDate       : $$FinYearBeg:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
   ${context ? `<SET>SVToDate : $$MachineDate</SET>` : `<SET>SVToDate : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>`}
  </REPORT>
  <FORM NAME="OSReceivablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>${context ? "VyakthOutstandingContext, " : ""}OSReceivablesXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="OSReceivablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>OSReceivablesXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>OSReceivablesXML : OSReceivablesXMLColl</REPEAT>
  </PART>
  <LINE NAME="OSReceivablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBIOSR_TALLYSLNO, MBIOSR_CMPID, MBIOSR_CMPNAME, MBI_BRName, MBI_BRNameID, MBI_BRBillDate, MBI_BRBillName, MBI_BRBillDueDate, MBI_BRBillAmount, MBI_BRBillAmountCrDr, MBI_BRBillClosing, MBI_BRBillClosingCrDr</LEFTFIELDS>
   <XMLTAG>&quot;billsreceivables&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_BRName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerNAme</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$LedgerNAme</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillDate</SET>
   <XMLTAG>&quot;BillDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillDueDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillCreditPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillAmountCrDr" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$OpeningBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isOpeningdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillClosing" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ClosingBalance</SET>
   <XMLTAG>&quot;ClosingBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BRBillClosingCrDr" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$ClosingBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isClosingdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSR_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSR_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSR_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  ${context?.tdl ?? ""}
  <COLLECTION NAME="OSReceivablesXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Bills</TYPE>
   <FILTERS>IsReceivable</FILTERS>
   <NATIVEMETHOD>Name, ClosingBalance</NATIVEMETHOD>
  </COLLECTION>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.oSReceivablesBuilder = oSReceivablesBuilder;
