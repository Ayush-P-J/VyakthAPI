"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profitandLossBuilder = void 0;
const utils_1 = require("./utils");
const profitandLossBuilder = (companyName) => {
    return `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>Profit and Loss</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
                <SVFROMDATE TYPE="Date">01-Apr-2025</SVFROMDATE>
                <SVTODATE TYPE="Date">31-Mar-2026</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <EXPLODEFLAG>Yes</EXPLODEFLAG>
            </STATICVARIABLES>
        </DESC>
    </BODY>
</ENVELOPE>`;
};
exports.profitandLossBuilder = profitandLossBuilder;
