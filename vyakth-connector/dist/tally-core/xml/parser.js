"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTallyXml = parseTallyXml;
const fast_xml_parser_1 = require("fast-xml-parser");
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    attributeNamePrefix: "",
    textNodeName: "value",
    // Codes like HSN/SAC ("0910") carry meaning in their leading zeros — fast-xml-parser's
    // default (`leadingZeros: true`) numeric coercion would silently turn that into 910,
    // corrupting the code. Disabling it leaves any leading-zero value as a string; plain
    // numbers (amounts, quantities, a bare "0") never have a leading zero, so they're
    // unaffected.
    numberParseOptions: {
        hex: true,
        leadingZeros: false,
    },
    // Decode numeric character references. Without it a ledger typed with trailing line breaks
    // arrives as "E V HUB&#13;&#10;" while vouchers (sax, which decodes) name it "E V HUB", and
    // "&#x20B9;" stays literal instead of "₹". Deliberately differs from h7001.
    htmlEntities: true,
});
function parseTallyXml(xml) {
    const validation = fast_xml_parser_1.XMLValidator.validate(xml);
    if (validation !== true)
        throw new Error(`Invalid Tally XML: ${validation.err.msg}`);
    const result = parser.parse(xml);
    const error = result?.ENVELOPE?.BODY?.DATA?.LINEERROR ?? result?.ENVELOPE?.LINEERROR ?? result?.LINEERROR;
    if (error)
        throw new Error(`Tally XML error: ${typeof error === 'string' ? error : JSON.stringify(error)}`);
    return result;
}
