/** The write path: developer JSON in, one Tally import request out. */
import { z } from "zod";
import { createHash } from "node:crypto";
import { compileSmallReport } from "./compile.ts";
import { assertExportOnly, assertWriteSafe } from "./guards.ts";
import { escapeXml } from "./escape.ts";
import { collectRows, stripIllegalCharRefs, unwrap } from "./parser.ts";
import { parseDate } from "./normalise.ts";
import { parseXmlTree, type XmlNode } from "./tree.ts";
import type { FieldDef } from "./definition.ts";

const money = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const name = z.string().min(1).max(200);

export const VoucherInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  voucherType: name.optional(),
  voucherNumber: z.string().max(100).optional(),
  reference: z.string().max(200).optional(),
  narration: z.string().max(2000).optional(),
  entries: z.array(z.object({
    ledger: name,
    side: z.enum(["Dr", "Cr"]),
    amountPaise: money,
    bills: z.array(z.object({ name, type: z.enum(["New Ref", "Agst Ref", "Advance", "On Account"]), amountPaise: money })).max(200).optional(),
  })).min(2).max(500),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();
export type VoucherInput = z.infer<typeof VoucherInput>;

export const LedgerInput = z.object({
  name, parent: name,
  openingBalancePaise: z.number().int().optional(),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();
export type LedgerInput = z.infer<typeof LedgerInput>;

/** Datasets accepting writes, added one voucher type at a time as the build plan asks. */
export const WRITABLE_VOUCHERS: Record<string, { voucherType: string; voucherVar: string }> = {
  receipts: { voucherType: "Receipt", voucherVar: "$$VchTypeReceipt" },
  payments: { voucherType: "Payment", voucherVar: "$$VchTypePayment" },
  contras: { voucherType: "Contra", voucherVar: "$$VchTypeContra" },
  journals: { voucherType: "Journal", voucherVar: "$$VchTypeJournal" },
};
export const isWritable = (dataset: string) => dataset === "ledgers" || dataset in WRITABLE_VOUCHERS;

/**
 * Tally has no idempotency header; REMOTEID is the equivalent. Hashing the key makes it safe in XML
 * and in a TDL string, and binding the connection means two companies never share an ID.
 */
export function remoteIdFor(connectionId: string, idempotencyKey: string): string {
  return `hx-${connectionId}-${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 32)}`;
}

const paiseToAmount = (paise: number, negative: boolean) =>
  `${negative ? "-" : ""}${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;

const compactDate = (iso: string) => iso.replaceAll("-", "");

function udfXml(values: Record<string, unknown> | undefined, fields: FieldDef[]): string {
  return Object.entries(values ?? {}).map(([key, value]) => {
    const f = fields.find((x) => x.name === key && x.custom);
    if (!f) throw new WriteValidationError([{ code: "unknown_custom_field", path: `customFields.${key}`, message: `"${key}" is not a mapped custom field on this dataset.` }]);
    if (f.privacy !== "public") throw new WriteValidationError([{ code: "field_not_writable", path: `customFields.${key}`, message: `"${key}" is masked or excluded, so it cannot be written.` }]);
    if (!f.udfName || f.udfIndex === undefined) throw new WriteValidationError([{ code: "field_not_writable", path: `customFields.${key}`, message: `"${key}" is a computed expression rather than a discovered UDF, so it cannot be written.` }]);
    const tag = `UDF:${f.udfName.toUpperCase()}`;
    const desc = `\`${escapeXml(f.udfName)}\``;
    return `<${tag}.LIST DESC="${desc}" ISLIST="YES" TYPE="${escapeXml(f.udfType ?? "String")}" INDEX="${f.udfIndex}"><${tag} DESC="${desc}">${escapeXml(String(value))}</${tag}></${tag}.LIST>`;
  }).join("");
}

function envelope(company: string, report: string, object: string): string {
  return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>${report}</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF">${object}</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

export interface WriteIssue { code: string; path?: string; message: string }
export class WriteValidationError extends Error {
  override name = "WriteValidationError";
  constructor(public issues: WriteIssue[]) { super(issues.map((i) => i.message).join("; ")); }
}

/** Checks that need no Tally connection. */
export function validateVoucherShape(input: VoucherInput): WriteIssue[] {
  const issues: WriteIssue[] = [];
  if (parseDate(input.date) === null) issues.push({ code: "invalid_date", path: "date", message: `${input.date} is not a real date.` });
  let net = 0n;
  input.entries.forEach((e, i) => {
    net += e.side === "Dr" ? BigInt(e.amountPaise) : -BigInt(e.amountPaise);
    if (e.ledger !== e.ledger.trim()) issues.push({ code: "ledger_name_spaces", path: `entries[${i}].ledger`, message: `Ledger name "${e.ledger}" has leading or trailing spaces. Tally will not match it.` });
    if (e.bills) {
      const billed = e.bills.reduce((s, b) => s + BigInt(b.amountPaise), 0n);
      if (billed !== BigInt(e.amountPaise)) issues.push({ code: "bills_do_not_match", path: `entries[${i}].bills`, message: "Bill allocations must add up to the entry amount." });
    }
  });
  if (net !== 0n) issues.push({ code: "unbalanced_voucher", path: "entries", message: "Debits and credits must be equal." });
  return issues;
}

export function compileVoucherWrite(opts: {
  company: string; dataset: string; input: VoucherInput; remoteId: string;
  action: "create" | "alter"; masterId?: string; customFieldDefs?: FieldDef[];
}): string {
  const { input } = opts;
  const issues = validateVoucherShape(input);
  if (issues.length) throw new WriteValidationError(issues);
  const meta = WRITABLE_VOUCHERS[opts.dataset];
  if (!meta) throw new WriteValidationError([{ code: "dataset_not_writable", message: `${opts.dataset} does not accept writes yet.` }]);
  const vchType = input.voucherType ?? meta.voucherType;
  const entries = input.entries.map((e) => {
    const dr = e.side === "Dr";
    const bills = (e.bills ?? []).map((b) =>
      `<BILLALLOCATIONS.LIST><NAME>${escapeXml(b.name)}</NAME><BILLTYPE>${escapeXml(b.type)}</BILLTYPE><AMOUNT>${paiseToAmount(b.amountPaise, dr)}</AMOUNT></BILLALLOCATIONS.LIST>`).join("");
    return `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(e.ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${dr ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${paiseToAmount(e.amountPaise, dr)}</AMOUNT>${bills}</ALLLEDGERENTRIES.LIST>`;
  }).join("");
  const identity = opts.action === "alter"
    ? `TAGNAME="MASTER ID" TAGVALUE="${escapeXml(opts.masterId ?? "")}" ACTION="Alter"`
    : `REMOTEID="${escapeXml(opts.remoteId)}" ACTION="Create"`;
  const object = `<VOUCHER ${identity} VCHTYPE="${escapeXml(vchType)}"><DATE>${compactDate(input.date)}</DATE><VOUCHERTYPENAME>${escapeXml(vchType)}</VOUCHERTYPENAME>` +
    (input.voucherNumber ? `<VOUCHERNUMBER>${escapeXml(input.voucherNumber)}</VOUCHERNUMBER>` : "") +
    (input.reference ? `<REFERENCE>${escapeXml(input.reference)}</REFERENCE>` : "") +
    (input.narration ? `<NARRATION>${escapeXml(input.narration)}</NARRATION>` : "") +
    entries + udfXml(input.customFields, opts.customFieldDefs ?? []) + `</VOUCHER>`;
  const xml = envelope(opts.company, "Vouchers", object);
  assertWriteSafe(xml);
  return xml;
}

export function compileLedgerWrite(opts: { company: string; input: LedgerInput; action: "create" | "alter"; existingName?: string; customFieldDefs?: FieldDef[] }): string {
  const { input } = opts;
  if (input.name !== input.name.trim()) throw new WriteValidationError([{ code: "ledger_name_spaces", path: "name", message: "Ledger name has leading or trailing spaces." }]);
  const target = opts.action === "alter" ? (opts.existingName ?? input.name) : input.name;
  const opening = input.openingBalancePaise === undefined ? "" :
    `<OPENINGBALANCE>${paiseToAmount(Math.abs(input.openingBalancePaise), input.openingBalancePaise < 0)}</OPENINGBALANCE>`;
  const object = `<LEDGER NAME="${escapeXml(target)}" ACTION="${opts.action === "alter" ? "Alter" : "Create"}"><NAME>${escapeXml(input.name)}</NAME><PARENT>${escapeXml(input.parent)}</PARENT>${opening}${udfXml(input.customFields, opts.customFieldDefs ?? [])}</LEDGER>`;
  const xml = envelope(opts.company, "All Masters", object);
  assertWriteSafe(xml);
  return xml;
}

const DATE_AS_NUMBER = "((($$YearOfDate:$Date)*10000)+(($$MonthOfDate:$Date)*100)+($$DayOfDate:$Date))";

/** Checks whether a job's voucher already exists, so a retry never relies on Tally's REMOTEID behaviour alone. */
export function compileVoucherLookup(opts: { company: string; voucherVar: string; remoteId: string; date: string; uid: string }): string {
  if (!/^[\w-]+$/.test(opts.remoteId)) throw new Error("Unsafe remote id");
  const ymd = Number(compactDate(opts.date));
  const xml = compileSmallReport({
    name: "HxLookup", uid: opts.uid, company: opts.company,
    collection: `<TYPE>Vouchers : VoucherType</TYPE><CHILDOF>${opts.voucherVar}</CHILDOF><BELONGSTO>Yes</BELONGSTO><FILTERS>HxRemote</FILTERS><FILTERS>HxDay</FILTERS>`,
    columns: [{ tag: "MASTERIDVALUE", expr: "$MASTERID" }, { tag: "GUIDVALUE", expr: "$GUID" }],
    formulas: [
      { name: "HxRemote", expr: `$GUID = "${opts.remoteId}" or $RemoteID = "${opts.remoteId}"` },
      { name: "HxDay", expr: `${DATE_AS_NUMBER} = ${ymd}` },
    ],
  });
  assertExportOnly(xml);
  return xml;
}

/** Checks whether a ledger master of this name exists. Names are compared locally, so nothing user-typed reaches a TDL formula. */
export function compileLedgerNames(company: string, uid: string): string {
  const xml = compileSmallReport({ name: "HxLedgers", uid, company, collection: "<TYPE>Ledger</TYPE>", columns: [{ tag: "MASTERIDVALUE", expr: "$MASTERID" }, { tag: "NAMEVALUE", expr: "$Name" }] });
  assertExportOnly(xml);
  return xml;
}

export function compileVoucherTypes(company: string, uid: string): string {
  const xml = compileSmallReport({ name: "HxVchTypes", uid, company, collection: "<TYPE>VoucherType</TYPE>", columns: [{ tag: "NAMEVALUE", expr: "$Name" }, { tag: "NUMBERINGVALUE", expr: "$NumberingMethod" }] });
  assertExportOnly(xml);
  return xml;
}

export interface PreflightRequests { ledgers: string; voucherTypes: string; companies: string }
export interface PreflightData {
  ledgerNames: string[];
  voucherTypes: { name: string; numbering: string | null }[];
  company: { name: string; booksFrom: string | null } | null;
}

const ROW = new Set(["ROW"]);
export const COMPANY_ROW = new Set(["COMPANY"]);

export async function readPreflight(company: string, responses: { ledgers: string; voucherTypes: string; companies: string }): Promise<PreflightData> {
  const ledgerRows = await collectRows(responses.ledgers, ROW);
  const typeRows = await collectRows(responses.voucherTypes, ROW);
  const companies = await collectRows(responses.companies, COMPANY_ROW);
  const co = companies.find((c) => (unwrap(c.NAME) ?? "").trim().toLowerCase() === company.trim().toLowerCase());
  return {
    ledgerNames: ledgerRows.map((r) => unwrap(r.NAMEVALUE)).filter((x): x is string => Boolean(x)),
    voucherTypes: typeRows.map((r) => ({ name: unwrap(r.NAMEVALUE) ?? "", numbering: unwrap(r.NUMBERINGVALUE) })),
    company: co ? { name: unwrap(co.NAME)!, booksFrom: parseDate(unwrap(co.BOOKSFROM)) } : null,
  };
}

/** The dry run: every rejection cause we know how to detect before posting, reported per line. */
export function evaluateVoucher(input: VoucherInput, defaultType: string, data: PreflightData): WriteIssue[] {
  const issues = validateVoucherShape(input);
  const known = new Set(data.ledgerNames.map((n) => n.toLowerCase()));
  input.entries.forEach((e, i) => {
    if (!known.has(e.ledger.toLowerCase())) issues.push({ code: "unknown_ledger", path: `entries[${i}].ledger`, message: `Ledger "${e.ledger}" does not exist in this company. It may have been renamed or deleted.` });
  });
  const typeName = input.voucherType ?? defaultType;
  const vt = data.voucherTypes.find((t) => t.name.toLowerCase() === typeName.toLowerCase());
  if (!vt) issues.push({ code: "unknown_voucher_type", path: "voucherType", message: `Voucher type "${typeName}" does not exist in this company.` });
  else if (/manual/i.test(vt.numbering ?? "") && !input.voucherNumber) issues.push({ code: "voucher_number_required", path: "voucherNumber", message: `Voucher type "${typeName}" uses manual numbering, so a voucher number is required.` });
  if (!data.company) issues.push({ code: "company_not_open", message: "This company is not open in Tally." });
  else if (data.company.booksFrom && input.date < data.company.booksFrom) issues.push({ code: "date_before_books", path: "date", message: `${input.date} is before the books begin (${data.company.booksFrom}).` });
  return issues;
}

export function evaluateLedger(input: LedgerInput, action: "create" | "alter", data: PreflightData): WriteIssue[] {
  const issues: WriteIssue[] = [];
  const exists = data.ledgerNames.some((n) => n.toLowerCase() === input.name.toLowerCase());
  if (action === "create" && exists) issues.push({ code: "ledger_exists", path: "name", message: `Ledger "${input.name}" already exists.` });
  if (!data.company) issues.push({ code: "company_not_open", message: "This company is not open in Tally." });
  return issues;
}

export interface ImportResult {
  ok: boolean;
  created: number; altered: number; errors: number; exceptions: number; ignored: number;
  tallyId: string | null;
  issues: WriteIssue[];
}

function findAll(node: XmlNode, out: Map<string, string[]>): void {
  const tag = node.tag.toUpperCase();
  if (node.text) out.set(tag, [...(out.get(tag) ?? []), node.text]);
  node.children?.forEach((c) => findAll(c, out));
}

const PLAIN: [RegExp, string, (m: string) => string][] = [
  [/ledger\b.*(does not exist|not found)|(does not exist|not found).*ledger/i, "unknown_ledger", (m) => `A ledger in this voucher does not exist in Tally. Tally said: ${m}`],
  [/voucher type.*(does not exist|not found)/i, "unknown_voucher_type", (m) => `The voucher type does not exist in Tally. Tally said: ${m}`],
  [/out of range|date.*(range|period|before|after)|books begin/i, "date_out_of_range", (m) => `The voucher date is outside this company's books. Tally said: ${m}`],
  [/voucher number|vch.*number|voucher no/i, "voucher_number", (m) => `There is a problem with the voucher number. Tally said: ${m}`],
  [/educational/i, "educational_mode", () => "Tally is in educational mode, which restricts which dates can be posted."],
  [/already exists|duplicate/i, "already_exists", (m) => `This record already exists in Tally. Tally said: ${m}`],
  [/not.*balance|does not balance/i, "unbalanced_voucher", (m) => `Debits and credits do not match. Tally said: ${m}`],
];

export function explainTallyError(message: string): WriteIssue {
  for (const [re, code, plain] of PLAIN) if (re.test(message)) return { code, message: plain(message) };
  return { code: "tally_rejected", message: `Tally rejected this write: ${message}` };
}

/** A write succeeds only when exactly one object was created or altered and there were no errors. */
export function parseImportResult(xml: string): ImportResult {
  const values = new Map<string, string[]>();
  findAll(parseXmlTree(stripIllegalCharRefs(xml)), values);
  const num = (t: string) => Number(values.get(t)?.[0] ?? 0) || 0;
  const created = num("CREATED"), altered = num("ALTERED"), errors = num("ERRORS"), exceptions = num("EXCEPTIONS"), ignored = num("IGNORED");
  const lineErrors = values.get("LINEERROR") ?? [];
  const ok = created + altered === 1 && errors === 0 && exceptions === 0 && lineErrors.length === 0;
  const id = values.get("LASTVCHID")?.[0] ?? values.get("LASTMID")?.[0] ?? null;
  const issues = lineErrors.map((m) => explainTallyError(m.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")));
  if (!ok && issues.length === 0) issues.push({ code: "tally_rejected", message: `Tally did not apply the write (created ${created}, altered ${altered}, ignored ${ignored}, errors ${errors}, exceptions ${exceptions}).` });
  return { ok, created, altered, errors, exceptions, ignored, tallyId: ok && id && id !== "0" ? id : null, issues };
}
