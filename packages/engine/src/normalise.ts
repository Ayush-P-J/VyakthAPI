/** Turns Tally's row values into typed JSON. Money is never a float. */
import type { DatasetDef, FieldDef, FieldType, LineDef } from "./definition.ts";
import { IDENTITY_TAGS } from "./definition.ts";
import { unwrap, type RawRow } from "./parser.ts";

export interface Money { paise: number; side: "Dr" | "Cr" | null }
export interface Quantity { value: number; unit: string | null }

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

function validIso(y: string, m: string, d: string): string | null {
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() !== Number(m) - 1 || dt.getUTCDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
}

export function parseDate(raw: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return validIso(m[1]!, m[2]!, m[3]!);
  m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(v);
  if (m) {
    const mon = MONTHS[m[2]!.toLowerCase()];
    return mon ? validIso(m[3]!.length === 2 ? `20${m[3]}` : m[3]!, mon, m[1]!.padStart(2, "0")) : null;
  }
  const digits = v.replace(/\D/g, "");
  return digits.length === 8 ? validIso(digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)) : null;
}

/** Decimal text to integer paise, using string arithmetic and rounding half up. */
function decimalToPaise(text: string): number | null {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(text);
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(3, "0");
  let paise = BigInt(m[1]!) * 100n + BigInt(frac.slice(0, 2));
  if (frac[2]! >= "5") paise += 1n;
  return paise <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(paise) : null;
}

/**
 * Handles every amount form Tally emits: `-250000.00`, `1,00,000.50 Dr`, and foreign currency
 * `-$100.00 @ ₹ 83.00/$ = -₹ 8300.00`, where the part after `=` is the base-currency amount.
 * In Tally a negative amount is a debit.
 */
export function parseAmount(raw: string | null): Money | null {
  let v = raw?.trim();
  if (!v) return null;
  if (v.includes("=")) v = v.slice(v.lastIndexOf("=") + 1).trim();
  const suffix = /\b(Dr|Cr)\.?\s*$/i.exec(v)?.[1]?.toLowerCase();
  const negative = v.includes("-") || /^\(.*\)$/.test(v);
  const digits = v.replace(/\b(Dr|Cr)\.?\s*$/i, "").replace(/[^\d.]/g, "");
  if (!digits) return null;
  const paise = decimalToPaise(digits);
  if (paise === null) return null;
  const side = suffix === "dr" ? "Dr" : suffix === "cr" ? "Cr" : paise === 0 ? null : negative ? "Dr" : "Cr";
  return { paise, side };
}

export function parseQuantity(raw: string | null): Quantity | null {
  const v = raw?.trim().split("=")[0]!.trim();
  if (!v) return null;
  const m = /^(-?[\d,]*\.?\d+)\s*(.*)$/.exec(v);
  if (!m) return null;
  const value = Number(m[1]!.replace(/,/g, ""));
  return Number.isFinite(value) ? { value, unit: m[2]!.trim() || null } : null;
}

export function parseRate(raw: string | null): Quantity | null {
  const v = raw?.trim();
  if (!v) return null;
  const [num, unit] = v.split("/");
  const value = Number(num!.replace(/[^\d.-]/g, ""));
  return num && Number.isFinite(value) ? { value, unit: unit?.trim() || null } : null;
}

export function parseLogical(raw: string | null): boolean | null {
  const v = raw?.trim().toLowerCase();
  if (v === "yes" || v === "true" || v === "1") return true;
  if (v === "no" || v === "false" || v === "0") return false;
  return null;
}

export function normaliseValue(raw: string | null, type: FieldType): unknown {
  switch (type) {
    case "text": { const t = raw?.trim(); return t ? t : null; }
    case "number": { const t = raw?.replace(/[^\d.-]/g, ""); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; }
    case "amount": return parseAmount(raw);
    case "quantity": return parseQuantity(raw);
    case "rate": return parseRate(raw);
    case "date": return parseDate(raw);
    case "logical": return parseLogical(raw);
  }
}

const asArray = (v: unknown): RawRow[] => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]).map((x) =>
  typeof x === "object" && x !== null ? (x as RawRow) : { VALUE: x });

function fieldsOf(raw: RawRow, fields: FieldDef[], lines: LineDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (IDENTITY_TAGS.has(f.tag)) continue;
    const value = normaliseValue(unwrap(raw[f.tag]), f.type);
    out[f.name] = value;
  }
  // Tally states Dr/Cr in a sibling field when the amount itself is absolute.
  const sideField = fields.find((f) => /^ISDEEMED/.test(f.tag) && f.type === "text");
  const side = sideField ? unwrap(raw[sideField.tag])?.trim() : undefined;
  if (side === "Dr" || side === "Cr") {
    for (const f of fields) {
      const v = out[f.name] as Money | null;
      if (f.type === "amount" && v && v.paise !== 0) v.side = side;
    }
  }
  for (const line of lines) {
    out[line.name] = asArray(raw[line.tag]).map((r) => fieldsOf(r, line.fields, line.lines));
  }
  return out;
}

export interface NormalisedRecord { id: string; alterId: string; body: Record<string, unknown> }

export function normaliseRow(raw: RawRow, def: Pick<DatasetDef, "fields" | "lines">): NormalisedRecord | null {
  const id = unwrap(raw.MASTERID)?.trim();
  const alterId = unwrap(raw.ALTERID)?.trim();
  if (!id || !/^\d+$/.test(id) || id === "0" || !alterId || !/^\d+$/.test(alterId)) return null;
  return { id, alterId, body: fieldsOf(raw, def.fields, def.lines) };
}
