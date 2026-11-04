/**
 * Turns a verified builder into a data template. The builder is called with sentinel values, once
 * per option, and the differences between its outputs become `{{#delta}}` / `{{#range}}` blocks.
 */
import { parseXmlTree, printNode, tdlMessage, findChild, type XmlNode } from "./tree.ts";

export const SENTINEL = { company: "__HX_COMPANY__", watermark: 987654321, from: 111111111, to: 222222222, gt: 333333333, lte: 444444444, uid: "__HXUID__" };

function placeholders(xml: string): string {
  return xml
    .replace(/_\d{13}_\d+/g, "_{{uid}}")
    .replaceAll(SENTINEL.company, "{{company}}")
    .replaceAll(String(SENTINEL.watermark), "{{watermark}}")
    .replaceAll(String(SENTINEL.from), "{{from}}")
    .replaceAll(String(SENTINEL.to), "{{to}}")
    .replaceAll(String(SENTINEL.gt), "{{gt}}")
    .replaceAll(String(SENTINEL.lte), "{{lte}}");
}

const objectKey = (n: XmlNode) => `${n.tag.toUpperCase()}:${n.attrs?.NAME ?? ""}`;

/** Per object: child strings for the base, plus blocks the flag adds or swaps. */
function mergeVariant(base: XmlNode, variant: XmlNode, flag: string, pieces: Map<string, string[]>, trailing: string[]): void {
  const baseObjects = new Map((tdlMessage(base)?.children ?? []).map((n) => [objectKey(n), n]));
  for (const v of tdlMessage(variant)?.children ?? []) {
    const key = objectKey(v);
    const b = baseObjects.get(key);
    if (!b) {
      trailing.push(`{{#${flag}}}${printNode(v)}{{/${flag}}}`);
      continue;
    }
    const baseKids = b.children ?? [];
    const varKids = v.children ?? [];
    const out = pieces.get(key)!;
    if (varKids.length >= baseKids.length) {
      baseKids.forEach((kid, i) => {
        const a = printNode(kid);
        const c = printNode(varKids[i]!);
        if (a !== c) out[i] = `{{^${flag}}}${out[i]}{{/${flag}}}{{#${flag}}}${c}{{/${flag}}}`;
      });
      for (const extra of varKids.slice(baseKids.length)) out.push(`{{#${flag}}}${printNode(extra)}{{/${flag}}}`);
    } else {
      throw new Error(`Variant ${flag} removes children from ${key}; cannot express as a block`);
    }
  }
}

export interface BuilderOutputs { base: string; delta?: string; range?: string }

/** Combines a builder's outputs into one template. Returns the printed template string. */
export function templateFromOutputs(outputs: BuilderOutputs): string {
  const base = parseXmlTree(placeholders(outputs.base));
  const msg = tdlMessage(base);
  if (!msg) return printNode(base);
  const pieces = new Map((msg.children ?? []).map((n) => [objectKey(n), (n.children ?? []).map(printNode)]));
  const trailing: string[] = [];
  for (const flag of ["delta", "range"] as const) {
    const xml = outputs[flag];
    if (xml) mergeVariant(base, parseXmlTree(placeholders(xml)), flag, pieces, trailing);
  }
  const objectStrings = (msg.children ?? []).map((n) => {
    const attrs = Object.entries(n.attrs ?? {}).map(([k, v]) => ` ${k}="${v}"`).join("");
    return `<${n.tag}${attrs}>${n.text ?? ""}${pieces.get(objectKey(n))!.join("")}</${n.tag}>`;
  });
  const marker = "__HX_TDLMESSAGE__";
  msg.text = marker;
  msg.children = [];
  // A replacer function: in a replacement string, `$$` would collapse to `$` and corrupt every $$Function.
  const body = objectStrings.join("") + trailing.join("");
  return printNode(base).replace(marker, () => body);
}

export { findChild };
