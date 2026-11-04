/** Finds custom fields (UDFs) in a sample of Tally's native export. */
import { compileSmallReport } from "./compile.ts";
import { assertExportOnly } from "./guards.ts";
import { escapeXml } from "./escape.ts";
import { maskValue } from "./privacy.ts";
import { stripIllegalCharRefs } from "./parser.ts";
import { parseXmlTree, type XmlNode } from "./tree.ts";
import type { FieldType } from "./definition.ts";

export const DISCOVERY_OBJECTS = ["Ledger", "Group", "StockItem", "Voucher"] as const;
export const SAMPLE_RECORDS = 50;
const SAMPLE_VALUES = 5;

export interface DiscoveredUdf {
  tallyType: string;
  udfName: string;
  label: string | null;
  index: number | null;
  type: FieldType;
  path: string;
  /** Masked: discovery runs before the customer has approved this field. */
  samples: string[];
}

const TYPE_MAP: Record<string, FieldType> = { string: "text", amount: "amount", quantity: "quantity", rate: "rate", number: "number", logical: "logical", date: "date" };

/** First step: the MasterIDs of this object type, to choose a bounded sample without building everything. */
export function compileSampleKeys(tallyType: string, company: string, uid: string): string {
  const xml = compileSmallReport({ name: "HxSample", uid, company, collection: `<TYPE>${escapeXml(tallyType)}</TYPE>`, columns: [{ tag: "MASTERIDVALUE", expr: "$MASTERID" }] });
  assertExportOnly(xml);
  return xml;
}

/** Second step: the sample as native objects, because only the native export labels UDF tags. */
export function compileNativeSample(tallyType: string, company: string, gt: number, lte: number): string {
  const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>HxNative</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="HxNative"><TYPE>${escapeXml(tallyType)}</TYPE><NATIVEMETHOD>*</NATIVEMETHOD><FILTERS>HxRange</FILTERS></COLLECTION><SYSTEM TYPE="Formulae" NAME="HxRange">$MasterId &gt; ${gt} and $MasterId &lt;= ${lte}</SYSTEM></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>`;
  assertExportOnly(xml);
  return xml;
}

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function walk(node: XmlNode, path: string[], found: Map<string, DiscoveredUdf>, tallyType: string): void {
  for (const child of node.children ?? []) {
    const m = /^UDF:(.+?)(\.LIST)?$/i.exec(child.tag);
    if (m && m[2]) {
      const udfName = m[1]!.toUpperCase();
      const key = `${tallyType}:${udfName}`;
      const entry = found.get(key) ?? {
        tallyType, udfName,
        label: child.attrs?.DESC?.replace(/[`']/g, "").trim() ?? null,
        index: child.attrs?.INDEX ? Number(child.attrs.INDEX) : null,
        type: TYPE_MAP[(child.attrs?.TYPE ?? "").toLowerCase()] ?? "text",
        path: path.join("."),
        samples: [],
      };
      for (const v of child.children ?? []) {
        if (v.text && entry.samples.length < SAMPLE_VALUES) {
          const masked = String(maskValue(decode(v.text)));
          if (!entry.samples.includes(masked)) entry.samples.push(masked);
        }
      }
      found.set(key, entry);
      continue;
    }
    walk(child, [...path, child.tag], found, tallyType);
  }
}

/** Parses a native export. Sample values are masked before they can leave the customer's PC. */
export function parseDiscovery(xml: string, tallyType: string, found: Map<string, DiscoveredUdf> = new Map()): DiscoveredUdf[] {
  walk(parseXmlTree(stripIllegalCharRefs(xml)), [], found, tallyType);
  return [...found.values()];
}
