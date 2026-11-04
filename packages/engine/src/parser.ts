/**
 * Streaming parser, ported from the connector's stream-parser.js. It keeps these field-tested
 * behaviours: `&#4;` markers are stripped, inner whitespace in names is preserved ("EAGLE  TRADERS"
 * must still match its ledger master), and rows are yielded one at a time so a 24 MB response
 * never builds up in memory.
 */
import { StringDecoder } from "node:string_decoder";
import sax from "sax";

export class TallyResponseError extends Error {
  override name = "TallyResponseError";
}

function isLegalXmlCodePoint(cp: number): boolean {
  return cp === 0x9 || cp === 0xa || cp === 0xd || (cp >= 0x20 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff);
}

export function stripIllegalCharRefs(text: string): string {
  return text.replace(/&#([xX][0-9A-Fa-f]+|[0-9]+);/g, (match, body: string) => {
    const cp = body[0] === "x" || body[0] === "X" ? parseInt(body.slice(1), 16) : parseInt(body, 10);
    return isLegalXmlCodePoint(cp) ? match : "";
  });
}

export type RawRow = Record<string, unknown>;

/**
 * Yields each element named in `rowTags`. Throws on a Tally error or on a response that is not
 * recognisably Tally's, so a failed request can never look like an empty result. An empty result
 * that is believed is how a sync ends up "deleting" a company's data.
 */
export async function* parseRows(input: AsyncIterable<Buffer | string> | string, rowTags: Set<string>): AsyncGenerator<RawRow> {
  const parser = sax.parser(true, { trim: true });
  const queue: RawRow[] = [];
  const stack: { tag: string; obj: Record<string, unknown>; text: string }[] = [];
  let root: string | null = null;
  let parserError: Error | null = null;
  let rootText = "";

  parser.onopentag = (node) => {
    const tag = node.name.toUpperCase();
    if (root === null) root = tag;
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node.attributes)) obj[k.toUpperCase()] = v;
    stack.push({ tag, obj, text: "" });
  };
  parser.ontext = (text) => {
    if (stack.length > 0 && text.trim() !== "") stack[stack.length - 1]!.text += text;
  };
  parser.onclosetag = () => {
    const top = stack.pop();
    if (!top) return;
    if (top.tag === "LINEERROR" || top.tag === "ERROR") {
      parserError = new TallyResponseError(`Tally error: ${top.text}`);
      return;
    }
    if (top.tag === "STATUS" && top.text.trim() === "0") {
      parserError = new TallyResponseError("Tally reported failure (STATUS 0)");
      return;
    }
    if (stack.length === 0) rootText = top.text;
    const hasKids = Object.keys(top.obj).length > 0;
    let value: unknown;
    if (hasKids) {
      if (top.text.trim()) top.obj.VALUE = top.text.trim();
      value = top.obj;
    } else {
      value = top.text.trim();
    }
    if (rowTags.has(top.tag)) {
      queue.push((typeof value === "string" ? { VALUE: value } : value) as RawRow);
      return;
    }
    if (stack.length > 0) {
      const parent = stack[stack.length - 1]!.obj;
      if (top.tag in parent) {
        const existing = parent[top.tag];
        const arr = Array.isArray(existing) ? existing : [existing];
        arr.push(value);
        parent[top.tag] = arr;
      } else {
        parent[top.tag] = value;
      }
    }
  };
  parser.onerror = (e) => {
    parserError = new TallyResponseError(`Invalid XML from Tally: ${e.message}`);
    parser.error = null as never;
  };

  const check = () => {
    if (parserError) throw parserError;
  };
  let pending = "";
  const decoder = new StringDecoder("utf8");
  const chunks: AsyncIterable<Buffer | string> | Iterable<string> = typeof input === "string" ? [input] : input;
  for await (const chunk of chunks) {
    const combined = pending + (typeof chunk === "string" ? chunk : decoder.write(chunk));
    const lastAmp = combined.lastIndexOf("&");
    let toWrite: string;
    if (lastAmp !== -1 && combined.length - lastAmp < 12 && !combined.slice(lastAmp).includes(";")) {
      toWrite = combined.slice(0, lastAmp);
      pending = combined.slice(lastAmp);
    } else {
      toWrite = combined;
      pending = "";
    }
    parser.write(stripIllegalCharRefs(toWrite));
    check();
    while (queue.length > 0) yield queue.shift()!;
  }
  pending += decoder.end();
  if (pending) parser.write(stripIllegalCharRefs(pending));
  parser.close();
  check();
  while (queue.length > 0) yield queue.shift()!;
  if (root === null) throw new TallyResponseError("Tally returned an empty response");
  if (root === "RESPONSE") throw new TallyResponseError(`Tally rejected the request: ${rootText}`);
  if (root !== "DATA" && root !== "ENVELOPE") throw new TallyResponseError(`Unexpected response root ${root}`);
}

export async function collectRows(input: AsyncIterable<Buffer | string> | string, rowTags: Set<string>): Promise<RawRow[]> {
  const rows: RawRow[] = [];
  for await (const r of parseRows(input, rowTags)) rows.push(r);
  return rows;
}

/** Tally wraps some values as `{ TYPE: "String", VALUE: "x" }`. */
export function unwrap(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return unwrap(value[0]);
  if (typeof value === "object" && "VALUE" in (value as object)) return unwrap((value as { VALUE: unknown }).VALUE);
  if (typeof value === "object") return null;
  return String(value);
}
