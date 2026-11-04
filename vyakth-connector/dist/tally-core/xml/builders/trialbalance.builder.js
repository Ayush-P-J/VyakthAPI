"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trialBalanceBuilder = void 0;
const utils_1 = require("./utils");
const trialBalanceBuilder = (companyName) => {
    return `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>Trial Balance</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">01-Apr-2025</SVFROMDATE>
                <SVTODATE TYPE="Date">31-Mar-2026</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY> 
                <EXPLODEFLAG>Yes</EXPLODEFLAG>
                <SHOWOPENING>Yes</SHOWOPENING>
                <SHOWTRANSACTIONS>Yes</SHOWTRANSACTIONS>
                <SHOWCLOSING>Yes</SHOWCLOSING>           
             </STATICVARIABLES>
        </DESC>
    </BODY>
</ENVELOPE>`;
};
exports.trialBalanceBuilder = trialBalanceBuilder;
