"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrySweep = exports.ALL_ENTITY_TYPES = exports.runOutstandingReports = exports.VOUCHER_SYNC_CONFIGS = exports.cloudUploader = exports.NoopCloudUploader = exports.lastAutoSyncAttempt = void 0;
exports.getSyncProgress = getSyncProgress;
exports.onSyncProgress = onSyncProgress;
exports.getAutoSyncIntervalMs = getAutoSyncIntervalMs;
exports.getInstallationId = getInstallationId;
exports.checkTallyReachability = checkTallyReachability;
exports.checkInternetOnline = checkInternetOnline;
exports.runAutoSync = runAutoSync;
exports.discoverCompanies = discoverCompanies;
exports.runEntitySync = runEntitySync;
exports.runVoucherEntitySync = runVoucherEntitySync;
exports.runStockValueSync = runStockValueSync;
exports.runOutstandingSync = runOutstandingSync;
exports.waitForSyncIdle = waitForSyncIdle;
exports.runAllSyncs = runAllSyncs;
exports.toggleCompanySync = toggleCompanySync;
exports.retryOutboxBatchNow = retryOutboxBatchNow;
const company_selection_1 = require("./company-selection");
const cloud_1 = require("./cloud");
const sync_recovery_1 = require("./sync-recovery");
const compose_voucher_1 = require("./compose-voucher");
const report_sync_1 = require("./report-sync");
const stock_value_mapper_js_1 = require("./tally-core/mappers/stock-value.mapper.js");
const stockitembalance_builder_js_1 = require("./tally-core/xml/builders/stockitembalance.builder.js");
const sync_scheduler_1 = require("./sync-scheduler");
const report_schedule_1 = require("./report-schedule");
const company_sync_1 = require("./company-sync");
const sync_errors_1 = require("./sync-errors");
const outbox_1 = require("./outbox");
const crypto_1 = require("crypto");
const https = __importStar(require("https"));
const client_js_1 = require("./tally-core/xml/client.js");
const parser_js_1 = require("./tally-core/xml/parser.js");
const stream_parser_js_1 = require("./tally-core/xml/stream-parser.js");
const db_js_1 = require("./db.js");
const tally_core_utils_js_1 = require("./tally-core/utils/tally-core.utils.js");
const mapper_js_1 = require("./tally-core/utils/mapper.js");
const master_tax_details_js_1 = require("./tally-core/utils/master-tax-details.js");
exports.lastAutoSyncAttempt = null;
function formatElapsedTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours)
        parts.push(`${hours} hr`);
    if (minutes)
        parts.push(`${minutes} min`);
    if (seconds || parts.length === 0)
        parts.push(`${seconds} sec`);
    return parts.join(" ");
}
let syncProgress = {
    inProgress: false,
    completed: 0,
    total: 0,
    currentLabel: null,
    startedAt: null,
    finishedAt: null,
};
const syncProgressListeners = new Set();
function getSyncProgress() {
    return syncProgress;
}
/** Settings.ts subscribes here once (on first window open) and forwards each update to the
 * renderer over IPC — this module doesn't know about BrowserWindow/webContents at all, it just
 * publishes progress and lets whoever's listening decide what to do with it. */
function onSyncProgress(listener) {
    syncProgressListeners.add(listener);
    return () => syncProgressListeners.delete(listener);
}
function setSyncProgress(patch) {
    syncProgress = { ...syncProgress, ...patch };
    for (const listener of syncProgressListeners)
        listener(syncProgress);
}
/** Reads the user-configurable interval on every call (rather than a fixed constant captured at
 * startup) so a change saved in Settings takes effect on the auto-sync loop's next tick, without
 * needing an app restart — see main.ts's self-rescheduling scheduleAutoSync(). */
function getAutoSyncIntervalMs() {
    return db_js_1.dbQueries.getAppSettings().syncIntervalMinutes * 60 * 1000;
}
const companies_builder_js_1 = require("./tally-core/xml/builders/companies.builder.js");
const ledger_builder_js_1 = require("./tally-core/xml/builders/ledger.builder.js");
const ledgergroups_builder_js_1 = require("./tally-core/xml/builders/ledgergroups.builder.js");
const costcenter_builder_js_1 = require("./tally-core/xml/builders/costcenter.builder.js");
const costcategory_builder_js_1 = require("./tally-core/xml/builders/costcategory.builder.js");
const items_builder_js_1 = require("./tally-core/xml/builders/items.builder.js");
const itemsgroup_builder_js_1 = require("./tally-core/xml/builders/itemsgroup.builder.js");
const itemscategory_builder_js_1 = require("./tally-core/xml/builders/itemscategory.builder.js");
const godown_builder_js_1 = require("./tally-core/xml/builders/godown.builder.js");
const unit_builder_js_1 = require("./tally-core/xml/builders/unit.builder.js");
const vouchertype_builder_js_1 = require("./tally-core/xml/builders/vouchertype.builder.js");
const ospayables_builder_js_1 = require("./tally-core/xml/builders/ospayables.builder.js");
const osreceivables_builder_js_1 = require("./tally-core/xml/builders/osreceivables.builder.js");
const contra_builder_js_1 = require("./tally-core/xml/builders/contra.builder.js");
const creditnote_builder_js_1 = require("./tally-core/xml/builders/creditnote.builder.js");
const debitnote_builder_js_1 = require("./tally-core/xml/builders/debitnote.builder.js");
const deliverynote_builder_js_1 = require("./tally-core/xml/builders/deliverynote.builder.js");
const journal_builder_js_1 = require("./tally-core/xml/builders/journal.builder.js");
const payment_builder_js_1 = require("./tally-core/xml/builders/payment.builder.js");
const purchase_builder_js_1 = require("./tally-core/xml/builders/purchase.builder.js");
const purchaseorder_builder_js_1 = require("./tally-core/xml/builders/purchaseorder.builder.js");
const receipt_builder_js_1 = require("./tally-core/xml/builders/receipt.builder.js");
const receiptnote_builder_js_1 = require("./tally-core/xml/builders/receiptnote.builder.js");
const sales_builder_js_1 = require("./tally-core/xml/builders/sales.builder.js");
const salesorder_builder_js_1 = require("./tally-core/xml/builders/salesorder.builder.js");
const stockjournal_builder_js_1 = require("./tally-core/xml/builders/stockjournal.builder.js");
const physicalstock_builder_js_1 = require("./tally-core/xml/builders/physicalstock.builder.js");
const accounts_mapper_js_1 = require("./tally-core/mappers/accounts.mapper.js");
const cost_centre_mapper_js_1 = require("./tally-core/mappers/cost-centre.mapper.js");
const inventory_mapper_js_1 = require("./tally-core/mappers/inventory.mapper.js");
const voucher_mapper_js_1 = require("./tally-core/mappers/voucher.mapper.js");
const outstanding_mapper_js_1 = require("./tally-core/mappers/outstanding.mapper.js");
const cloud_js_1 = require("./cloud.js");
const ledger_masterid_builder_js_1 = require("./tally-core/xml/builders/ledger-masterid.builder.js");
const masterid_stream_parser_js_1 = require("./tally-core/xml/masterid-stream-parser.js");
const byte_counting_stream_js_1 = require("./tally-core/utils/byte-counting-stream.js");
const sync_batch_settings_js_1 = require("./sync-batch-settings.js");
const batch_fetch_errors_js_1 = require("./batch-fetch-errors.js");
const voucherBatchPlanner = __importStar(require("./voucher-batch-planner.js"));
class NoopCloudUploader {
    async uploadBatch(batch, _options) {
        // Kept for tests/local experimentation — HttpCloudUploader (cloud.ts) is the real path now.
        return { ok: true };
    }
}
exports.NoopCloudUploader = NoopCloudUploader;
exports.cloudUploader = new cloud_js_1.HttpCloudUploader();
const manualRetryBatchIds = new Set();
/** The paired installation's id, or a placeholder when pairing hasn't happened yet — batches
 * still build and queue normally either way; HttpCloudUploader is what actually refuses to
 * upload until a real device credential exists (see cloud.ts). */
function getInstallationId() {
    return db_js_1.dbQueries.getConnectorInstallationId();
}
// A stock item/group/category/godown/cost-centre's parent-name is resolved against these lookup
// maps the same way h7001 does it (see cost-centre-sync.service.ts / stock-*-sync.service.ts),
// but this connector has no local relational store to read the maps back from after a first
// pass, so every hierarchical mapper here gets an empty map and every parent*Id/stockGroupId
// etc. comes back null. That mirrors the ledger-group simplification the codebase already made
// for mapLedgers below, rather than inventing a new compromise — h7004 can resolve parent-name
// references cloud-side from the raw NAME/PARENT strings if it needs the hierarchy.
const EMPTY_INVENTORY_LOOKUPS = {
    stockGroupMap: new Map(),
    categoryMap: new Map(),
    unitMap: new Map(),
    godownMap: new Map(),
    stockItemMap: new Map(),
    effectiveGstByGroupId: new Map(),
    effectiveCostingMethodByGroupId: new Map(),
};
const rawName = (value) => {
    const unwrapped = (0, tally_core_utils_js_1.unwrapTallyValue)(value);
    if (unwrapped == null)
        return null;
    // Tally's "&#4;"-prefixed default-group marker (see stream-parser.ts's stripIllegalCharRefs
    // doc comment) survives the plain DOM parser as a silently-dropped reference rather than a
    // parse error, leaving a stray leading space behind (e.g. "&#4; Primary" -> " Primary") — trim
    // it the same way toStringOrNull does for every other mapped field.
    const str = String(unwrapped).trim();
    return str === "" ? null : str;
};
// Master/reference-data entities: fetched as one XML "Data" report per company, parsed with the
// plain DOM parser, and extracted from `parsed.DATA.<TAG>` — Tally renders the report's own root
// tag both ways (`LEDGERLIST` vs `ledgerlist`, etc.) depending on version, so every path below
// tries both casings, matching h7001's field-audited delta-sync extractRaw functions exactly.
const SYNC_CONFIGS = [
    {
        entityType: "ledger",
        builder: ledger_builder_js_1.ledgerBuilder,
        mapper: accounts_mapper_js_1.mapLedgers,
        mapperArgs: () => [0, new Map()], // mock companyId = 0, empty group map
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.LEDGERLIST ?? parsed?.DATA?.ledgerlist),
        augment: (_rec, raw) => ({ ledgerGroupName: rawName(raw.PARENT) }),
        // Ledgers are the largest master pull by a wide margin (25k+ rows = 24MB in one request on a
        // real customer's data) — see runEntitySync's batched-fetch path below.
        batching: {
            planRanges: async (companyName) => {
                const settings = (0, sync_batch_settings_js_1.getSyncBatchSettings)();
                const response = await client_js_1.tallyClient.request({
                    method: "POST",
                    data: (0, ledger_masterid_builder_js_1.ledgerMasterIdBuilder)(companyName),
                    responseType: "stream",
                    timeout: settings.requestTimeoutMs,
                    retries: 2,
                });
                const ids = await (0, masterid_stream_parser_js_1.collectMasterIds)(response.data);
                return (0, masterid_stream_parser_js_1.packMasterIdRanges)(ids, settings.targetMastersPerBatch);
            },
            buildRangeXml: (companyName, range) => (0, ledger_builder_js_1.ledgerBuilder)(companyName, 0, { gt: range.gt, lte: range.lte }),
        },
    },
    {
        entityType: "ledger_group",
        builder: ledgergroups_builder_js_1.ledgerGroupsBuilder,
        mapper: accounts_mapper_js_1.mapLedgerGroups,
        mapperArgs: () => [0, new Map()],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.LEDGERGROUPLIST ?? parsed?.DATA?.LedgerGroupList),
        augment: (_rec, raw) => ({ parentGroupName: rawName(raw.PARENT) }),
    },
    {
        entityType: "cost_centre",
        builder: costcenter_builder_js_1.costCenterBuilder,
        mapper: cost_centre_mapper_js_1.mapCostCentres,
        mapperArgs: () => [0, new Map(), new Map()],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.COSTCENTRELIST ??
            parsed?.DATA?.CostCentreList?.CostCentre),
        augment: (_rec, raw) => ({
            parentCostCentreName: rawName(raw.PARENT),
            costCategoryName: rawName(raw.CATEGORY),
        }),
    },
    {
        entityType: "cost_category",
        builder: costcategory_builder_js_1.costCategoryBuilder,
        mapper: cost_centre_mapper_js_1.mapCostCategories,
        mapperArgs: () => [0],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.COSTCATEGORYLIST ??
            parsed?.DATA?.CostCategoryList?.CostCategory),
    },
    {
        entityType: "stock_item",
        builder: items_builder_js_1.itemsBuilder,
        mapper: inventory_mapper_js_1.mapStockItems,
        mapperArgs: () => [0, EMPTY_INVENTORY_LOOKUPS],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.ITEMSLIST),
        augment: (rec, raw) => {
            const rawBills = (0, mapper_js_1.normalizeToArray)(raw.OPENINGBALANCELIST);
            const openingBills = Array.isArray(rec.openingBills)
                ? rec.openingBills.map((b, i) => ({
                    ...b,
                    godownName: rawName(rawBills[i]?.GODOWNNAME),
                }))
                : rec.openingBills;
            // Bill-of-materials, kept by raw name rather than run through mapBoms (which resolves
            // against a local DB id map this connector doesn't have) — h7004 resolves
            // stockItemName/godownName against its own tables the same way it resolves every other
            // parent-name field here.
            const boms = (0, mapper_js_1.normalizeToArray)(raw.MULTICOMPONENTLIST)
                .filter((b) => b?.COMPONENTLISTNAME)
                .map((b) => ({
                name: rawName(b.COMPONENTLISTNAME),
                baseQty: rawName(b.COMPONENTBASICQTY) ?? "1",
                components: (0, mapper_js_1.normalizeToArray)(b.MULTICOMPONENTITEMLIST)
                    .filter((c) => c?.STOCKITEMNAME)
                    .map((c) => ({
                    stockItemName: rawName(c.STOCKITEMNAME),
                    stockItemMasterId: c.STOCKITEMNAMEID
                        ? (0, mapper_js_1.toRequiredInt)(c.STOCKITEMNAMEID)
                        : null,
                    godownName: rawName(c.GODOWNNAME),
                    qty: rawName(c.ACTUALQTY) ?? "0",
                })),
            }));
            return {
                stockGroupName: rawName(raw.PARENT),
                stockCategoryName: rawName(raw.CATEGORY),
                baseUnitName: rawName(raw.BASEUNITS),
                additionalUnitName: rawName(raw.ADDITIONALUNITS),
                openingBills,
                boms,
            };
        },
    },
    {
        entityType: "stock_group",
        builder: itemsgroup_builder_js_1.itemsgroupBuilder,
        mapper: inventory_mapper_js_1.mapStockGroups,
        mapperArgs: () => [0, new Map()],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.ITEMSGROUPLIST ?? parsed?.DATA?.Itemsgrouplist),
        augment: (_rec, raw) => ({ parentGroupName: rawName(raw.PARENT) }),
    },
    {
        entityType: "stock_category",
        builder: itemscategory_builder_js_1.itemsCategoryBuilder,
        mapper: inventory_mapper_js_1.mapStockCategories,
        mapperArgs: () => [0, new Map()],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.ITEMSCATEGORYLIST ?? parsed?.DATA?.ItemsCategoryList),
        augment: (_rec, raw) => ({ parentCategoryName: rawName(raw.PARENT) }),
    },
    {
        entityType: "godown",
        builder: godown_builder_js_1.godownBuilder,
        mapper: inventory_mapper_js_1.mapGodowns,
        mapperArgs: () => [0, new Map()],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.GODOWNLIST ?? parsed?.DATA?.GodownList),
        augment: (_rec, raw) => ({ parentGodownName: rawName(raw.PARENT) }),
    },
    {
        entityType: "unit",
        builder: unit_builder_js_1.unitBuilder,
        mapper: inventory_mapper_js_1.mapUnits,
        mapperArgs: () => [0],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.UNITSLIST ?? parsed?.DATA?.UnitsList),
    },
    {
        entityType: "voucher_type",
        builder: vouchertype_builder_js_1.voucherTypeBuilder,
        mapper: voucher_mapper_js_1.mapVoucherTypes,
        mapperArgs: () => [0],
        extractList: (parsed) => (0, tally_core_utils_js_1.ensureArray)(parsed?.DATA?.VOUCHERTYPELIST ?? parsed?.DATA?.VoucherTypeList),
    },
];
// Transactional voucher entities: unlike the masters above, these are fetched as a streamed XML
// response and parsed with the SAX-based parseVoucherStream (per-voucher ACCTRANS/INVTRANS/
// PHYSICALSTOCK/STOCKJRNLTRANS elements), matching h7001's voucher-sync.service.ts. The
// 'sales_voucher' entityType name is kept as-is (rather than 'voucher_sales') so any checkpoint
// already recorded under it from before this change keeps working.
// Exported for deleted-voucher-sync.ts, which needs the same entityType/voucherTypeName pairing
// (as the value sent for a snapshot's voucherCategory, and the key into VOUCHER_TYPE_SYSTEM_VARS
// respectively) rather than maintaining its own copy that could drift out of sync with this one.
exports.VOUCHER_SYNC_CONFIGS = [
    {
        entityType: "voucher_contra",
        builder: contra_builder_js_1.contraBuilder,
        voucherTypeName: "Contra",
    },
    {
        entityType: "voucher_creditnote",
        builder: creditnote_builder_js_1.creditnoteBuilder,
        voucherTypeName: "CreditNote",
    },
    {
        entityType: "voucher_debitnote",
        builder: debitnote_builder_js_1.debitnoteBuilder,
        voucherTypeName: "DebitNote",
    },
    {
        entityType: "voucher_deliverynote",
        builder: deliverynote_builder_js_1.deliverynoteBuilder,
        voucherTypeName: "DeliveryNote",
    },
    {
        entityType: "voucher_journal",
        builder: journal_builder_js_1.journalBuilder,
        voucherTypeName: "Journal",
    },
    {
        entityType: "voucher_payment",
        builder: payment_builder_js_1.paymentBuilder,
        voucherTypeName: "Payment",
    },
    {
        entityType: "voucher_purchase",
        builder: purchase_builder_js_1.purchaseBuilder,
        voucherTypeName: "Purchase",
    },
    {
        entityType: "voucher_purchaseorder",
        builder: purchaseorder_builder_js_1.purchaseorderBuilder,
        voucherTypeName: "PurchaseOrder",
    },
    {
        entityType: "voucher_receipt",
        builder: receipt_builder_js_1.receiptBuilder,
        voucherTypeName: "Receipt",
    },
    {
        entityType: "voucher_receiptnote",
        builder: receiptnote_builder_js_1.receiptnoteBuilder,
        voucherTypeName: "ReceiptNote",
    },
    {
        entityType: "sales_voucher",
        builder: sales_builder_js_1.salesBuilder,
        voucherTypeName: "Sales",
    },
    {
        entityType: "voucher_salesorder",
        builder: salesorder_builder_js_1.salesorderBuilder,
        voucherTypeName: "SalesOrder",
    },
    {
        entityType: "voucher_stockjournal",
        builder: stockjournal_builder_js_1.stockJournalBuilder,
        voucherTypeName: "StockJournal",
    },
    {
        entityType: "voucher_physicalstock",
        builder: physicalstock_builder_js_1.physicalstockBuilder,
        voucherTypeName: "PhysicalStock",
    },
];
async function checkTallyReachability() {
    try {
        // A bare GET answers "TallyPrime Server is Running" without running any report. Asking for a
        // report name (the old probe used a non-existent 'BaseData') makes Tally log a TDL error in
        // its Calculator pane on every 30s tick.
        const { data } = await client_js_1.tallyClient.request({ method: "GET", data: "", timeout: 2000 });
        return /Server is Running/i.test(data);
    }
    catch (err) {
        return false;
    }
}
async function checkInternetOnline() {
    // Placeholder connectivity check: replace with "can reach h7004" once backend exists.
    return new Promise((resolve) => {
        const req = https.request("https://example.com", { method: "HEAD", timeout: 3000 }, (res) => {
            resolve(true); // Any response means we reached the network
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}
async function runAutoSync() {
    if (!db_js_1.dbQueries.isBackendAuthenticated())
        return;
    exports.lastAutoSyncAttempt = new Date().toISOString();
    const isTallyReachable = await checkTallyReachability();
    if (isTallyReachable) {
        await runAllSyncs();
    }
}
async function discoverCompanies() {
    try {
        const reqXml = (0, companies_builder_js_1.companiesBuilder)();
        const { data: resXml } = (await client_js_1.tallyClient.request({
            data: reqXml,
            retries: db_js_1.dbQueries.getAppSettings().tallyRetryAttempts,
        }));
        const parsed = (0, parser_js_1.parseTallyXml)(resXml);
        const companies = parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.COMPANY;
        const companyList = Array.isArray(companies)
            ? companies
            : companies
                ? [companies]
                : [];
        // Tally's XML has attribute-bearing elements (e.g. <GUID TYPE="String">...</GUID>) parsed
        // into { value, TYPE } objects, not plain strings — unwrap via the same helper tally-core's
        // mappers already use, rather than assuming c.NAME/c.GUID are strings.
        const results = companyList.map((c) => ({
            name: String((0, tally_core_utils_js_1.unwrapTallyValue)(c.NAME) ?? ""),
            guid: String((0, tally_core_utils_js_1.unwrapTallyValue)(c.GUID) ?? ""),
            metadata: {
                tallySerial: rawName(c.TALLYSERIAL),
                booksFrom: rawName(c.BOOKSFROM),
                financialYearFrom: rawName(c.STARTINGFROM),
                ...(c.INDIANVAT !== undefined ? {
                    vatEnabled: ["yes", "true", "1"].includes(String((0, tally_core_utils_js_1.unwrapTallyValue)(c.INDIANVAT)).trim().toLowerCase()),
                } : {}),
                details: {
                    contacts: [
                        {
                            isPrimary: true,
                            methods: [
                                ["email", "EMAIL"],
                                ["phone", "PHONENUMBER"],
                                ["mobile", "MOBILENUMBER"],
                                ["website", "WEBSITE"],
                            ]
                                .filter(([, tag]) => rawName(c[tag]))
                                .map(([methodType, tag], methodOrder) => ({
                                methodType,
                                methodValue: rawName(c[tag]),
                                methodOrder,
                                isPrimary: true,
                            })),
                        },
                    ],
                    identifiers: [
                        ["pan", "INCOMETAXNUMBER"],
                        ["gstin", "GSTREGISTRATIONNUMBER"],
                    ]
                        .filter(([, tag]) => rawName(c[tag]))
                        .map(([identifierType, tag]) => ({
                        identifierType,
                        identifierValue: rawName(c[tag]),
                        isPrimary: true,
                    })),
                },
            },
        }));
        // Discovery never enrolls a company. Refresh metadata only for an existing selection.
        for (const company of results) {
            if (db_js_1.dbQueries.getCompanySetting(company.guid)?.selected === 1)
                db_js_1.dbQueries.setCompanyMetadata(company.guid, company.metadata);
        }
        return results.filter((company) => company.guid.trim() && company.name.trim());
    }
    catch (err) {
        console.error("Failed to discover companies:", err);
        return [];
    }
}
/** Caps each master-entity outbox batch's record count — mirrors h7001's targetMastersPerBatch
 * (default 5000 there; kept smaller here since this connector's upload payload also carries
 * whatever augment() adds, and h7004's own body-size limit is a hard ceiling — see cloud.ts).
 * User-configurable (Settings → Additional → Chunk Size, matching BA Mobile Connector's own
 * "Chunk Data" setting) but clamped here regardless of what's stored — this exists specifically
 * to prevent the "large master lists sent as one giant HTTP POST" failure mode (see CLAUDE.md),
 * so a too-large saved value must never be able to defeat the whole point of chunking. */
function getMasterChunkSize() {
    const configured = db_js_1.dbQueries.getAppSettings().masterChunkSize;
    return Math.min(Math.max(configured, 100), 10_000);
}
/** Maps + augments one raw Tally record list the same way for both the plain and the
 * MasterId-batched fetch paths below. */
function preserveSourceDecimals(type, rec, raw) {
    const fields = type === "ledger"
        ? {
            creditLimit: "CREDITLIMIT",
            gstRate: "GSTRATE",
            openingBalance: "OPENINGBALANCE",
        }
        : type === "stock_item"
            ? {
                conversion: "CONVERSION",
                denominator: "DENOMINATOR",
                gstRate: "GSTRATE",
                cessRate: "CESSRATE",
                reorderLevel: "REORDERLEVEL",
                minimumLevel: "MINIMUMLEVEL",
                maximumLevel: "MAXIMUMLEVEL",
                openingBalance: "OPENINGBALANCE",
                altOpeningBalance: "ALTOPENINGBALANCE",
                openingRate: "OPENINGRATE",
                openingValue: "OPENINGVALUE",
            }
            : {};
    for (const [key, tag] of Object.entries(fields))
        rec[key] = rawName(raw[tag]);
    if (type === "ledger" || type === "stock_item")
        rec.openingBills = (0, mapper_js_1.normalizeToArray)(raw.OPENINGBALANCELIST).map((b, i) => ({
            ...rec.openingBills?.[i],
            openingBalance: rawName(b.OPENINGBALANCE),
            altOpeningBalance: rawName(b.ALTOPENINGBALANCE),
            openingRate: rawName(b.OPENINGRATE),
            openingValue: rawName(b.OPENINGVALUE),
        }));
    return rec;
}
function mapAndAugment(config, companyGuid, rawList) {
    if (config.entityType === "ledger" || config.entityType === "stock_item")
        rawList = rawList.map(master_tax_details_js_1.withMasterTaxValues);
    const args = config.mapperArgs(companyGuid);
    return config
        .mapper(rawList, ...args)
        .map((rec, i) => validateMasterRecord(preserveSourceDecimals(config.entityType, {
        ...rec,
        ...(config.augment ? config.augment(rec, rawList[i]) : {}),
        ...((config.entityType === "ledger" || config.entityType === "stock_item")
            ? { taxDetails: (0, master_tax_details_js_1.masterTaxDetails)(rawList[i]) }
            : {}),
    }, rawList[i])));
}
function validateMasterRecord(record) {
    if (!Number.isSafeInteger(record.masterId) ||
        record.masterId <= 0 ||
        !Number.isSafeInteger(record.alterId) ||
        record.alterId < 0 ||
        !record.name)
        throw new Error("Tally returned an invalid master identity");
    return record;
}
function maxAlterIdIn(rawList, floor) {
    let max = floor;
    for (const rec of rawList) {
        const alterId = parseInt(String((0, tally_core_utils_js_1.unwrapTallyValue)(rec.ALTERID) ?? "0"), 10);
        if (alterId > max)
            max = alterId;
    }
    return max;
}
/** Stages bounded master chunks. They remain ineligible for upload until the fetch is sealed. */
function enqueueMappedRecordChunks(config, companyName, companyGuid, syncRunId, maxAlterId, mappedRecords) {
    const chunkSize = Math.min(getMasterChunkSize(), 1000);
    const appendChunks = (entityType, records) => {
        let offset = 0;
        while (offset < records.length) {
            const chunk = [];
            let bytes = 0;
            while (offset < records.length && chunk.length < chunkSize) {
                const record = records[offset];
                const size = Buffer.byteLength(JSON.stringify(record));
                if (size > 1024 * 1024)
                    throw new Error("A single sync record exceeds the 1 MiB batch limit");
                if (chunk.length && bytes + size > 1024 * 1024)
                    break;
                chunk.push(record);
                bytes += size;
                offset++;
            }
            const batchId = (0, crypto_1.randomUUID)();
            const payloadObj = {
                protocolVersion: 1,
                batchId,
                syncRunId,
                installationId: getInstallationId(),
                companySourceId: companyGuid,
                companyRegistrationId: (0, cloud_1.assertCompanyLicense)(companyGuid),
                company: db_js_1.dbQueries.getCompanyMetadata(companyGuid),
                companyName,
                entityType,
                checkpoint: { creationId: 0, alterationId: maxAlterId }, // creationId mock
                recordCount: chunk.length,
                records: chunk,
            };
            const payload = JSON.stringify(payloadObj);
            const batch = {
                id: batchId,
                companyId: companyGuid,
                entityType,
                payload,
                payloadHash: (0, outbox_1.payloadHash)(payload),
                createdAt: new Date().toISOString(),
                attemptCount: 0,
                nextAttemptAt: null,
                status: "pending",
                lastError: null,
                cloudAcknowledgedAt: null,
            };
            db_js_1.durableOutbox.append(syncRunId, batch);
        }
    };
    if (config.entityType === "stock_item") {
        const bomRecords = mappedRecords
            .filter((record) => Array.isArray(record.boms) && record.boms.length > 0)
            .map(({ name, masterId, alterId, boms }) => ({
            name,
            masterId,
            alterId,
            boms,
        }));
        const stockItems = mappedRecords.map(({ boms: _boms, ...record }) => record);
        appendChunks(config.entityType, stockItems);
        appendChunks("stock_item_bom", bomRecords);
    }
    else {
        appendChunks(config.entityType, mappedRecords);
    }
}
/**
 * Fetches a first-time pull as several MasterId-ranged requests (config.batching), enqueueing
 * each range's records as it arrives so neither this connector nor Tally holds the whole
 * company's masters in memory at once — ported from h7001's delta-sync.service.ts
 * `runBatchedFullPull`. Returns null when the probe found fewer than 2 ranges (nothing worth
 * splitting) or failed outright, meaning the caller should fall back to the plain single-request
 * path.
 */
async function runBatchedMasterFetch(config, companyName, companyGuid, syncRunId, lastAlterId) {
    let ranges;
    try {
        ranges = await config.batching.planRanges(companyName);
    }
    catch (e) {
        console.warn(`[Sync] ${config.entityType}: MasterId-range probe failed, falling back to a single request`, e);
        return null;
    }
    if (ranges.length < 2) {
        console.log(`[Sync] ${config.entityType}: ${ranges.length === 0 ? "probe found no records" : "small enough for one request"}, not batching`);
        return null;
    }
    const total = ranges.reduce((sum, r) => sum + r.count, 0);
    console.log(`[Sync] ${config.entityType}: ${total} record(s) -> ${ranges.length} batch(es)`);
    let maxAlterId = lastAlterId;
    let totalCount = 0;
    for (const [index, range] of ranges.entries()) {
        const rangeStartedAt = Date.now();
        const reqXml = config.batching.buildRangeXml(companyName, range);
        const { data: resXml } = (await client_js_1.tallyClient.request({
            data: reqXml,
            retries: db_js_1.dbQueries.getAppSettings().tallyRetryAttempts,
        }));
        const parsed = (0, parser_js_1.parseTallyXml)(resXml);
        const rawList = config.extractList(parsed);
        console.log(`[Sync] ${config.entityType}: batch ${index + 1}/${ranges.length}, MasterId ${range.gt + 1}-${range.lte}, ` +
            `~${range.count} expected, ${rawList.length} received in ${formatElapsedTime(Date.now() - rangeStartedAt)}`);
        if (rawList.length === 0)
            throw new Error("Expected master range returned empty; full fetch is incomplete");
        const mappedRecords = mapAndAugment(config, companyGuid, rawList);
        maxAlterId = maxAlterIdIn(rawList, maxAlterId);
        totalCount += rawList.length;
        enqueueMappedRecordChunks(config, companyName, companyGuid, syncRunId, maxAlterId, mappedRecords);
        await new Promise((resolve) => setImmediate(resolve)); // yield to the event loop between ranges
    }
    return { maxAlterId, totalCount };
}
async function runEntitySync(config, companyName, companyGuid) {
    (0, cloud_1.assertCompanyLicense)(companyGuid);
    if (db_js_1.durableOutbox.hasPending(companyGuid, config.entityType))
        return;
    const syncRunId = (0, crypto_1.randomUUID)();
    db_js_1.durableOutbox.begin(syncRunId, companyGuid, config.entityType);
    const startedAt = new Date().toISOString();
    db_js_1.dbQueries.insertSyncRun({
        id: syncRunId,
        companyId: companyGuid,
        entityType: config.entityType,
        startedAt,
        finishedAt: null,
        recordCount: 0,
        status: "running",
        error: null,
    });
    try {
        const lastAlterId = db_js_1.dbQueries.getCheckpoint(companyGuid, config.entityType);
        if (lastAlterId === 0 && config.batching) {
            const batched = await runBatchedMasterFetch(config, companyName, companyGuid, syncRunId, lastAlterId);
            if (batched) {
                db_js_1.durableOutbox.seal(syncRunId, batched.maxAlterId);
                db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), batched.totalCount, "completed", null);
                return;
            }
            // Probe found nothing worth splitting (or failed) — fall through to the plain path below.
        }
        const reqXml = config.builder(companyName, lastAlterId);
        const { data: resXml } = (await client_js_1.tallyClient.request({
            data: reqXml,
            retries: db_js_1.dbQueries.getAppSettings().tallyRetryAttempts,
        }));
        const parsed = (0, parser_js_1.parseTallyXml)(resXml);
        const rawList = config.extractList(parsed);
        if (rawList.length > 0) {
            const mappedRecords = mapAndAugment(config, companyGuid, rawList);
            const maxAlterId = maxAlterIdIn(rawList, lastAlterId);
            // Enqueues only — the checkpoint advances later, once a batch carrying this maxAlterId
            // actually uploads (processBatch, called from the trailing flush phase or the retry sweep).
            // Fetching from Tally never advances the checkpoint by itself.
            enqueueMappedRecordChunks(config, companyName, companyGuid, syncRunId, maxAlterId, mappedRecords);
        }
        db_js_1.durableOutbox.seal(syncRunId, maxAlterIdIn(rawList, lastAlterId));
        db_js_1.durableOutbox.advance(companyGuid, config.entityType);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), rawList.length, "completed", null);
    }
    catch (err) {
        db_js_1.durableOutbox.abort(syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), 0, "failed", err.message);
    }
}
async function fetchVoucherRecords(config, companyName, lastAlterId, dateRange, guard, onChunk) {
    // A guarded (planner-driven) fetch that throws is classified and retried/split by the caller's
    // planner loop, not retried blind and unclassified here — an oversized batch retried unchanged
    // several times would just fail the same way each time before ever reaching the split logic.
    const maxAttempts = 1; // A failed stream aborts its staged fetch; the next run starts a fresh fetch.
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let response;
        try {
            const reqXml = config.builder(companyName, lastAlterId, dateRange);
            response = await client_js_1.tallyClient.request({
                data: reqXml,
                responseType: "stream",
                timeout: guard?.settings.requestTimeoutMs,
            });
            let byteCounter;
            let sourceStream = response.data;
            if (guard) {
                byteCounter = (0, byte_counting_stream_js_1.createByteCounter)();
                sourceStream = response.data.pipe(byteCounter.stream);
            }
            const records = [];
            let maxAlterId = lastAlterId;
            let streamCount = 0;
            let chunkBytes = 0;
            for await (const raw of (0, stream_parser_js_1.parseVoucherStream)(sourceStream)) {
                streamCount++;
                if (guard && streamCount % 100 === 0) {
                    if (Date.now() - guard.startedAt >
                        guard.settings.maxBatchDurationMs) {
                        response.data.destroy();
                        throw new batch_fetch_errors_js_1.BatchDurationExceededError(`${config.entityType} batch ${dateRange?.from}-${dateRange?.to} exceeded max duration of ${guard.settings.maxBatchDurationMs}ms`);
                    }
                    if (byteCounter &&
                        byteCounter.getBytes() > guard.settings.maxResponseBytes) {
                        response.data.destroy();
                        throw new batch_fetch_errors_js_1.BatchTooLargeError(`${config.entityType} batch ${dateRange?.from}-${dateRange?.to} exceeded max response size of ${guard.settings.maxResponseBytes} bytes`);
                    }
                    if (process.memoryUsage().heapUsed >
                        guard.settings.memoryPressureThresholdBytes) {
                        response.data.destroy();
                        throw new batch_fetch_errors_js_1.MemoryPressureError(`${config.entityType} batch ${dateRange?.from}-${dateRange?.to} exceeded memory pressure threshold of ${guard.settings.memoryPressureThresholdBytes} bytes`);
                    }
                }
                if (!raw.MASTERID)
                    throw new Error("Tally returned a voucher without MasterId"); // // matches h7001's guard against a headerless/malformed row
                const alterId = (0, mapper_js_1.toRequiredInt)(raw.ALTERID);
                if (alterId > maxAlterId)
                    maxAlterId = alterId;
                const record = (0, compose_voucher_1.composeVoucherRecord)(raw, config.entityType);
                const bytes = Buffer.byteLength(JSON.stringify(record));
                if (bytes > 1024 * 1024)
                    throw new batch_fetch_errors_js_1.BatchTooLargeError("A single voucher exceeds the 1 MiB local batch limit");
                if (records.length &&
                    (records.length >= 100 || chunkBytes + bytes > 1024 * 1024)) {
                    onChunk?.(records.splice(0));
                    chunkBytes = 0;
                }
                records.push(record);
                chunkBytes += bytes;
            }
            if (records.length)
                onChunk?.(records.splice(0));
            return { recordCount: streamCount, maxAlterId };
        }
        catch (err) {
            response?.data?.destroy();
            lastErr = err;
            if (attempt < maxAttempts) {
                console.warn(`[Sync] ${config.entityType}: attempt ${attempt} failed (${err.message}), retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            }
        }
    }
    throw lastErr;
}
/** Fetches and outboxes one voucher batch (a full incremental pull, or one date-range backfill
 * chunk), and returns the max AlterId it saw. Does NOT upload — see enqueueMappedRecordChunks'
 * doc comment on why uploading is deferred to a trailing flush phase. The checkpoint advances
 * later, once a batch carrying this maxAlterId actually uploads (processBatch). */
async function buildAndQueueVoucherBatch(config, companyName, companyGuid, lastAlterId, dateRange, guard) {
    const syncRunId = (0, crypto_1.randomUUID)();
    db_js_1.durableOutbox.begin(syncRunId, companyGuid, config.entityType, dateRange ? config.voucherTypeName : null);
    db_js_1.dbQueries.insertSyncRun({
        id: syncRunId,
        companyId: companyGuid,
        entityType: config.entityType,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        recordCount: 0,
        status: "running",
        error: null,
    });
    try {
        const result = await fetchVoucherRecords(config, companyName, lastAlterId, dateRange, guard, (chunk) => {
            const groups = new Map();
            for (const r of chunk) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(r.voucherDate ?? ""))
                    throw new Error(`Voucher ${r.masterId} has no valid date`);
                const year = Number(r.voucherDate.slice(0, 4)) -
                    (Number(r.voucherDate.slice(5, 7)) < 4 ? 1 : 0);
                const key = String(year);
                if (!groups.has(key))
                    groups.set(key, {
                        financialYear: {
                            startDate: `${year}-04-01`,
                            endDate: `${year + 1}-03-31`,
                        },
                        vouchers: [],
                    });
                groups.get(key).vouchers.push(r);
            }
            const id = (0, crypto_1.randomUUID)();
            const payload = JSON.stringify({
                protocolVersion: 1,
                batchId: id,
                syncRunId,
                installationId: getInstallationId(),
                companySourceId: companyGuid,
                companyRegistrationId: (0, cloud_1.assertCompanyLicense)(companyGuid),
                companyName,
                company: db_js_1.dbQueries.getCompanyMetadata(companyGuid),
                entityType: config.entityType,
                checkpoint: { creationId: 0, alterationId: lastAlterId },
                recordCount: chunk.length,
                records: [...groups.values()],
            });
            db_js_1.durableOutbox.append(syncRunId, {
                id,
                companyId: companyGuid,
                entityType: config.entityType,
                payload,
                payloadHash: (0, outbox_1.payloadHash)(payload),
                createdAt: new Date().toISOString(),
                attemptCount: 0,
                nextAttemptAt: null,
                status: "pending",
                lastError: null,
                cloudAcknowledgedAt: null,
            });
        });
        db_js_1.durableOutbox.seal(syncRunId, result.maxAlterId);
        db_js_1.durableOutbox.advance(companyGuid, config.entityType);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), result.recordCount, "completed", null);
        return result;
    }
    catch (error) {
        db_js_1.durableOutbox.abort(syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), 0, "failed", error.message);
        throw error;
    }
}
/** Resumes backfill windows. Failed windows prevent checkpoint advancement until explicitly retried. */
async function runPlannerDrivenBackfill(config, companyName, companyGuid) {
    const settings = (0, sync_batch_settings_js_1.getSyncBatchSettings)();
    let next = voucherBatchPlanner.getNextRunnableBatch(companyGuid, config.voucherTypeName);
    while (next) {
        voucherBatchPlanner.markRunning(next.id);
        const summary = voucherBatchPlanner.getProgressSummary(companyGuid, config.voucherTypeName);
        console.log(`[Sync] ${config.entityType}: batch ${summary.completedBatches + 1}/${summary.totalBatches}, ` +
            `~${next.estimatedVoucherCount ?? "?"} estimated voucher(s), date range ${next.fromDate}-${next.toDate}`);
        const attemptNumber = next.attempts + 1;
        try {
            const { recordCount } = await buildAndQueueVoucherBatch(config, companyName, companyGuid, 0, { from: next.fromDate, to: next.toDate }, { startedAt: Date.now(), settings });
            voucherBatchPlanner.markCompleted(next.id, recordCount);
            db_js_1.durableOutbox.advance(companyGuid, config.entityType);
        }
        catch (err) {
            const outcome = voucherBatchPlanner.markFailedOrSplit(next.id, err);
            if (outcome === "retried") {
                const backoffMs = settings.retryBackoffBaseMs *
                    Math.pow(settings.retryBackoffMultiplier, next.attempts);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
            else if (outcome === "failed") {
                console.error(`[Sync] ${config.entityType} batch ${next.fromDate}-${next.toDate} permanently failed after ${attemptNumber} attempt(s):`, err);
            }
        }
        next = voucherBatchPlanner.getNextRunnableBatch(companyGuid, config.voucherTypeName);
    }
}
/**
 * A first-time sync (lastAlterId === 0) plans a persisted, resumable date-range backfill (see
 * voucher-batch-planner.ts) instead of one unbounded pull — keeping both Tally's response size
 * (the RAM-ballooning gotcha) and h7004's request body size bounded regardless of how much
 * history the company has, and letting an interrupted backfill resume on the next sync run
 * rather than starting over. Ported from h7001's voucher-sync.service.ts `syncVouchers`.
 */
async function runVoucherEntitySync(config, companyName, companyGuid) {
    (0, cloud_1.assertCompanyLicense)(companyGuid);
    if (db_js_1.durableOutbox.hasPending(companyGuid, config.entityType))
        return;
    const lastAlterId = db_js_1.dbQueries.getCheckpoint(companyGuid, config.entityType);
    if (voucherBatchPlanner.hasAnyPlan(companyGuid, config.voucherTypeName)) {
        voucherBatchPlanner.resetStaleRunningToPending(companyGuid, config.voucherTypeName);
        if (voucherBatchPlanner.hasUnfinishedWork(companyGuid, config.voucherTypeName)) {
            console.log(`[Sync] ${config.entityType}: resuming existing batch plan`);
            await runPlannerDrivenBackfill(config, companyName, companyGuid);
        }
        // lastAlterId here is a snapshot taken before the backfill above ran, so it can only be
        // meaningfully > 0 if some batch had already advanced the checkpoint before a prior crash.
        // When it's still 0, there's no AlterId to filter on — the next sync run picks up anything
        // entered since incrementally once the checkpoint has advanced.
        if (lastAlterId > 0) {
            await buildAndQueueVoucherBatch(config, companyName, companyGuid, lastAlterId, undefined);
        }
        return;
    }
    if (lastAlterId === 0) {
        console.log(`[Sync] ${config.entityType}: first-time sync, planning adaptive date-range batches`);
        await voucherBatchPlanner.planFresh(companyGuid, companyName, config.voucherTypeName);
        await runPlannerDrivenBackfill(config, companyName, companyGuid);
        // No trailing incremental fetch here: lastAlterId is 0 for this entire branch by definition,
        // so an AlterId-filtered "catch-up" call would have no filter to apply and would re-request
        // the whole unfiltered history a second time, undoing the point of the batching above.
        return;
    }
    // Company/voucher-type synced before this feature existed (lastAlterId > 0, no plan rows) —
    // unchanged incremental-only path.
    await buildAndQueueVoucherBatch(config, companyName, companyGuid, lastAlterId, undefined);
}
/**
 * Outstanding bills (payables/receivables) are a full snapshot report, not an incremental
 * master/transaction list — Tally's Bills Receivable/Payable report carries no AlterId, so
 * (matching h7001's syncOutstandingPayables/Receivables) this always re-fetches and re-sends
 * everything rather than tracking a checkpoint.
 */
/**
 * Each stock item's closing value as Tally itself computes it (its own costing method, tracked
 * notes, everything), from the books' start to today. The cloud shows these instead of its own
 * estimate whenever a report asks for today's closing stock, so the figures match Tally exactly.
 */
async function runStockValueSync(companyName, companyGuid) {
    const entityType = "stock_item_value";
    (0, cloud_1.assertCompanyLicense)(companyGuid);
    if (!(0, company_selection_1.canSyncCompany)(db_js_1.dbQueries.isBackendAuthenticated(), db_js_1.dbQueries.getCompanySetting(companyGuid)) ||
        db_js_1.durableOutbox.hasPending(companyGuid, entityType))
        return;
    const booksFrom = String(db_js_1.dbQueries.getCompanyMetadata(companyGuid).booksFrom ?? "").replace(/-/g, "");
    if (!/^\d{8}$/.test(booksFrom))
        return;
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const syncRunId = (0, crypto_1.randomUUID)();
    db_js_1.dbQueries.insertSyncRun({
        id: syncRunId,
        companyId: companyGuid,
        entityType,
        startedAt: now.toISOString(),
        finishedAt: null,
        recordCount: 0,
        status: "running",
        error: null,
    });
    try {
        const { data: xml } = await client_js_1.tallyClient.request({
            data: (0, stockitembalance_builder_js_1.stockItemBalanceBuilder)(companyName, booksFrom, local.replace(/-/g, "")),
            retries: db_js_1.dbQueries.getAppSettings().tallyRetryAttempts,
            maxResponseBytes: 50_000_000,
        });
        const records = (0, stock_value_mapper_js_1.parseStockValueSnapshot)(xml);
        (0, report_sync_1.stageOutstandingSnapshot)(db_js_1.durableOutbox, {
            entityType,
            companySourceId: companyGuid,
            companyRegistrationId: (0, cloud_1.assertCompanyLicense)(companyGuid),
            companyName,
            company: db_js_1.dbQueries.getCompanyMetadata(companyGuid),
            installationId: getInstallationId(),
        }, records, local, now.toISOString(), syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), records.length, "completed", null);
    }
    catch (error) {
        db_js_1.durableOutbox.abort(syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), 0, "failed", error instanceof Error ? error.message : String(error));
        throw error;
    }
}
async function runOutstandingSync(entityType, companyName, companyGuid) {
    (0, cloud_1.assertCompanyLicense)(companyGuid);
    if (!(0, company_selection_1.canSyncCompany)(db_js_1.dbQueries.isBackendAuthenticated(), db_js_1.dbQueries.getCompanySetting(companyGuid)) ||
        db_js_1.durableOutbox.hasPending(companyGuid, entityType))
        return;
    const syncRunId = (0, crypto_1.randomUUID)();
    const startedAt = new Date().toISOString();
    db_js_1.dbQueries.insertSyncRun({
        id: syncRunId,
        companyId: companyGuid,
        entityType,
        startedAt,
        finishedAt: null,
        recordCount: 0,
        status: "running",
        error: null,
    });
    try {
        const builder = entityType === "outstanding_receivable"
            ? osreceivables_builder_js_1.oSReceivablesBuilder
            : ospayables_builder_js_1.oSPayablesBuilder;
        const { data: xml } = await client_js_1.tallyClient.request({
            data: builder(companyName, true),
            retries: db_js_1.dbQueries.getAppSettings().tallyRetryAttempts,
            maxResponseBytes: 50_000_000,
        });
        const { asOf, records } = (0, outstanding_mapper_js_1.parseOutstandingSnapshot)(xml, {
            companyName,
            reportType: entityType,
        });
        (0, report_sync_1.stageOutstandingSnapshot)(db_js_1.durableOutbox, {
            entityType,
            companySourceId: companyGuid,
            companyRegistrationId: (0, cloud_1.assertCompanyLicense)(companyGuid),
            companyName,
            company: db_js_1.dbQueries.getCompanyMetadata(companyGuid),
            installationId: getInstallationId(),
        }, records, asOf, new Date().toISOString(), syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), records.length, "completed", null);
    }
    catch (error) {
        db_js_1.durableOutbox.abort(syncRunId);
        db_js_1.dbQueries.updateSyncRun(syncRunId, new Date().toISOString(), 0, "failed", error instanceof Error
            ? error.message
            : "Outstanding report fetch failed");
    }
}
/** Independent snapshot schedule; normal master/voucher sync never fetches these reports. */
exports.runOutstandingReports = (0, sync_errors_1.singleFlight)(() => (0, sync_scheduler_1.runExclusiveSync)(async () => {
    const settings = db_js_1.dbQueries.getAppSettings();
    if (!db_js_1.dbQueries.isBackendAuthenticated() ||
        !settings.outstandingReportSyncEnabled)
        return;
    const selected = db_js_1.dbQueries
        .getAllCompanySettings()
        .filter((company) => company.syncEnabled === 1);
    if (!selected.length)
        return;
    const dueReports = [];
    for (const company of selected) {
        if (!(0, company_selection_1.canSyncCompany)(db_js_1.dbQueries.isBackendAuthenticated(), db_js_1.dbQueries.getCompanySetting(company.companyId)))
            continue;
        const interval = settings.outstandingReportSyncFrequencyMinutes;
        const now = new Date().toISOString();
        const reportDue = new Map();
        for (const entityType of [
            "outstanding_receivable",
            "outstanding_payable",
        ]) {
            const previous = db_js_1.dbQueries.getLastSyncRun(company.companyId, entityType);
            const firstEligibleAt = db_js_1.dbQueries.getOrStartOutstandingReportSchedule(company.companyId, entityType, now);
            reportDue.set(entityType, (0, report_schedule_1.isOutstandingReportDue)(previous?.startedAt, firstEligibleAt, interval, Date.now(), db_js_1.dbQueries.getOutstandingReportLastAttempt(company.companyId, entityType)));
        }
        // Wait for committed master/voucher batches before capturing report state.
        if (exports.ALL_ENTITY_TYPES.filter((type) => !type.startsWith("outstanding_")).some((type) => db_js_1.dbQueries.getPendingCount(company.companyId, type) > 0))
            continue;
        const ledger = db_js_1.dbQueries.getLastSyncRun(company.companyId, "ledger");
        if (db_js_1.dbQueries.getCheckpoint(company.companyId, "ledger") === 0 &&
            ledger?.status !== "completed")
            continue;
        for (const entityType of [
            "outstanding_receivable",
            "outstanding_payable",
        ]) {
            if (!reportDue.get(entityType))
                continue;
            dueReports.push({
                companyName: company.companyName,
                companyId: company.companyId,
                entityType,
            });
        }
    }
    if (!dueReports.length)
        return;
    setSyncProgress({
        inProgress: true,
        completed: 0,
        total: dueReports.length,
        currentLabel: "Fetching outstanding reports",
        startedAt: new Date().toISOString(),
        finishedAt: null,
    });
    try {
        for (const report of dueReports) {
            // Persist the throttle before contacting Tally so failed requests and process restarts
            // cannot turn the 30-second scheduler tick into a tight retry loop.
            db_js_1.dbQueries.markOutstandingReportAttempt(report.companyId, report.entityType, new Date().toISOString());
            setSyncProgress({
                currentLabel: `${report.companyName} - ${report.entityType}`,
            });
            await runOutstandingSync(report.entityType, report.companyName, report.companyId);
            setSyncProgress({ completed: syncProgress.completed + 1 });
        }
        await (0, exports.retrySweep)();
    }
    finally {
        setSyncProgress({
            inProgress: false,
            currentLabel: null,
            finishedAt: new Date().toISOString(),
        });
    }
}));
/** Acknowledges a committed batch atomically; the outbox owns the complete-fetch watermark. */
async function processBatch(batch) {
    // Recovery can supersede a batch after a retry sweep has already materialized
    // its pending-ID list. Never send that stale row, and don't let its failure
    // defer the corrected replacement for the same company.
    if (db_js_1.dbQueries.isOutboxBatchBlocked(batch.id))
        return true;
    const result = await exports.cloudUploader.uploadBatch(batch, {
        manualRetry: manualRetryBatchIds.has(batch.id),
    });
    if (result.ok) {
        db_js_1.durableOutbox.acknowledge(batch);
        console.log(`[Sync] Cloud accepted ${batch.entityType} batch ${batch.id} for company ${batch.companyId}`);
        return true;
    }
    else {
        if (db_js_1.dbQueries.isOutboxBatchBlocked(batch.id)) {
            console.warn(`[Sync] Ignored late cloud rejection for superseded batch ${batch.id}; its corrected replacement remains queued`);
            return true;
        }
        const attemptCount = batch.attemptCount + 1;
        const { blocked, nextAttemptAt } = (0, sync_recovery_1.uploadRecovery)(result, attemptCount);
        db_js_1.dbQueries.updateOutboxBatchStatus(batch.id, "failed", nextAttemptAt, result.error, null, attemptCount);
        if (blocked)
            db_js_1.durableOutbox.block(batch.id, result.error);
        console.error(`[Sync] Cloud rejected ${batch.entityType} batch ${batch.id} for company ${batch.companyId}; ${blocked ? "blocked until repaired or manually retried" : `retry scheduled for ${nextAttemptAt ?? "next sync"}`}. Error: ${result.error}`);
        return false;
    }
}
// Every entity type this connector syncs, for UI/status code (settings.ts) to aggregate across
// without needing its own hardcoded, easily-stale list of names.
exports.ALL_ENTITY_TYPES = [
    "company",
    ...SYNC_CONFIGS.map((c) => c.entityType),
    "stock_item_bom",
    ...exports.VOUCHER_SYNC_CONFIGS.map((c) => c.entityType),
    "outstanding_payable",
    "outstanding_receivable",
    "stock_item_value",
];
let syncInFlight = null;
async function waitForSyncIdle() {
    if (syncInFlight)
        await syncInFlight;
    await (0, sync_scheduler_1.waitForExclusiveSync)();
    await (0, exports.retrySweep)();
}
/**
 * Guards against overlapping runs — the auto-sync timer (main.ts's scheduleAutoSync) and the
 * Settings window's "Sync Now" button both call this directly, with nothing previously stopping
 * them firing at the same time. When they did, both read the same not-yet-advanced checkpoint,
 * both decided the same large master list needed syncing, and both fetched + uploaded it —
 * confirmed against real data as duplicate outbox batches with identical record counts a few
 * seconds apart. A "Sync Now" click (or an auto-sync tick) while one is already running now just
 * awaits the in-flight run instead of starting a second one.
 */
function runAllSyncs() {
    if (syncInFlight) {
        console.log("[Sync] runAllSyncs already in progress — awaiting it instead of starting another");
        return syncInFlight;
    }
    syncInFlight = (0, sync_scheduler_1.runExclusiveSync)(async () => {
        setSyncProgress({
            inProgress: true,
            completed: 0,
            total: 0,
            currentLabel: "Preparing sync",
            startedAt: new Date().toISOString(),
            finishedAt: null,
        });
        try {
            await runAllSyncsInternal();
        }
        finally {
            setSyncProgress({
                inProgress: false,
                currentLabel: null,
                finishedAt: new Date().toISOString(),
            });
        }
    }).finally(() => {
        syncInFlight = null;
    });
    return syncInFlight;
}
async function runAllSyncsInternal() {
    // Set by runAllSyncs when the run began, so "Time Taken" includes the preparation work below
    // (licence renewal, company discovery), not just the fetch/upload steps.
    const runStartedAt = syncProgress.startedAt ?? new Date().toISOString();
    if (!db_js_1.dbQueries.isBackendAuthenticated())
        return;
    db_js_1.dbQueries.recoverDeferredWork();
    const recoveredBomBatches = db_js_1.durableOutbox.recoverLegacyStockItemBomBatches();
    if (recoveredBomBatches)
        console.warn(`[Sync] Recovered ${recoveredBomBatches} failed stock-item batch(es) by deferring BOM uploads until all stock items are synced`);
    db_js_1.durableOutbox.recoverSelfReferentialBomBatches();
    db_js_1.durableOutbox.recoverInvalidVoucherBillAllocations();
    db_js_1.durableOutbox.recoverInvalidVoucherRecordCounts();
    const repairedCompanyBatches = db_js_1.durableOutbox.recoverInvalidCompanyBatches();
    if (repairedCompanyBatches)
        console.warn(`[Sync] Replaced ${repairedCompanyBatches} failed company batch(es) after repairing duplicate contact method ordering`);
    const repairedLedgerBatches = db_js_1.durableOutbox.recoverInvalidLedgerBatches();
    if (repairedLedgerBatches)
        console.warn(`[Sync] Replaced ${repairedLedgerBatches} failed ledger batch(es) after repairing validation failures`);
    if (!db_js_1.dbQueries
        .getAllCompanySettings()
        .some((company) => company.syncEnabled === 1))
        return;
    const isReachable = await checkTallyReachability();
    if (!isReachable) {
        console.log("Tally not reachable, skipping sync.");
        return;
    }
    await (0, cloud_1.renewConnectorLicense)();
    const companies = await discoverCompanies();
    const enabledCompanies = companies.filter((c) => {
        const setting = db_js_1.dbQueries.getCompanySetting(c.guid);
        if (!(0, company_selection_1.canSyncCompany)(db_js_1.dbQueries.isBackendAuthenticated(), setting))
            return false;
        try {
            (0, cloud_1.assertCompanyLicense)(c.guid, c.metadata.tallySerial);
            return true;
        }
        catch (error) {
            console.warn(`[License] ${c.name}:`, error);
            return false;
        }
    });
    // Every master/voucher entity is checked every tick, unconditionally — matching h7001's own
    // sync.service.ts, which has no upfront "did this change" probe at all and just relies on each
    // entity's own AlterId-filtered request being cheap (a near-empty response) when nothing
    // changed. An earlier version of this connector added a two-request-per-company pre-probe
    // (AllAlteredMastersXML/AllAlteredTransXML) to skip unchanged entity types, but that's exactly
    // the kind of extra Tally round-trip h7001 doesn't do — removed so this matches h7001's
    // behavior (and perceived responsiveness) instead of diverging from it.
    const steps = [];
    for (const comp of enabledCompanies) {
        steps.push({
            label: `${comp.name} — company`,
            run: async () => (0, company_sync_1.stageCompanySync)(db_js_1.durableOutbox, comp.guid, comp.name, db_js_1.dbQueries.getCompanyMetadata(comp.guid), getInstallationId(), (0, cloud_1.assertCompanyLicense)(comp.guid)),
        });
        for (const config of SYNC_CONFIGS) {
            steps.push({
                label: `${comp.name} — ${config.entityType}`,
                run: () => runEntitySync(config, comp.name, comp.guid),
            });
        }
        for (const config of exports.VOUCHER_SYNC_CONFIGS) {
            steps.push({
                label: `${comp.name} — ${config.entityType}`,
                run: () => runVoucherEntitySync(config, comp.name, comp.guid),
            });
        }
        // After the vouchers, so Tally's values describe the same books just fetched.
        steps.push({
            label: `${comp.name} — stock_item_value`,
            run: () => runStockValueSync(comp.name, comp.guid),
        });
        // Outstanding snapshots have no backend contract yet. Keep old queues for repair,
        // but do not generate validation failures every time the scheduler runs.
    }
    setSyncProgress({
        inProgress: true,
        completed: 0,
        total: steps.length,
        currentLabel: steps[0]?.label ?? null,
        finishedAt: null,
    });
    try {
        for (const step of steps) {
            setSyncProgress({ currentLabel: step.label });
            try {
                await step.run();
            }
            catch (error) {
                console.error(`[Sync] ${step.label} failed`, error);
            }
            setSyncProgress({ completed: syncProgress.completed + 1 });
        }
        // Every step above only reads from Tally and writes to the local outbox — nothing gets
        // uploaded to the cloud until every company/entity type has finished fetching. Uploading
        // interleaved with fetching (the previous behavior) meant Tally requests and cloud HTTP calls
        // were competing for the same tick, which is exactly the kind of extra load h7001 never has to
        // contend with (it has no cloud upload step at all). `inProgress` stays true through this flush
        // so the periodic retry-sweep timer (main.ts) also holds off — no cloud traffic at all happens
        // "in between," only before (never, on a first run) and after this point.
        setSyncProgress({ currentLabel: "Uploading to cloud" });
        await (0, exports.retrySweep)();
        const runFinishedAt = new Date().toISOString();
        for (const comp of enabledCompanies)
            db_js_1.dbQueries.setLastFullSync(comp.guid, runStartedAt, runFinishedAt);
    }
    finally {
        setSyncProgress({
            inProgress: false,
            currentLabel: null,
            finishedAt: new Date().toISOString(),
        });
    }
}
function toggleCompanySync(companyId, companyName, enabled) {
    const setting = db_js_1.dbQueries.getCompanySetting(companyId);
    if (!db_js_1.dbQueries.isBackendAuthenticated() || setting?.selected !== 1)
        throw new Error("Sign in and add this company before changing its sync setting");
    db_js_1.dbQueries.upsertCompanySetting(companyId, companyName, enabled ? 1 : 0);
}
exports.retrySweep = (0, sync_errors_1.singleFlight)(async () => {
    if (!db_js_1.dbQueries.isBackendAuthenticated())
        return;
    db_js_1.dbQueries.recoverDeferredWork();
    const recoveredBomBatches = db_js_1.durableOutbox.recoverLegacyStockItemBomBatches();
    if (recoveredBomBatches)
        console.warn(`[Sync] Recovered ${recoveredBomBatches} failed stock-item batch(es) by deferring BOM uploads until all stock items are synced`);
    db_js_1.durableOutbox.recoverSelfReferentialBomBatches();
    db_js_1.durableOutbox.recoverInvalidVoucherBillAllocations();
    db_js_1.durableOutbox.recoverInvalidVoucherRecordCounts();
    const repairedCompanyBatches = db_js_1.durableOutbox.recoverInvalidCompanyBatches();
    if (repairedCompanyBatches)
        console.warn(`[Sync] Replaced ${repairedCompanyBatches} failed company batch(es) after repairing duplicate contact method ordering`);
    const repairedLedgerBatches = db_js_1.durableOutbox.recoverInvalidLedgerBatches();
    if (repairedLedgerBatches)
        console.warn(`[Sync] Replaced ${repairedLedgerBatches} failed ledger batch(es) after repairing validation failures`);
    // Fetch ids up front (cheap), then load each batch's full row — including its potentially
    // multi-MB `payload` — one at a time, immediately before it's needed. A batch falls out of
    // scope (GC-eligible) as soon as its own loop iteration ends, instead of every pending batch's
    // payload being resident in memory simultaneously for the whole sweep (see getPendingBatchIds'
    // doc comment — this is what caused the connector to OOM on a large first-time backfill, where
    // ~30 outbox batches across every voucher type were all pending for this trailing flush at once).
    const pendingIds = db_js_1.dbQueries.getPendingBatchIds();
    const byCompany = new Map();
    for (const id of pendingIds) {
        const batch = db_js_1.dbQueries.getOutboxBatchById(id);
        if (!batch ||
            !(0, company_selection_1.canSyncCompany)(db_js_1.dbQueries.isBackendAuthenticated(), db_js_1.dbQueries.getCompanySetting(batch.companyId)))
            continue;
        const rows = byCompany.get(batch.companyId) ?? [];
        rows.push({
            id: batch.id,
            entityType: batch.entityType,
            nextAttemptAt: batch.nextAttemptAt,
        });
        byCompany.set(batch.companyId, rows);
    }
    // Only a sweep that's part of a visible sync run reports progress; the background 30s timer
    // never runs while one is in progress (main.ts), so it never touches the bar.
    const reportUploadProgress = syncProgress.inProgress;
    if (reportUploadProgress) {
        let uploadTotal = 0;
        for (const rows of byCompany.values())
            uploadTotal += rows.length;
        setSyncProgress({
            currentLabel: "Uploading to cloud",
            completed: 0,
            total: uploadTotal,
        });
    }
    // Independent batches within an entity type can be uploaded together. Entity types
    // remain a strict sequence, preserving the master dependency order and the master-to-
    // voucher barrier. Keep potentially hierarchical masters sequential within their type.
    const concurrency = 4;
    let activeUploads = 0;
    const uploadWaiters = [];
    const processWithSlot = async (id) => {
        if (activeUploads >= concurrency) {
            await new Promise((resolve) => uploadWaiters.push(resolve));
        }
        else {
            activeUploads++;
        }
        try {
            const batch = db_js_1.dbQueries.getOutboxBatchById(id);
            if (!batch || db_js_1.dbQueries.isOutboxBatchBlocked(id))
                return true;
            return await processBatch(batch);
        }
        finally {
            if (reportUploadProgress)
                setSyncProgress({ completed: syncProgress.completed + 1 });
            const next = uploadWaiters.shift();
            if (next)
                next();
            else
                activeUploads--;
        }
    };
    const sequentialTypes = new Set([
        "ledger_group",
        "cost_centre",
        "stock_group",
        "stock_category",
        "godown",
    ]);
    const runBatchGroup = async (batches) => {
        let next = 0;
        const workers = Array.from({ length: Math.min(concurrency, batches.length) }, async () => {
            while (next < batches.length) {
                const batch = batches[next++];
                if (!(await processWithSlot(batch.id)))
                    return false;
            }
            return true;
        });
        const results = await Promise.all(workers);
        return results.every(Boolean);
    };
    // Different companies have independent reference namespaces and can progress at once.
    // Each company still completes one entity type before starting the next.
    const companyQueue = [...byCompany.values()];
    let nextCompany = 0;
    const companyWorkers = Array.from({ length: Math.min(concurrency, companyQueue.length) }, async () => {
        while (nextCompany < companyQueue.length) {
            const batches = companyQueue[nextCompany++];
            const groups = new Map();
            for (const batch of batches) {
                const group = groups.get(batch.entityType) ?? [];
                group.push(batch);
                groups.set(batch.entityType, group);
            }
            for (const group of groups.values()) {
                const entityType = group[0].entityType;
                const due = [];
                for (const batch of group) {
                    if (batch.nextAttemptAt && Date.parse(batch.nextAttemptAt) > Date.now())
                        return;
                    due.push(batch);
                }
                const ok = sequentialTypes.has(entityType)
                    ? await (async () => {
                        for (const batch of due)
                            if (!(await processWithSlot(batch.id)))
                                return false;
                        return true;
                    })()
                    : await runBatchGroup(due);
                if (!ok)
                    return; // a missing/failed prerequisite blocks later entity types
            }
        }
    });
    await Promise.all(companyWorkers);
});
async function retryOutboxBatchNow(id) {
    if (!db_js_1.dbQueries.retryBatchNow(id))
        throw new Error("This failed batch is no longer available to retry");
    manualRetryBatchIds.add(id);
    try {
        // A timer sweep may already be active with an older retry deadline snapshot.
        await (0, exports.retrySweep)();
        await (0, exports.retrySweep)();
    }
    finally {
        manualRetryBatchIds.delete(id);
    }
}
