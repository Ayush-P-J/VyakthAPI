/**
 * The definition model's lowest layer: a Tally request as an ordered XML tree.
 *
 * The connector's builders are hand-written strings, verified against live TallyPrime. Parsing
 * them into this tree keeps every verified detail (element order, attributes, odd casing) while
 * turning them into data. `{{placeholders}}` and `{{#flag}}` blocks are filled by renderRequest.
 */
import { XMLParser } from "fast-xml-parser";

export interface XmlNode {
  tag: string;
  attrs?: Record<string, string>;
  text?: string;
  children?: XmlNode[];
}

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  processEntities: false,
  htmlEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

type Raw = Record<string, unknown> & { ":@"?: Record<string, string> };

function toNode(raw: Raw): XmlNode | string | null {
  const key = Object.keys(raw).find((k) => k !== ":@");
  if (!key) return null;
  if (key === "#text") return String(raw[key]);
  const node: XmlNode = { tag: key };
  if (raw[":@"]) node.attrs = { ...raw[":@"] };
  const kids = (raw[key] as Raw[]).map(toNode).filter((k) => k !== null);
  const text = kids.filter((k): k is string => typeof k === "string").join(" ").replace(/\s+/g, " ").trim();
  const children = kids.filter((k): k is XmlNode => typeof k !== "string");
  if (text) node.text = text;
  if (children.length) node.children = children;
  return node;
}

/** Parses a request. Entities stay encoded, so printing returns exactly what was parsed. */
export function parseXmlTree(xml: string): XmlNode {
  const nodes = (parser.parse(xml) as Raw[]).map(toNode).filter((n): n is XmlNode => n !== null && typeof n !== "string");
  if (nodes.length !== 1) throw new Error(`Expected one root element, found ${nodes.length}`);
  return nodes[0]!;
}

export function printNode(node: XmlNode): string {
  const attrs = Object.entries(node.attrs ?? {}).map(([k, v]) => ` ${k}="${v}"`).join("");
  const inner = (node.text ?? "") + (node.children ?? []).map(printNode).join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

export function findChild(node: XmlNode, tag: string): XmlNode | undefined {
  return node.children?.find((c) => c.tag.toUpperCase() === tag.toUpperCase());
}

export function tdlMessage(root: XmlNode): XmlNode | undefined {
  const desc = findChild(findChild(root, "BODY") ?? { tag: "" }, "DESC");
  return findChild(findChild(desc ?? { tag: "" }, "TDL") ?? { tag: "" }, "TDLMESSAGE");
}

/**
 * Form used to compare two requests: whitespace collapsed, and TDL objects sorted, because Tally
 * resolves them by name rather than by position. Order inside each object is kept.
 */
export function canonicalRequest(xml: string): string {
  const root = parseXmlTree(xml);
  const msg = tdlMessage(root);
  if (msg?.children) {
    const key = (n: XmlNode) => `${n.tag.toUpperCase()}\u0000${n.attrs?.NAME ?? ""}`;
    msg.children = [...msg.children].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  }
  return printNode(root);
}
