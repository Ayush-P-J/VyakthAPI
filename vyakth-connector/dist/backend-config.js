"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBackendUrl = normalizeBackendUrl;
exports.configuredBackendUrl = configuredBackendUrl;
exports.configuredWebUrl = configuredWebUrl;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
function normalizeBackendUrl(value) {
    const url = new URL(value);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase());
    if (!["http:", "https:"].includes(url.protocol) ||
        (url.protocol === "http:" && !isLoopback) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash) {
        throw new Error("Use HTTPS for remote backends. HTTP is allowed only for localhost development.");
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    if (!url.pathname.endsWith("/api"))
        url.pathname += "/api";
    return url.toString().replace(/\/$/, "");
}
function configuredBackendUrl(packaged = false) {
    if (process.env.VYAKTH_CLOUD_URL !== undefined)
        return normalizeBackendUrl(process.env.VYAKTH_CLOUD_URL.trim());
    const configPath = node_path_1.default.join(__dirname, "backend-config.json");
    if ((0, node_fs_1.existsSync)(configPath)) {
        const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, "utf8"));
        if (!config ||
            typeof config !== "object" ||
            !("backendUrl" in config) ||
            typeof config.backendUrl !== "string")
            throw new Error("Connector backend configuration is invalid. Rebuild the connector with VYAKTH_CLOUD_URL configured.");
        return normalizeBackendUrl(config.backendUrl);
    }
    if (packaged)
        throw new Error("Connector backend configuration is missing. Rebuild the connector with VYAKTH_CLOUD_URL configured.");
    return "http://localhost:4000/api";
}
/**
 * The web dashboard where customers read their reports. Set VYAKTH_WEB_URL at build time;
 * otherwise it is derived from the API address (api.example.com/api → example.com, and the
 * local API on :4000 → the local web app on :3000).
 */
function configuredWebUrl(backendUrl) {
    const configured = process.env.VYAKTH_WEB_URL ?? readPackagedConfig()?.webUrl;
    const url = new URL(configured?.trim() || backendUrl);
    if (!["http:", "https:"].includes(url.protocol))
        throw new Error("The VYAKTH web address must use HTTP or HTTPS.");
    if (!configured?.trim()) {
        url.hostname = url.hostname.replace(/^api\./i, "");
        if (url.port === "4000")
            url.port = "3000";
        url.pathname = "/";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
}
function readPackagedConfig() {
    const configPath = node_path_1.default.join(__dirname, "backend-config.json");
    if (!(0, node_fs_1.existsSync)(configPath))
        return null;
    const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, "utf8"));
    return config && typeof config === "object" && "webUrl" in config && typeof config.webUrl === "string"
        ? { webUrl: config.webUrl }
        : null;
}
