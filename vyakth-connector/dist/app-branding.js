"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONNECTOR_APP_ID = exports.CONNECTOR_NAME = void 0;
exports.connectorAssetPath = connectorAssetPath;
exports.connectorRelaunchCommand = connectorRelaunchCommand;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
exports.CONNECTOR_NAME = "VYAKTH Connector";
// Keep development windows separate from installed shortcuts and their cached icons.
exports.CONNECTOR_APP_ID = electron_1.app.isPackaged
    ? "com.hexspare.vyakth.connector"
    : "com.hexspare.vyakth.connector.development";
function connectorAssetPath(filename) {
    return electron_1.app.isPackaged
        ? path_1.default.join(process.resourcesPath, "build", filename)
        : path_1.default.join(__dirname, "..", "build", filename);
}
function connectorRelaunchCommand() {
    return electron_1.app.isPackaged
        ? `"${process.execPath}"`
        : `"${process.execPath}" "${electron_1.app.getAppPath()}"`;
}
