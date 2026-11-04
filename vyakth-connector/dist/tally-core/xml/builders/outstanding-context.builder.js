"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outstandingContext = outstandingContext;
// Tally exports repeated object lines. A singleton company line keeps the
// confirmation visible even when the bill collection is empty.
function outstandingContext(collection, reportType) {
    return {
        tdl: `
    <PART NAME="VyakthOutstandingContext" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><TOPLINES>VyakthOutstandingContext</TOPLINES><REPEAT>VyakthOutstandingContext : VyakthOutstandingCompany</REPEAT><SCROLLED>Vertical</SCROLLED></PART>
    <LINE NAME="VyakthOutstandingContext" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><LEFTFIELDS>VyakthReportCompany,VyakthReportAsOf,VyakthReportCount,VyakthReportType</LEFTFIELDS><XMLTAG>"reportcontext"</XMLTAG></LINE>
    <FIELD NAME="VyakthReportCompany" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><USE>NameField</USE><SET>##SVCurrentCompany</SET><XMLTAG>"companyname"</XMLTAG></FIELD>
    <FIELD NAME="VyakthReportAsOf" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><USE>NameField</USE><SET>##SVToDate</SET><XMLTAG>"asof"</XMLTAG></FIELD>
    <FIELD NAME="VyakthReportCount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><USE>NumberField</USE><SET>$$NumItems:${collection}</SET><XMLTAG>"recordcount"</XMLTAG></FIELD>
    <FIELD NAME="VyakthReportType" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"><USE>NameField</USE><SET>"${reportType}"</SET><XMLTAG>"reporttype"</XMLTAG></FIELD>
    <COLLECTION NAME="VyakthOutstandingCompany" ISMODIFY="No"><TYPE>Company</TYPE><FILTERS>VyakthOutstandingCurrentCompany</FILTERS></COLLECTION>
    <SYSTEM TYPE="Formulae" NAME="VyakthOutstandingCurrentCompany">$Name = ##SVCurrentCompany</SYSTEM>`,
    };
}
