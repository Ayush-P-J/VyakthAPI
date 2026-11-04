"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerGroupsBuilder = void 0;
const utils_1 = require("./utils");
const ledgerGroupsBuilder = (companyName, lastAlterId) => {
    return `<ENVELOPE> 
<HEADER> 
<VERSION>1</VERSION> 
<TALLYREQUEST>Export</TALLYREQUEST> 
<TYPE>Data</TYPE> 
<ID>LedgerGroupXML</ID> 
</HEADER> 
<BODY> 
<DESC> 
<STATICVARIABLES> 
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES> 
<TDL> 
<TDLMESSAGE> 
<REPORT NAME="LedgerGroupXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>LedgerGroupXML</FORMS>
  </REPORT>
  <FORM NAME="LedgerGroupXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>LedgerGroupXML</TOPPARTS>
   <HEIGHT>100 % PAge</HEIGHT>
   <WIDTH>100 % PAge</WIDTH>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
  </FORM>
  <PART NAME="LedgerGroupXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>LedgerGroupXML</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <VERTICAL>Yes</VERTICAL>
   <REPEAT>LedgerGroupXML : LedGroupXMLColl</REPEAT>
  </PART>
  <LINE NAME="LedgerGroupXML" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>MBILG_TALLYSLNO, MBILG_CMPID, MBILG_CMPNAME, MBI_LedGroupID, MBI_LedGroupAID, MBI_LedGroupName, MBI_LedGroupParent, MBI_LedGroupType, MBI_LedGroupPrimaryGroup, MBI_LedGroupAffectsGP</LEFTFIELDS>
   <XMLTAG>&quot;LedgerGroupList&quot;</XMLTAG>
  </LINE>
  <FIELD NAME="MBI_LedGroupID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupAID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$ALTERID</SET>
   <XMLTAG>&quot;ALTERID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Name</SET>
   <XMLTAG>&quot;Name&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupParent" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$Parent</SET>
   <XMLTAG>&quot;Parent&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>if $IsRevenue then @AsRevenue ELSE @AsNonRevenue</SET>
   <LOCALFORMULA>AsRevenue   : if $IsDeemedPositive then @@ExpensesNature else @@IncomeNature</LOCALFORMULA>
   <LOCALFORMULA>AsNonRevenue: if $IsDeemedPositive then @@AssetsNature   else @@LiabilitiesNature</LOCALFORMULA>
   <XMLTAG>&quot;Nature&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupPrimaryGroup" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$PRIMARYGROUP</SET>
   <XMLTAG>&quot;PRIMARYGROUP&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBI_LedGroupAffectsGP" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$AFFECTSGROSSPROFIT</SET>
   <XMLTAG>&quot;AFFECTSGROSSPROFIT&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILG_TALLYSLNO" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$$LicenseInfo:SerialNumber</SET>
   <XMLTAG>&quot;TallySerial&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILG_CMPID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$CMPVCHID:Company:##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyID&quot;</XMLTAG>
  </FIELD>
  <FIELD NAME="MBILG_CMPNAME" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>##SvCurrentCompany</SET>
   <XMLTAG>&quot;CompanyName&quot;</XMLTAG>
  </FIELD>
  <COLLECTION NAME="LedGroupXMLColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Group</TYPE>
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
exports.ledgerGroupsBuilder = ledgerGroupsBuilder;
