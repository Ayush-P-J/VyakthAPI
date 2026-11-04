/**
 * Field privacy, enforced on the customer's PC. The customer's approved policy is held locally and
 * can only tighten what the cloud asks for, so this holds even if the cloud is down or wrong.
 */
import type { FieldDef, LineDef, Privacy } from "./definition.ts";

const RANK: Record<Privacy, number> = { public: 0, masked: 1, excluded: 2 };
export const stricter = (a: Privacy, b: Privacy): Privacy => (RANK[a] >= RANK[b] ? a : b);

export function maskValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return value.length <= 4 ? "****" : "*".repeat(value.length - 4) + value.slice(-4);
}

export type Policy = Record<string, Privacy>;

function apply(body: Record<string, unknown>, fields: FieldDef[], lines: LineDef[], policy: Policy, prefix: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!(f.name in body)) continue;
    const cls = stricter(f.privacy, policy[`${prefix}${f.name}`] ?? "public");
    if (cls === "excluded") continue;
    out[f.name] = cls === "masked" ? maskValue(body[f.name]) : body[f.name];
  }
  for (const l of lines) {
    const kids = body[l.name];
    if (Array.isArray(kids)) out[l.name] = kids.map((k) => apply(k as Record<string, unknown>, l.fields, l.lines, policy, `${prefix}${l.name}.`));
  }
  return out;
}

/** Keeps only declared fields, so an undeclared value cannot leave the PC by accident. */
export function applyPolicy(body: Record<string, unknown>, def: { fields: FieldDef[]; lines: LineDef[] }, policy: Policy, dataset: string): Record<string, unknown> {
  return apply(body, def.fields, def.lines, policy, `${dataset}.`);
}

/** Default class to suggest on the consent screen for a field name that looks like KYC data. */
export function suggestPrivacy(name: string): Privacy {
  return /pan\b|pan_|panno|panNumber|aadha?a?r|incometax|passport|bankaccount|accountno|ifsc|dob|birth/i.test(name) ? "masked" : "public";
}
