/**
 * The safety checks. Run when a bundle or job is compiled in the cloud, and again on the connector
 * before anything reaches Tally, so a bug or compromise in one place cannot get past both.
 */
import { findChild, parseXmlTree, type XmlNode } from "./tree.ts";

export class UnsafeRequestError extends Error {
  override name = "UnsafeRequestError";
}

/** TDL that can run actions rather than describe data. Reports, parts, lines and fields are fine. */
const FORBIDDEN_TDL_TAGS = new Set(["FUNCTION", "ACTION", "KEY", "BUTTON", "ON", "IMPORTFILE", "EXPORTFILE", "OBJECT"]);
const FORBIDDEN_EXPR = /\$\$(ExecuteAction|Call|ExportData|ImportData|ImportFile|ExecCommand|Exec|FileWrite|WriteFile|HttpPost|HttpGet)\b/i;

function walk(node: XmlNode, visit: (n: XmlNode) => void): void {
  visit(node);
  node.children?.forEach((c) => walk(c, visit));
}

function parseEnvelope(xml: string): XmlNode {
  if (/<!|<\?/.test(xml)) throw new UnsafeRequestError("Request must not contain DOCTYPE, CDATA or processing instructions");
  let root: XmlNode;
  try {
    root = parseXmlTree(xml);
  } catch (e) {
    throw new UnsafeRequestError(`Request is not valid XML: ${(e as Error).message}`);
  }
  if (root.tag.toUpperCase() !== "ENVELOPE") throw new UnsafeRequestError("Request root must be ENVELOPE");
  return root;
}

function requestKind(root: XmlNode): string {
  const headers = root.children?.filter((c) => c.tag.toUpperCase() === "HEADER") ?? [];
  if (headers.length !== 1) throw new UnsafeRequestError("Request must have exactly one HEADER");
  const kinds = headers[0]!.children?.filter((c) => c.tag.toUpperCase() === "TALLYREQUEST") ?? [];
  if (kinds.length !== 1) throw new UnsafeRequestError("Request must have exactly one TALLYREQUEST");
  return (kinds[0]!.text ?? "").trim().toUpperCase();
}

/** Bundles, probes and preflights may only read. */
export function assertExportOnly(xml: string): void {
  const root = parseEnvelope(xml);
  const kind = requestKind(root);
  if (kind !== "EXPORT") throw new UnsafeRequestError(`Only Export requests are allowed here, got ${kind}`);
  walk(root, (n) => {
    const tag = n.tag.toUpperCase();
    if (tag === "IMPORTDATA" || tag === "REQUESTDATA" || tag === "TALLYMESSAGE") throw new UnsafeRequestError(`Export request contains ${tag}`);
    if (FORBIDDEN_TDL_TAGS.has(tag)) throw new UnsafeRequestError(`Request contains forbidden TDL element ${tag}`);
    if (n.text && FORBIDDEN_EXPR.test(n.text)) throw new UnsafeRequestError("Request calls a forbidden TDL function");
    if (n.attrs && Object.values(n.attrs).some((v) => FORBIDDEN_EXPR.test(v))) throw new UnsafeRequestError("Request calls a forbidden TDL function");
  });
}

const WRITE_OBJECTS = new Set(["VOUCHER", "LEDGER"]);
const WRITE_ACTIONS = new Set(["CREATE", "ALTER"]);

/** A write job is one import of one object, create or alter. Delete and cancel are out of scope in v1. */
export function assertWriteSafe(xml: string): void {
  const root = parseEnvelope(xml);
  const kind = requestKind(root);
  if (kind !== "IMPORT DATA" && kind !== "IMPORT") throw new UnsafeRequestError(`Write job must be an Import request, got ${kind}`);
  const importData = findChild(findChild(root, "BODY") ?? { tag: "" }, "IMPORTDATA");
  if (!importData) throw new UnsafeRequestError("Write job has no IMPORTDATA");
  const report = findChild(findChild(importData, "REQUESTDESC") ?? { tag: "" }, "REPORTNAME")?.text?.trim().toUpperCase();
  if (report !== "VOUCHERS" && report !== "ALL MASTERS") throw new UnsafeRequestError(`Write job targets unknown report ${report}`);
  const message = findChild(importData, "REQUESTDATA")?.children?.filter((c) => c.tag.toUpperCase() === "TALLYMESSAGE") ?? [];
  if (message.length !== 1) throw new UnsafeRequestError("Write job must have exactly one TALLYMESSAGE");
  const objects = message[0]!.children ?? [];
  if (objects.length !== 1) throw new UnsafeRequestError("Write job must carry exactly one object");
  const object = objects[0]!;
  if (!WRITE_OBJECTS.has(object.tag.toUpperCase())) throw new UnsafeRequestError(`Write job cannot write ${object.tag}`);
  const action = (object.attrs?.ACTION ?? "").toUpperCase();
  if (!WRITE_ACTIONS.has(action)) throw new UnsafeRequestError(`Write action must be Create or Alter, got ${object.attrs?.ACTION}`);
  walk(root, (n) => {
    const tag = n.tag.toUpperCase();
    if (tag === "TDL" || tag === "TDLMESSAGE" || FORBIDDEN_TDL_TAGS.has(tag)) throw new UnsafeRequestError(`Write job contains forbidden element ${tag}`);
  });
}
