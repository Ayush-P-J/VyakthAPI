"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.countVouchersByDate = countVouchersByDate;
const node_string_decoder_1 = require("node:string_decoder");
// Default import specifically. `sax` is CommonJS and assigns its exports inside an IIFE
// (`})(typeof exports === 'undefined' ? ... : exports)`), so Node's cjs-module-lexer can detect
// neither named exports (`import { parser }` → "does not provide an export named 'parser'") nor a
// usable namespace (`import * as sax` → "sax.parser is not a function"). The interop default —
// the whole module.exports object — is the only form that resolves correctly under both Node ESM
// and the Vite/Rollup main-process bundle. stream-parser.ts sidesteps this with a bare `require`,
// which lint rejects.
const sax_1 = __importDefault(require("sax"));
const tally_parsers_1 = require("../utils/tally-parsers");
/**
 * Consumes the flat `<row><DATEVALUE>...</DATEVALUE></row>` stream produced by
 * voucherDateCountBuilder and returns a count per day, keyed by Tally SVFromDate/SVToDate
 * format (YYYYMMDD) so keys sort chronologically as plain strings.
 *
 * Deliberately NOT built on parseVoucherStream (electron/xml/stream-parser.ts) — that parser
 * accumulates every close-tag it doesn't special-case onto the parent object, which for a
 * flat one-row-per-voucher report would mean holding every row in memory at once, defeating
 * the entire point of a cheap pre-count pass. Memory footprint here is O(distinct dates)
 * (at most ~366 map entries per financial-year window), not O(voucher count).
 */
async function countVouchersByDate(inputStream) {
    const parser = sax_1.default.parser(true, { trim: true, normalize: true });
    const counts = new Map();
    let currentText = "";
    let parserError = null;
    parser.ontext = (text) => {
        // Append, don't overwrite: sax can fire ontext multiple times for a single text node when
        // it's split across network-chunk boundaries (same reasoning as stream-parser.ts's
        // `stack[stack.length-1].text += text`) — overwriting would silently drop an earlier
        // fragment and corrupt the date reading whenever a chunk boundary lands mid-value.
        currentText += text;
    };
    parser.onclosetag = (tag) => {
        if (tag.toUpperCase() === "ROW") {
            if (currentText.trim()) {
                const normalized = (0, tally_parsers_1.parseTallyDate)(currentText.trim());
                if (normalized) {
                    const key = normalized.replace(/-/g, "");
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                }
            }
            currentText = "";
        }
    };
    parser.onerror = (e) => {
        parserError = e;
    };
    const decoder = new node_string_decoder_1.StringDecoder('utf8');
    for await (const chunk of inputStream) {
        parser.write(typeof chunk === 'string' ? chunk : decoder.write(chunk));
        if (parserError)
            throw parserError;
    }
    parser.write(decoder.end());
    parser.close();
    if (parserError)
        throw parserError;
    return counts;
}
