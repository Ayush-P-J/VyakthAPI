/** Reads a dataset's fields and child lines out of a report request. */
import { findChild, parseXmlTree, tdlMessage, type XmlNode } from "./tree.ts";
import type { FieldDef, FieldType, LineDef } from "./definition.ts";

const unquote = (s: string | undefined) => (s ?? "").replace(/&quot;/g, "").replace(/"/g, "").trim();
const splitList = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const WORDS = `alter altered id master name alias parent group primary nature affects gross profit is bill wise on credit period limit
country state pin code pincode contact ledger mobile phone email website income tax number gst gstin registration reg type hsn rate opening balance
deemed positive date due amount voucher vch main cancelled optional reference ref narration guid post dated invoice cost centre center category
stock item items base units unit additional conversion denominator reorder level minimum maximum value godown batch quantity qty actual billed
inventory entries entry allocations allocation bank instrument inst transaction trans address list applicable from description cess valuation
duty head per orig company serial tally party buyer consignee place supply e way ewaybill irn ack no order delivery note receipt tracking
destination dispatch doc through terms mode payment basic discount closing costing method symbol decimal places formal simple component multi
source destination consumed produced in out is accounting details alt expiry calculation buyers sales cess amt cgst igst sgst taxable trade of rater instant non goods reverse charge only pos reporting uom vat`.split(/\s+/);
const WORD_SET = new Set(WORDS);

/** Splits an all-caps Tally tag into words so API names read naturally: OPENINGBALANCE -> openingBalance. */
export function apiName(tag: string): string {
  const lower = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
  const best: (string[] | null)[] = Array(lower.length + 1).fill(null);
  best[0] = [];
  for (let i = 1; i <= lower.length; i++) {
    for (let j = 0; j < i; j++) {
      const word = lower.slice(j, i);
      const prev = best[j];
      if (prev && (WORD_SET.has(word) || /^\d+$/.test(word))) {
        if (!best[i] || prev.length + 1 < best[i]!.length) best[i] = [...prev, word];
      }
    }
  }
  const words = best[lower.length];
  if (!words) return lower;
  return words.map((w, i) => (i === 0 ? w : w[0]!.toUpperCase() + w.slice(1))).join("");
}

export function inferType(tag: string, expr: string): FieldType {
  const t = tag.toUpperCase();
  if (/^\$\$IsDr/i.test(expr) || /^if /i.test(expr)) return "text"; // "Dr" / "Cr", whatever the tag says
  if (/^IS[A-Z]/.test(t)) return "logical";
  if (/DATE$|APPLICABLEFROM$|^BOOKSFROM$|^STARTINGFROM$/.test(t)) return "date";
  if (/(^|[A-Z])(MASTERID|ALTERID|NAMEID)$|ID$/.test(t)) return "text";
  if (/RATE$/.test(t) && !/GSTRATE|CESSRATE/.test(t)) return "rate";
  if (/QTY$|QUANTITY$/.test(t)) return "quantity";
  if (/AMOUNT$|AMT$|BALANCE$|VALUE$|CREDITLIMIT$/.test(t) && !/ALT/.test(t)) return "amount";
  return "text";
}

interface Objects { byName: Map<string, XmlNode>; }

function objects(root: XmlNode): Objects {
  const byName = new Map<string, XmlNode>();
  for (const n of tdlMessage(root)?.children ?? []) byName.set(`${n.tag.toUpperCase()}:${(n.attrs?.NAME ?? "").toUpperCase()}`, n);
  return { byName };
}

const get = (o: Objects, kind: string, name: string) => o.byName.get(`${kind}:${name.trim().toUpperCase()}`);
const childTexts = (n: XmlNode, tag: string) => (n.children ?? []).filter((c) => c.tag.toUpperCase() === tag).map((c) => c.text ?? "");

function fieldOf(o: Objects, name: string, seen: Set<string>): FieldDef | null {
  const f = get(o, "FIELD", name);
  if (!f) return null;
  const expr = childTexts(f, "SET")[0] ?? childTexts(f, "INFO")[0] ?? "";
  const tag = unquote(childTexts(f, "XMLTAG")[0]).toUpperCase();
  if (!tag) return null;
  let api = apiName(tag);
  while (seen.has(api)) api += "_";
  seen.add(api);
  return { name: api, tag, tdlField: f.attrs?.NAME ?? name, expr: expr.replace(/&quot;/g, '"'), type: inferType(tag, expr), privacy: "public", custom: false };
}

function lineOf(o: Objects, name: string, seenLines: Set<string>): LineDef | null {
  const line = get(o, "LINE", name);
  if (!line || seenLines.has(name.toUpperCase())) return null;
  seenLines.add(name.toUpperCase());
  const tag = unquote(childTexts(line, "XMLTAG")[0]).toUpperCase();
  const seen = new Set<string>();
  const fields = [...childTexts(line, "LEFTFIELDS"), ...childTexts(line, "RIGHTFIELDS")].flatMap(splitList)
    .map((f) => fieldOf(o, f, seen)).filter((f): f is FieldDef => f !== null);
  const lines: LineDef[] = [];
  for (const explode of childTexts(line, "EXPLODE")) {
    const partName = explode.split(":")[0]!.trim();
    const part = get(o, "PART", partName);
    if (!part) continue;
    for (const lineName of childTexts(part, "TOPLINES").flatMap(splitList)) {
      const child = lineOf(o, lineName, seenLines);
      if (child) lines.push(child);
    }
  }
  return { name: apiName(tag), tag, tdlLine: line.attrs?.NAME ?? name, fields, lines };
}

/** Finds the report's row line, by following REPORT -> FORM -> PART -> LINE. */
export function deriveShape(requestXml: string): { root: LineDef; collection: XmlNode | undefined; objects: Objects } {
  const root = parseXmlTree(requestXml);
  const o = objects(root);
  const id = findChild(findChild(root, "HEADER")!, "ID")?.text ?? "";
  const report = get(o, "REPORT", id);
  if (!report) throw new Error(`No REPORT named ${id}`);
  const form = get(o, "FORM", splitList(childTexts(report, "FORMS")[0])[0] ?? "");
  const part = get(o, "PART", splitList(childTexts(form!, "TOPPARTS")[0])[0] ?? "");
  const repeat = childTexts(part!, "REPEAT")[0] ?? "";
  const [lineName, collName] = repeat.split(":").map((s) => s.trim());
  const line = lineOf(o, lineName!, new Set());
  if (!line) throw new Error(`No LINE named ${lineName}`);
  return { root: line, collection: get(o, "COLLECTION", collName ?? ""), objects: o };
}
