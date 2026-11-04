"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godownBuilder = void 0;
const utils_1 = require("./utils");
const godownBuilder = (companyName, lastAlterId) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>GodownXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="GodownXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>GodownXML</FORMS>
  </REPORT>
  <FORM NAME="GodownXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>GodownXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="GodownXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>GodownXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>GodownXML : GodownXMLColl</REPEAT>
  </PART>
  <LINE NAME="GodownXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBIG_TALLYSLNO, MBIG_CMPID, MBIG_CMPNAME, MBI_GodownID, MBI_GodownAID, MBI_GodownName, MBI_GodownParent</LEFTFIELDS>
   <XMLTAG>&quot;GodownList&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_GodownID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_GodownAID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_GodownName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_GodownParent" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Parent</SET>
   <XMLTAG>&quot;Parent&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIG_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIG_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBIG_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="GodownXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Godown</TYPE>
   ${lastAlterId ? '<FILTERS>DeltaSyncFilter</FILTERS>' : ''}
  </COLLECTION>
  ${lastAlterId ? `
  <SYSTEM TYPE="Formulae" NAME="DeltaSyncFilter">
   $AlterId > ${lastAlterId}
  </SYSTEM>
  ` : ''}
</TDLMESSAGE> 
</TDL> 
</DESC> 
</BODY> 
</ENVELOPE> `;
};
exports.godownBuilder = godownBuilder;
