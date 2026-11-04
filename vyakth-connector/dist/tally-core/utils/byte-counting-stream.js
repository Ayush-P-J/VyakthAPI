"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createByteCounter = createByteCounter;
const node_stream_1 = require("node:stream");
/**
 * Pass-through transform that counts bytes flowing through it, for XML-size metrics/thresholds
 * without buffering the response (piped between the raw Tally HTTP stream and the SAX parser).
 */
function createByteCounter() {
    let bytes = 0;
    const stream = new node_stream_1.Transform({
        transform(chunk, _enc, callback) {
            bytes += chunk.length;
            callback(null, chunk);
        },
    });
    return { stream, getBytes: () => bytes };
}
