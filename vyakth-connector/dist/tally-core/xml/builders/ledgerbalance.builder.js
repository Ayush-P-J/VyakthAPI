"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerBalanceBuilder = void 0;
const utils_1 = require("./utils");
const ledgerBalanceBuilder = (companyName) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>LedgerBalanceXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="LedgerBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>LedgerBalanceXML</FORMS>
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
  </REPORT>
  <FORM NAME="LedgerBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>LedgerBalanceXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="LedgerBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>LedgerBalanceXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>LedgerBalanceXML : LedBalanceXMLColl</REPEAT>
  </PART>
  <LINE NAME="LedgerBalanceXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBILOP_TALLYSLNO, MBILOP_CMPID, MBILOP_CMPNAME, MBI_LedBalID, MBI_LedBalName, MBI_LedBalParent, MBI_LedBalParentid, MBI_LedOPAmount, MBI_LedTransDrAmt, MBI_LedTransCrAmt, MBI_LedCLAmount</LEFTFIELDS>
   <XMLTAG>&quot;LedgerBalance&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_LedBalID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedBalName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedBalParent" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Parent</SET>
   <XMLTAG>&quot;Parent&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedBalParentid" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterID:Group:$Parent</SET>
   <XMLTAG>&quot;ParentID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedOPAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalOpening</SET>
   <XMLTAG>&quot;OpeningBalance&quot;</XMLTAG>
   <FORMAT>&quot;DrCr&quot;</FORMAT>
  </FIELD>
  <FIELD NAME="MBI_LedTransDrAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalDebits</SET>
   <XMLTAG>&quot;DebitTotals&quot;</XMLTAG>
   <FORMAT>&quot;DrCr&quot;</FORMAT>
  </FIELD>
  <FIELD NAME="MBI_LedTransCrAmt" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalCredits</SET>
   <XMLTAG>&quot;CreditTotals&quot;</XMLTAG>
   <FORMAT>&quot;DrCr&quot;</FORMAT>
  </FIELD>
  <FIELD NAME="MBI_LedCLAmount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>AmountField</USE>
   <SET>$TBalClosing</SET>
   <XMLTAG>&quot;ClosingBalance&quot;</XMLTAG>
   <FORMAT>&quot;DrCr&quot;</FORMAT>
  </FIELD>
  <FIELD NAME="MBILOP_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILOP_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILOP_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="LedBalanceXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Ledger</TYPE>
  </COLLECTION>
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.ledgerBalanceBuilder = ledgerBalanceBuilder;
