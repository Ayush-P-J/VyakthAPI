"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectMasterIds = collectMasterIds;
exports.packMasterIdRanges = packMasterIdRanges;
const node_string_decoder_1 = require("node:string_decoder");
// Default import: `sax` is CommonJS and assigns its exports inside an IIFE, so cjs-module-lexer
// detects neither named exports nor a callable namespace. See date-count-stream-parser.ts.
const sax_1 = __importDefault(require("sax"));
/**
 * Consumes the flat `<row><MASTERIDVALUE>...</MASTERIDVALUE></row>` stream produced by
 * ledgerMasterIdBuilder and returns the ids in ascending order.
 *
 * Deliberately NOT built on parseVoucherStream (electron/xml/stream-parser.ts) — that parser
 * accumulates every close-tag it doesn't special-case onto the parent object, which for a flat
 * one-row-per-record report would hold the entire response in memory at once. A sorted array of
 * numbers is a few hundred KB at 25k ledgers, against 24 MB for the real pull.
 */
async function collectMasterIds(inputStream) {
    const parser = sax_1.default.parser(true, { trim: true, normalize: true });
    const ids = [];
    let currentText = "";
    let parserError = null;
    parser.ontext = (text) => {
        // Append rather than overwrite: sax can fire ontext several times for one text node when it
        // straddles a network-chunk boundary, and overwriting would silently drop the earlier part.
        currentText += text;
    };
    parser.onclosetag = (tag) => {
        if (tag.toUpperCase() === "ROW") {
            const value = Number(currentText.trim());
            if (Number.isSafeInteger(value) && value > 0)
                ids.push(value);
            currentText = "";
        }
    };
    parser.onerror = (e) => {
        parserError = e;
        parser.resume();
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
    ids.sort((a, b) => a - b);
    return ids;
}
/**
 * Cuts sorted ids into contiguous half-open `(gt, lte]` ranges of at most `targetPerBatch` each.
 *
 * Ranges are chosen by id *count*, not by even id width: MasterIds cluster, so an evenly-spaced
 * split of the 30..133932 range measured 11639 / 4152 / 4161 / 5179 rather than four equal parts.
 * `gt` starts one below the first id so the first range is inclusive of it.
 */
function packMasterIdRanges(sortedIds, targetPerBatch) {
    const ranges = [];
    if (sortedIds.length === 0)
        return ranges;
    const size = Math.max(1, targetPerBatch);
    let gt = sortedIds[0] - 1;
    for (let i = 0; i < sortedIds.length; i += size) {
        const slice = sortedIds.slice(i, i + size);
        const lte = slice[slice.length - 1];
        ranges.push({ gt, lte, count: slice.length });
        gt = lte;
    }
    return ranges;
}
