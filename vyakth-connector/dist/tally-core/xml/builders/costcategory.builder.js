"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costCategoryBuilder = void 0;
const utils_1 = require("./utils");
const costCategoryBuilder = (companyName, lastAlterId) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>CostCategoryXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="CostCategoryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>CostCategoryXML</FORMS>
  </REPORT>
  <FORM NAME="CostCategoryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>CostCategoryXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="CostCategoryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>CostCategoryXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>CostCategoryXML : CostCategoryColl</REPEAT>
  </PART>
  <LINE NAME="CostCategoryXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBI_TALLYSLNO, MBI_CMPID, MBI_CMPNAME, MBI_CostCategoryMID, MBI_CostCategoryAID, MBI_CostCategoryName</LEFTFIELDS>
   <XMLTAG>&quot;CostCategoryList&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_CostCategoryMID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_CostCategoryAID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_CostCategoryName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$NAME</SET>
   <XMLTAG>&quot;NAME&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SVCurrentCompany</SET>
   <XMLTAG>&quot;COMPANYID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SVCurrentCompany</SET>
   <XMLTAG>&quot;COMPANYNAME&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$SysName:TallySerialNo</SET>
   <XMLTAG>&quot;TALLYSERIAL&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="CostCategoryColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>CostCategory</TYPE>
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
</ENVELOPE>`;
};
exports.costCategoryBuilder = costCategoryBuilder;
