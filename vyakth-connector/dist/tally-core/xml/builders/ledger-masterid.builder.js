"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerMasterIdBuilder = void 0;
const utils_1 = require("./utils");
/**
 * Lightweight report returning one row per ledger — just its `$MasterId`, nothing else — so batch
 * boundaries can be chosen before issuing any expensive request. A few bytes per row instead of a
 * full ledger's worth of nested address/bill XML: the whole probe is a fraction of the 24 MB the
 * real ledger pull costs.
 *
 * Same shape as voucher-date-count.builder.ts, which does the equivalent job for vouchers. Ids are
 * returned unsorted and unbatched; the caller sorts and packs them into equal-*count* ranges —
 * equal-width id ranges produce badly uneven batches, since MasterIds are not evenly distributed
 * (a 4-way even split of 25,131 ledgers measured 11639 / 4152 / 4161 / 5179).
 */
const ledgerMasterIdBuilder = (companyName) => {
    const uid = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const reportName = `LedgerMasterIdReport_${uid}`;
    const formName = `LedgerMasterIdForm_${uid}`;
    const partName = `LedgerMasterIdPart_${uid}`;
    const lineName = `LedgerMasterIdLine_${uid}`;
    const fieldName = `LedgerMasterIdField_${uid}`;
    const collName = `LedgerMasterIdColl_${uid}`;
    return `
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>${reportName}</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<REPORT NAME="${reportName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <FORMS>${formName}</FORMS>
</REPORT>
<FORM NAME="${formName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPPARTS>${partName}</TOPPARTS>
   <DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE>
   <ADD>XMLTag : &quot;data&quot;</ADD>
</FORM>
<PART NAME="${partName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TOPLINES>${lineName}</TOPLINES>
   <SCROLLED>Vertical</SCROLLED>
   <REPEAT>${lineName} : ${collName}</REPEAT>
</PART>
<LINE NAME="${lineName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <LEFTFIELDS>${fieldName}</LEFTFIELDS>
   <XMLTAG>&quot;row&quot;</XMLTAG>
</LINE>
<FIELD NAME="${fieldName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <USE>NameField</USE>
   <SET>$MasterId</SET>
   <XMLTAG>&quot;MASTERIDVALUE&quot;</XMLTAG>
</FIELD>
<COLLECTION NAME="${collName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Ledger</TYPE>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>
`;
};
exports.ledgerMasterIdBuilder = ledgerMasterIdBuilder;
