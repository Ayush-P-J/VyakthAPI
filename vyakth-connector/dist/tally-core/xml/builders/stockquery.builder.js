"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockQueryBuilder = void 0;
const utils_1 = require("./utils");
const stockQueryBuilder = (companyName, stockItemName, fromDate, toDate) => `<ENVELOPE>
<HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Data</TYPE>
  <ID>Sales Register</ID>
</HEADER>
<BODY><DESC><STATICVARIABLES>
  <StockItemName>${(0, utils_1.escapeXml)(stockItemName)}</StockItemName>
  <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
  <SVCURRENTCOMPANY>${(0, utils_1.escapeXml)(companyName)}</SVCURRENTCOMPANY>
  <SVFROMDATE TYPE="Date">${(0, utils_1.escapeXml)(fromDate)}</SVFROMDATE>
  <SVTODATE TYPE="Date">${(0, utils_1.escapeXml)(toDate)}</SVTODATE>
</STATICVARIABLES></DESC></BODY>
</ENVELOPE>`;
exports.stockQueryBuilder = stockQueryBuilder;
