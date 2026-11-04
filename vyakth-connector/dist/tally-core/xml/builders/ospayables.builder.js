"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oSPayablesBuilder = void 0;
const utils_1 = require("./utils");
const outstanding_context_builder_1 = require("./outstanding-context.builder");
const oSPayablesBuilder = (companyName, snapshot = false) => {
    const context = snapshot
        ? (0, outstanding_context_builder_1.outstandingContext)("OSPayablesXMLColl", "outstanding_payable")
        : null;
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>OSPayablesXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="OSPayablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>OSPayablesXML</FORMS>
   <VARIABLES>SVFromDate</VARIABLES><VARIABLES>SVToDate</VARIABLES>
   <SET>SVFromDate       : $$FinYearBeg:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
   ${context ? `<SET>SVToDate : $$MachineDate</SET>` : `<SET>SVToDate : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>`}
  </REPORT>
  <FORM NAME="OSPayablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>${context ? "VyakthOutstandingContext, " : ""}OSPayablesXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="OSPayablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>OSPayablesXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>OSPayablesXML : OSPayablesXMLColl</REPEAT>
  </PART>
  <LINE NAME="OSPayablesXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBIOSP_TALLYSLNO, MBIOSP_CMPID, MBIOSP_CMPNAME, MBI_BPName, MBI_BPNameID, MBI_BPBillDate, MBI_BPBillName, MBI_BPBillDueDate, MBI_BPBillAmount, MBI_BPBillAmountCrDr, MBI_BPBillClosing, MBI_BPBillClosingCrDr</LEFTFIELDS>
   <XMLTAG>&quot;billsreceivables&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_BPName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$LedgerNAme</SET>
   <XMLTAG>&quot;LedgerName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPNameID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Ledger:$LedgerNAme</SET>
   <XMLTAG>&quot;LedgerNameID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillDate</SET>
   <XMLTAG>&quot;BillDate&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillDueDate" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$BillCreditPeriod</SET>
   <XMLTAG>&quot;BillCreditPeriod&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$OpeningBalance</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillAmountCrDr" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$OpeningBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isOpeningdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillClosing" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$ClosingBalance</SET>
   <XMLTAG>&quot;ClosingBalance&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_BPBillClosingCrDr" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $$IsDr:$ClosingBalance Then &quot;Dr&quot; Else &quot;Cr&quot;</SET>
   <XMLTAG>&quot;isClosingdeemedpositive&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSP_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSP_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIOSP_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  ${context?.tdl ?? ""}
  <COLLECTION NAME="OSPayablesXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Bills</TYPE>
   <FILTERS>IsPayable</FILTERS>
   <NATIVEMETHOD>Name, ClosingBalance</NATIVEMETHOD>
  </COLLECTION>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.oSPayablesBuilder = oSPayablesBuilder;
