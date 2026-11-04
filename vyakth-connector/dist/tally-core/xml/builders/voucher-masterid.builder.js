"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherMasterIdBuilder = void 0;
const utils_1 = require("./utils");
/**
 * Lightweight report returning one row per voucher — just its `$MASTERID`, nothing else — for one
 * voucher type, full lifetime (no date range). Same shape/purpose as ledger-masterid.builder.ts,
 * applied to vouchers: a few bytes per row instead of a full voucher's worth of nested XML, cheap
 * enough to run periodically as the deleted-voucher-detection probe (see deleted-voucher-sync.ts)
 * without competing with the real sync's Tally traffic.
 *
 * No date range parameter, unlike voucher-date-count.builder.ts/the real voucher builders — the
 * whole point of this probe is a full-lifetime snapshot of "every MasterId that currently exists",
 * diffed against everything stored for this company+type in h7004 (see
 * RecordPromoterDrizzleRepository.applyVoucherDeletionSnapshot); windowing it would mean either
 * missing deletions outside the window or reconciling partial windows, which is exactly the
 * fragility that design avoids by not chunking/windowing the snapshot at all. Reuses the same
 * `Vouchers : VoucherType` / `CHILDOF` / `BELONGSTO` collection shape voucher-date-count.builder.ts
 * already confirmed works (a SOURCECOLLECTION-derived alternative does not reliably honor custom
 * voucher type names — see that file's own doc comment).
 */
const voucherMasterIdBuilder = (companyName, voucherTypeSystemVar) => {
    const uid = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const reportName = `VoucherMasterIdReport_${uid}`;
    const formName = `VoucherMasterIdForm_${uid}`;
    const partName = `VoucherMasterIdPart_${uid}`;
    const lineName = `VoucherMasterIdLine_${uid}`;
    const fieldName = `VoucherMasterIdField_${uid}`;
    const collName = `VoucherMasterIdColl_${uid}`;
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
   <VARIABLES>SvFromDAte, SvToDate</VARIABLES>
   <SET>SVFromDate       : $StartingFrom:Company:##SVCurrentCompany</SET>
   <SET>SVToDate         : $$FinYearEnd:##SVCurrentDate:$StartingFrom:Company:##SVCurrentCompany</SET>
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
   <SET>$MASTERID</SET>
   <XMLTAG>&quot;MASTERIDVALUE&quot;</XMLTAG>
</FIELD>
<COLLECTION NAME="${collName}" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No">
   <TYPE>Vouchers : VoucherType</TYPE>
   <CHILDOF>${voucherTypeSystemVar}</CHILDOF>
   <BELONGSTO>Yes</BELONGSTO>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>
`;
};
exports.voucherMasterIdBuilder = voucherMasterIdBuilder;
