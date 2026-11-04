"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesBuilder = void 0;
const companiesBuilder = () => {
    return `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Company Collection</ID>
    </HEADER>

    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>

            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Company Collection">
                        <TYPE>Company</TYPE>
                        <NATIVEMETHOD>Name</NATIVEMETHOD>
                        <COMPUTE>TallySerial : $$LicenseInfo:SerialNumber</COMPUTE>
                        <FETCH>NAME, GUID, EMAIL, STARTINGFROM, BOOKSFROM, STATENAME, PINCODE,
                               COUNTRYNAME, PHONENUMBER, MOBILENUMBER, WEBSITE,
                               INCOMETAXNUMBER, GSTREGISTRATIONNUMBER, INDIANVAT, TallySerial</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;
};
exports.companiesBuilder = companiesBuilder;
