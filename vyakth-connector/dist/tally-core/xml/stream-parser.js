"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVoucherStream = parseVoucherStream;
const node_string_decoder_1 = require("node:string_decoder");
// Default import specifically — see the comment in date-count-stream-parser.ts: `sax` only
// resolves correctly under this bundle via the default-import interop binding.
const sax_1 = __importDefault(require("sax"));
// Confirmed live against a real TallyPrime instance: it emits "&#4;" (a numeric XML character
// reference to the control character EOT) as a marker prefixing certain default/system group and
// category names — e.g. "<STOCKGROUP>&#4; Primary</STOCKGROUP>", "<STOCKCATEGORY>&#4; Not
// Applicable</STOCKCATEGORY>". Codepoint 4 isn't a legal XML 1.0 character, so sax's strict
// parser rejects it outright ("Invalid character entity"), deterministically, on every voucher
// whose stock item belongs to one of these default groups — not an intermittent glitch. The
// reference carries no real data (it's an internal Tally formatting marker), so stripping it is
// safe; only genuinely illegal-for-XML references are touched, real ones (e.g. "&#8377;" the
// rupee sign) pass through untouched.
function isLegalXmlCodePoint(cp) {
    return (cp === 0x9 || cp === 0xa || cp === 0xd ||
        (cp >= 0x20 && cp <= 0xd7ff) ||
        (cp >= 0xe000 && cp <= 0xfffd) ||
        (cp >= 0x10000 && cp <= 0x10ffff));
}
function stripIllegalCharRefs(text) {
    return text.replace(/&#([xX][0-9A-Fa-f]+|[0-9]+);/g, (match, body) => {
        const cp = body[0] === 'x' || body[0] === 'X' ? parseInt(body.slice(1), 16) : parseInt(body, 10);
        return isLegalXmlCodePoint(cp) ? match : '';
    });
}
async function* parseVoucherStream(inputStream) {
    // No `normalize`: it collapses inner whitespace, turning a ledger named "EAGLE  TRADERS" into
    // "EAGLE TRADERS" so the cloud can't match it to the ledger master, whose name keeps both
    // spaces. Deliberately differs from h7001, which matches names locally.
    const parser = sax_1.default.parser(true, { trim: true });
    const queue = [];
    const stack = [];
    function parseValue(val) {
        if (val === "")
            return "";
        if (val.toLowerCase() === "true")
            return true;
        if (val.toLowerCase() === "false")
            return false;
        return val;
    }
    parser.onopentag = (node) => {
        const tag = node.name.toUpperCase();
        const obj = {};
        for (const [key, val] of Object.entries(node.attributes)) {
            obj[key.toUpperCase()] = val;
        }
        stack.push({ tag, obj, text: "" });
    };
    parser.ontext = (text) => {
        if (stack.length > 0 && text.trim() !== "") {
            stack[stack.length - 1].text += text;
        }
    };
    parser.onclosetag = () => {
        const top = stack.pop();
        if (!top)
            return;
        if (top.tag === 'LINEERROR' || top.tag === 'ERROR')
            throw new Error(`Tally XML error: ${top.text}`);
        const hasChildrenOrAttrs = Object.keys(top.obj).length > 0;
        let result;
        if (hasChildrenOrAttrs) {
            if (top.text.trim()) {
                top.obj["VALUE"] = parseValue(top.text.trim());
            }
            result = top.obj;
        }
        else {
            result = parseValue(top.text.trim());
        }
        // Every voucher builder's top-level LINE XMLTAG must appear here. A missing one is silent
        // data loss: the voucher is never yielded, and it accumulates on the root object instead —
        // the exact leak the early return below exists to prevent. STOCKJRNLTRANS
        // (stockjournal.builder.ts) was absent, so all stock journal vouchers were dropped without
        // any error being logged.
        if (top.tag === "ACCTRANS" ||
            top.tag === "INVTRANS" ||
            top.tag === "PHYSICALSTOCK" ||
            top.tag === "STOCKJRNLTRANS") {
            queue.push(result);
            // Return early to prevent attaching massive arrays to the parent (root) object, which causes memory leaks
            return;
        }
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            const parentObj = parent.obj;
            if (top.tag in parentObj) {
                const existing = parentObj[top.tag];
                const arr = Array.isArray(existing) ? existing : [existing];
                arr.push(result);
                parentObj[top.tag] = arr;
            }
            else {
                parentObj[top.tag] = result;
            }
        }
    };
    let parserError = null;
    parser.onerror = (e) => {
        parserError = e;
    };
    // Consume stream directly which gives automatic backpressure
    // A "&#4;"-style reference could straddle two chunks — hold back an unterminated trailing "&"
    // (long enough to cover the longest possible numeric reference, "&#x10FFFF;") until the next
    // chunk completes it, rather than sanitizing each chunk in isolation.
    let pending = "";
    const decoder = new node_string_decoder_1.StringDecoder('utf8');
    for await (const chunk of inputStream) {
        const combined = pending + (typeof chunk === 'string' ? chunk : decoder.write(chunk));
        const lastAmp = combined.lastIndexOf("&");
        let toWrite;
        if (lastAmp !== -1 && combined.length - lastAmp < 12 && !combined.slice(lastAmp).includes(";")) {
            toWrite = combined.slice(0, lastAmp);
            pending = combined.slice(lastAmp);
        }
        else {
            toWrite = combined;
            pending = "";
        }
        parser.write(stripIllegalCharRefs(toWrite));
        if (parserError) {
            throw parserError;
        }
        while (queue.length > 0) {
            yield queue.shift();
        }
    }
    pending += decoder.end();
    if (pending) {
        parser.write(stripIllegalCharRefs(pending));
    }
    parser.close();
    if (parserError) {
        throw parserError;
    }
    while (queue.length > 0) {
        yield queue.shift();
    }
}
