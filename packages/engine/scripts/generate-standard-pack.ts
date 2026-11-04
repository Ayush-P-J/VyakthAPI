/**
 * Generates the Standard pack from the connector's verified builders.
 * Run: pnpm --filter @hexspare/tally-engine generate
 * The output is committed, so the cloud container never needs the connector code.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { CONNECTOR_DIST, loadBuilderModule, outputsFor, paramNamesOf } from "./builders.ts";
import { templateFromOutputs } from "../src/extract.ts";
import { deriveShape } from "../src/derive.ts";
import { compileKeysTemplate } from "../src/compile.ts";
import { INTERNAL_TAGS, type DatasetDef, type Pack } from "../src/definition.ts";
import { tdlMessage, parseXmlTree } from "../src/tree.ts";

const { VOUCHER_TYPE_SYSTEM_VARS: VARS } = createRequire(import.meta.url)(resolve(CONNECTOR_DIST, "tally-core/xml/builders/voucher-date-count.builder.js"));

const MASTERS = [
  ["ledgers", "Ledgers", "ledger.builder.js", "ledgerBuilder"],
  ["ledger_groups", "Ledger groups", "ledgergroups.builder.js", "ledgerGroupsBuilder"],
  ["cost_centres", "Cost centres", "costcenter.builder.js", "costCenterBuilder"],
  ["cost_categories", "Cost categories", "costcategory.builder.js", "costCategoryBuilder"],
  ["stock_items", "Stock items", "items.builder.js", "itemsBuilder"],
  ["stock_groups", "Stock groups", "itemsgroup.builder.js", "itemsgroupBuilder"],
  ["stock_categories", "Stock categories", "itemscategory.builder.js", "itemsCategoryBuilder"],
  ["godowns", "Godowns", "godown.builder.js", "godownBuilder"],
  ["units", "Units", "unit.builder.js", "unitBuilder"],
  ["voucher_types", "Voucher types", "vouchertype.builder.js", "voucherTypeBuilder"],
] as const;
const VOUCHERS = [
  ["contras", "Contra vouchers", "contra.builder.js", "contraBuilder", "Contra"],
  ["credit_notes", "Credit notes", "creditnote.builder.js", "creditnoteBuilder", "CreditNote"],
  ["debit_notes", "Debit notes", "debitnote.builder.js", "debitnoteBuilder", "DebitNote"],
  ["delivery_notes", "Delivery notes", "deliverynote.builder.js", "deliverynoteBuilder", "DeliveryNote"],
  ["journals", "Journal vouchers", "journal.builder.js", "journalBuilder", "Journal"],
  ["payments", "Payment vouchers", "payment.builder.js", "paymentBuilder", "Payment"],
  ["purchases", "Purchase vouchers", "purchase.builder.js", "purchaseBuilder", "Purchase"],
  ["purchase_orders", "Purchase orders", "purchaseorder.builder.js", "purchaseorderBuilder", "PurchaseOrder"],
  ["receipts", "Receipt vouchers", "receipt.builder.js", "receiptBuilder", "Receipt"],
  ["receipt_notes", "Receipt notes", "receiptnote.builder.js", "receiptnoteBuilder", "ReceiptNote"],
  ["sales", "Sales vouchers", "sales.builder.js", "salesBuilder", "Sales"],
  ["sales_orders", "Sales orders", "salesorder.builder.js", "salesorderBuilder", "SalesOrder"],
  ["stock_journals", "Stock journals", "stockjournal.builder.js", "stockJournalBuilder", "StockJournal"],
  ["physical_stock", "Physical stock", "physicalstock.builder.js", "physicalstockBuilder", "PhysicalStock"],
] as const;

function build(name: string, title: string, file: string, fnName: string, kind: "master" | "voucher", voucherVar?: string): DatasetDef {
  const fn = loadBuilderModule(file)[fnName]!;
  const params = paramNamesOf(fn);
  const outputs = outputsFor(fn as never, params);
  const template = templateFromOutputs(outputs);
  const shape = deriveShape(outputs.base.replace(/_\d{13}_\d+/g, ""));
  const systems = (tdlMessage(parseXmlTree(outputs.base))?.children ?? []).filter((n) => n.tag.toUpperCase() === "SYSTEM");
  const fields = shape.root.fields.filter((f) => !INTERNAL_TAGS.has(f.tag));
  const paging = params.some((p) => /daterange/i.test(p)) ? "date" : params.some((p) => /masteridrange/i.test(p)) ? "masterId" : "none";
  return {
    name, kind, title, rowTag: shape.root.tag, tdlLine: shape.root.tdlLine, tdlCollection: shape.collection?.attrs?.NAME ?? "", paging,
    ...(voucherVar ? { voucherVar } : {}),
    template, keysTemplate: compileKeysTemplate(shape.collection, systems),
    fields, lines: shape.root.lines,
  };
}

const datasets: DatasetDef[] = [
  ...MASTERS.map(([n, t, f, b]) => build(n, t, f, b, "master")),
  ...VOUCHERS.map(([n, t, f, b, v]) => build(n, t, f, b, "voucher", VARS[v])),
];
const companiesRequest = loadBuilderModule("companies.builder.js").companiesBuilder!();
const pack: Pack = { name: "Standard", version: 1, datasets, companiesRequest };
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../src/standard-pack.generated.json");
writeFileSync(out, JSON.stringify(pack));
for (const d of datasets) console.log(d.name.padEnd(18), d.rowTag.padEnd(20), d.paging.padEnd(9), `fields=${d.fields.length}`, `lines=${d.lines.map((l) => l.name).join(",")}`);
console.log("bytes", JSON.stringify(pack).length);
