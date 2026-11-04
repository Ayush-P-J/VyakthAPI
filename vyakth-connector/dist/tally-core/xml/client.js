"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tallyClient = void 0;
const node_http_1 = __importDefault(require("node:http"));
class TallyClient {
    port = 9000;
    host = '127.0.0.1';
    configure(host, port) {
        this.host = host;
        this.port = port;
    }
    getConfig() {
        return { host: this.host, port: this.port };
    }
    request(options) {
        return this.attempt(options, options.retries ?? 0);
    }
    attempt(options, retriesLeft) {
        return new Promise((resolve, reject) => {
            let settled = false;
            let retrying = false;
            const bodyBuffer = Buffer.from(options.data, 'utf8');
            const req = node_http_1.default.request({
                hostname: this.host,
                port: this.port,
                method: options.method ?? 'POST',
                path: '/',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Content-Length': bodyBuffer.length,
                },
                timeout: options.timeout ?? 120_000,
            }, (res) => {
                if ((res.statusCode ?? 500) >= 400) {
                    res.resume();
                    reject(new Error(`Tally HTTP ${res.statusCode}`));
                    return;
                }
                if (options.responseType === 'stream') {
                    // Return the raw Node.js response stream
                    settled = true;
                    resolve({ data: res });
                }
                else {
                    // Buffer the entire response for master data endpoints
                    const chunks = [];
                    let bytes = 0;
                    res.on('data', (chunk) => {
                        bytes += chunk.length;
                        if (bytes > (options.maxResponseBytes ?? Infinity)) {
                            res.destroy(new Error('Tally response exceeds the configured byte limit'));
                            return;
                        }
                        chunks.push(chunk);
                    });
                    res.on('error', reject);
                    res.on('end', () => {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        settled = true;
                        resolve({ data: raw });
                    });
                }
            });
            req.on('error', (error) => { if (!retrying)
                reject(error); });
            req.on('timeout', () => {
                if (!settled && retriesLeft > 0) {
                    retrying = true;
                    req.destroy();
                    const delay = options.retryDelayMs ?? 1000;
                    console.warn(`[TallyClient] request timed out after ${options.timeout ?? 120_000}ms, retrying in ${delay}ms (${retriesLeft} attempt(s) left)`);
                    setTimeout(() => {
                        this.attempt(options, retriesLeft - 1).then(resolve, reject);
                    }, delay);
                    return;
                }
                const error = new Error(`Tally request timed out after ${options.timeout ?? 120_000}ms`);
                req.destroy(error);
                reject(error);
            });
            req.write(bodyBuffer);
            req.end();
        });
    }
}
exports.tallyClient = new TallyClient();
