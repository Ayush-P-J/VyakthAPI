/** Compiles definitions into requests. Runs in the cloud only; the connector just renders. */
import type { DatasetDef, FieldDef, LineDef } from "./definition.ts";
import { assertExportOnly } from "./guards.ts";
import { escapeXml } from "./escape.ts";
import { printNode, type XmlNode } from "./tree.ts";

const ATTRS = `ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" ISPLACEHOLDER="No"`;

export interface ReportColumn { tag: string; expr: string }

/**
 * A small report, in the same shape as the connector's verified MasterId probes
 * (ledger-masterid.builder.js). Used for key lists, reference checks and voucher lookups.
 */
export function compileSmallReport(opts: {
  name: string;
  /** Children of the COLLECTION, already printed. */
  collection: string;
  columns: ReportColumn[];
  formulas?: { name: string; expr: string }[];
  company?: string;
  uid?: string;
}): string {
  const suffix = opts.uid ?? "{{uid}}";
  const r = `${opts.name}_${suffix}`;
  const company = opts.company === undefined ? "{{company}}" : escapeXml(opts.company);
  const fields = opts.columns.map((c, i) =>
    `<FIELD NAME="${r}_F${i}" ${ATTRS}><USE>NameField</USE><SET>${escapeTdl(c.expr)}</SET><XMLTAG>&quot;${c.tag}&quot;</XMLTAG></FIELD>`).join("");
  const formulas = (opts.formulas ?? []).map((f) => `<SYSTEM TYPE="Formulae" NAME="${f.name}">${escapeTdl(f.expr)}</SYSTEM>`).join("");
  return `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>${r}</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE>` +
    `<REPORT NAME="${r}" ${ATTRS}><FORMS>${r}</FORMS></REPORT>` +
    `<FORM NAME="${r}" ${ATTRS}><TOPPARTS>${r}</TOPPARTS><DELETE>XMLTag : &quot;ENVELOP&quot;</DELETE><ADD>XMLTag : &quot;data&quot;</ADD></FORM>` +
    `<PART NAME="${r}" ${ATTRS}><TOPLINES>${r}</TOPLINES><SCROLLED>Vertical</SCROLLED><REPEAT>${r} : ${r}_C</REPEAT></PART>` +
    `<LINE NAME="${r}" ${ATTRS}><LEFTFIELDS>${opts.columns.map((_, i) => `${r}_F${i}`).join(", ")}</LEFTFIELDS><XMLTAG>&quot;row&quot;</XMLTAG></LINE>` +
    fields + `<COLLECTION NAME="${r}_C" ${ATTRS}>${opts.collection}</COLLECTION>` + formulas +
    `</TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>`;
}

/** Keeps quotes readable to TDL while staying valid XML. `>` and `<` become entities, as in the builders. */
export function escapeTdl(expr: string): string {
  return expr.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Limits a dataset's request to one record, using the MasterID comparison verified against live Tally. */
export function withIdFilter(template: string, tdlCollection: string, masterId: string): string {
  if (!/^\d+$/.test(masterId)) throw new InvalidExpressionError("Record id must be numeric");
  const re = new RegExp(`(<COLLECTION NAME="${escapeRegExp(tdlCollection)}"[^>]*>)`);
  if (!re.test(template)) throw new Error(`Collection ${tdlCollection} not found`);
  return template.replace(re, (m) => `${m}<FILTERS>HxOneRecord</FILTERS>`)
    .replace("</TDLMESSAGE>", () => `<SYSTEM TYPE="Formulae" NAME="HxOneRecord">$MasterId = ${masterId}</SYSTEM></TDLMESSAGE>`);
}

/** Key-only variant of a dataset, for the deletion check and for planning MasterID ranges. */
export function compileKeysTemplate(collection: XmlNode | undefined, systems: XmlNode[]): string {
  const kept = (collection?.children ?? []).filter((c) => !["NATIVEMETHOD", "FETCH", "COMPUTE", "METHOD"].includes(c.tag.toUpperCase()));
  const formulas = systems.map(printNode).join("");
  const xml = compileSmallReport({
    name: "HxKeys",
    collection: kept.map(printNode).join(""),
    columns: [{ tag: "MASTERIDVALUE", expr: "$MASTERID" }, { tag: "ALTERIDVALUE", expr: "$ALTERID" }],
  });
  return xml.replace("</TDLMESSAGE>", () => `${formulas}</TDLMESSAGE>`);
}

/** Expressions a custom field may use. A plain `$Method` covers UDFs; anything else needs a known function. */
const ALLOWED_FUNCTIONS = new Set(["number", "string", "isempty", "yearofdate", "monthofdate", "dayofdate", "asabsolute", "aspositive", "isdr", "iscr", "stringlength", "upper", "lower"]);

export class InvalidExpressionError extends Error { override name = "InvalidExpressionError"; }

export function validateExpr(expr: string): void {
  const e = expr.trim();
  if (!e || e.length > 400) throw new InvalidExpressionError("Expression is empty or too long");
  if (/^\$[A-Za-z_]\w*(\[\w+\])?(\.[A-Za-z_]\w*)*$/.test(e)) return;
  // Comparisons may use < and >, but nothing that could read as markup.
  if (!/^[\s\w$:.()"+*/=<>,\[\]-]+$/.test(e) || /<\s*\/?\s*[A-Za-z!?]/.test(e)) throw new InvalidExpressionError("Expression contains unsupported characters");
  for (const m of e.matchAll(/\$\$(\w+)/g)) {
    if (!ALLOWED_FUNCTIONS.has(m[1]!.toLowerCase())) throw new InvalidExpressionError(`TDL function $$${m[1]} is not allowed in a custom field`);
  }
}

function withField(template: string, tdlLine: string, field: FieldDef): string {
  validateExpr(field.expr);
  const lineRe = new RegExp(`(<LINE NAME="${escapeRegExp(tdlLine)}"[^>]*>\\s*<LEFTFIELDS>)([^<]*)(</LEFTFIELDS>)`);
  if (!lineRe.test(template)) throw new Error(`Line ${tdlLine} not found in template`);
  const def = `<FIELD NAME="${field.tdlField}" ${ATTRS}><USE>NameField</USE><SET>${escapeTdl(field.expr)}</SET><XMLTAG>&quot;${field.tag}&quot;</XMLTAG></FIELD>`;
  return template
    .replace(lineRe, (_m, a: string, b: string, c: string) => `${a}${b}, ${field.tdlField}${c}`)
    .replace("</TDLMESSAGE>", () => `${def}</TDLMESSAGE>`);
}

function withoutField(template: string, tdlLine: string, tdlField: string): string {
  const lineRe = new RegExp(`(<LINE NAME="${escapeRegExp(tdlLine)}"[^>]*>\\s*<LEFTFIELDS>)([^<]*)(</LEFTFIELDS>)`);
  return template.replace(lineRe, (_m, a: string, b: string, c: string) =>
    `${a}${b.split(",").map((s) => s.trim()).filter((s) => s.toUpperCase() !== tdlField.toUpperCase()).join(", ")}${c}`);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findLine(lines: LineDef[], name: string): LineDef | undefined {
  for (const l of lines) {
    if (l.name === name) return l;
    const nested = findLine(l.lines, name);
    if (nested) return nested;
  }
  return undefined;
}

export interface CustomFieldInput {
  name: string;
  expr: string;
  type: FieldDef["type"];
  privacy?: FieldDef["privacy"];
  /** Child line to place the field on, by API name. Omit for the record itself. */
  line?: string;
  udfIndex?: number;
  udfType?: string;
  udfName?: string;
}

/** Adds a custom field. The field joins the report's line, and Tally returns it from the next sync. */
export function addCustomField(def: DatasetDef, input: CustomFieldInput): DatasetDef {
  const out: DatasetDef = structuredClone(def);
  const target = input.line ? findLine(out.lines, input.line) : out;
  if (!target) throw new Error(`Line ${input.line} not found on ${def.name}`);
  if (target.fields.some((f) => f.name === input.name)) throw new Error(`Field ${input.name} already exists on ${def.name}`);
  const tag = `HX_${input.name.toUpperCase()}`;
  const field: FieldDef = {
    name: input.name, tag, tdlField: `HXF_${def.name}_${input.line ?? "row"}_${input.name}`.slice(0, 80),
    expr: input.expr, type: input.type, privacy: input.privacy ?? "public", custom: true,
    ...(input.udfIndex !== undefined ? { udfIndex: input.udfIndex } : {}),
    ...(input.udfType ? { udfType: input.udfType } : {}),
    ...(input.udfName ? { udfName: input.udfName } : {}),
  };
  target.fields.push(field);
  out.template = withField(out.template, target.tdlLine, field);
  return out;
}

/**
 * Applies privacy classes. An excluded field is taken out of the request, so Tally never returns it
 * and it never reaches the connector's memory, let alone the cloud.
 */
export function applyPrivacyClasses(def: DatasetDef, classes: Record<string, FieldDef["privacy"]>): DatasetDef {
  const out: DatasetDef = structuredClone(def);
  const visit = (fields: FieldDef[], tdlLine: string, prefix: string): FieldDef[] =>
    fields.flatMap((f) => {
      const cls = classes[`${prefix}${f.name}`];
      if (cls) f.privacy = cls;
      if (f.privacy === "excluded") {
        out.template = withoutField(out.template, tdlLine, f.tdlField);
        return [];
      }
      return [f];
    });
  out.fields = visit(out.fields, out.tdlLine, "");
  const visitLines = (lines: LineDef[], prefix: string) => {
    for (const l of lines) {
      l.fields = visit(l.fields, l.tdlLine, `${prefix}${l.name}.`);
      visitLines(l.lines, `${prefix}${l.name}.`);
    }
  };
  visitLines(out.lines, "");
  return out;
}

export function checkCompiled(def: DatasetDef): void {
  const sample = { company: "X", uid: "1" };
  assertExportOnly(def.keysTemplate.replaceAll("{{company}}", sample.company).replaceAll("{{uid}}", sample.uid));
}
