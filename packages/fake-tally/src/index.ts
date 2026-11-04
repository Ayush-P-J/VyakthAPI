/**
 * A simulated TallyPrime for tests and the demo. It reads the real requests the engine sends (the
 * connector's report shape) and answers from memory, with switches for the failures that matter.
 *
 * THIS IS NOT EVIDENCE OF HOW TALLY BEHAVES. It encodes our understanding of Tally. Anything a test
 * shows here about REMOTEID, UDFs or error text must still be confirmed on a real TallyPrime.
 */
import { createServer, type Server } from "node:http";
import { parseXmlTree, findChild, type XmlNode } from "@hexspare/tally-engine";

export type Obj = Record<string, any>;
export interface Company {
  name: string; guid: string; booksFrom: string; serial: string;
  /** Lists by lower-case Tally type. */
  masters: Record<string, Obj[]>;
  vouchers: Obj[];
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unent = (s: string) => s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const unquote = (s: string | undefined) => unent(s ?? "").replace(/"/g, "").trim();
const kids = (n: XmlNode, tag: string) => (n.children ?? []).filter((c) => c.tag.toUpperCase() === tag);
const texts = (n: XmlNode, tag: string) => kids(n, tag).map((c) => c.text ?? "");
const list = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const VCH_CLASS: Record<string, string> = { "$$VCHTYPERECEIPT": "Receipt", "$$VCHTYPEPAYMENT": "Payment", "$$VCHTYPECONTRA": "Contra", "$$VCHTYPEJOURNAL": "Journal", "$$VCHTYPESALES": "Sales", "$$VCHTYPEPURCHASE": "Purchase" };

export interface FakeOptions {
  /** How Tally treats a Create whose REMOTEID already exists. Real behaviour is an open question. */
  remoteIdBehavior: "alter" | "duplicate";
  /** Whether $GUID lookups can see a REMOTEID. Real behaviour is an open question. */
  guidMatchesRemoteId: boolean;
  /** Commit the next import, then drop the connection without answering. */
  crashAfterCommit: number;
  latencyMs: number;
  /** Next report request answers with this body, to simulate a glitch. */
  nextResponseOverride: string | null;
}

export class FakeTally {
  private server: Server | null = null;
  private counter = 1000;
  companies: Company[] = [];
  options: FakeOptions = { remoteIdBehavior: "alter", guidMatchesRemoteId: true, crashAfterCommit: 0, latencyMs: 0, nextResponseOverride: null };
  requests: string[] = [];
  inFlight = 0;
  maxInFlight = 0;
  port = 0;

  next(): number { return ++this.counter; }

  addCompany(name: string, guid = `guid-${name}`, booksFrom = "20250401"): Company {
    const c: Company = { name, guid, booksFrom, serial: "790012345", masters: {}, vouchers: [] };
    this.companies.push(c);
    return c;
  }

  addMaster(c: Company, type: string, fields: Obj): Obj {
    const id = this.next();
    const o: Obj = { masterid: id, alterid: id, ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.toLowerCase(), v])) };
    (c.masters[type.toLowerCase()] ??= []).push(o);
    return o;
  }

  addVoucher(c: Company, cls: string, fields: Obj): Obj {
    const id = this.next();
    const o: Obj = { masterid: id, alterid: id, _class: cls, guid: `tally-${id}`, iscancelled: "No", isoptional: "No", ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.toLowerCase(), v])) };
    c.vouchers.push(o);
    return o;
  }

  touch(o: Obj, changes: Obj = {}): void {
    Object.assign(o, Object.fromEntries(Object.entries(changes).map(([k, v]) => [k.toLowerCase(), v])));
    o.alterid = this.next();
  }

  async start(port = 0, host = "127.0.0.1"): Promise<number> {
    const wanted = port || this.port;
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        this.inFlight++;
        this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
        if (this.options.latencyMs) await new Promise((r) => setTimeout(r, this.options.latencyMs));
        try {
          const xml = Buffer.concat(chunks).toString("utf8");
          this.requests.push(xml);
          const out = this.handle(xml);
          if (out === null) { res.destroy(); return; }
          res.writeHead(200, { "content-type": "text/xml; charset=utf-8" });
          res.end(out);
        } catch (e) {
          res.writeHead(200, { "content-type": "text/xml" });
          res.end(`<RESPONSE>${esc((e as Error).message)}</RESPONSE>`);
        } finally {
          this.inFlight--;
        }
      });
    });
    await new Promise<void>((r) => this.server!.listen(wanted, host, r));
    this.port = (this.server.address() as { port: number }).port;
    return this.port;
  }

  /** The user closed Tally: connections are refused. */
  async stop(): Promise<void> {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise((r) => this.server!.close(r));
    this.server = null;
  }

  private company(root: XmlNode): Company | null {
    const desc = findChild(findChild(root, "BODY") ?? { tag: "" }, "DESC");
    const name = findChild(findChild(desc ?? { tag: "" }, "STATICVARIABLES") ?? { tag: "" }, "SVCURRENTCOMPANY")?.text;
    if (!name) return this.companies[0] ?? null;
    return this.companies.find((c) => c.name === unent(name)) ?? null;
  }

  private handle(xml: string): string | null {
    const root = parseXmlTree(xml);
    const header = findChild(root, "HEADER")!;
    const kind = (findChild(header, "TALLYREQUEST")?.text ?? "").toUpperCase();
    if (kind === "IMPORT DATA" || kind === "IMPORT") return this.handleImport(root);
    if (kind !== "EXPORT") return `<RESPONSE>Unknown Request, cannot be processed</RESPONSE>`;
    if (this.options.nextResponseOverride !== null) {
      const o = this.options.nextResponseOverride;
      this.options.nextResponseOverride = null;
      return o;
    }
    const type = (findChild(header, "TYPE")?.text ?? "").toUpperCase();
    const id = findChild(header, "ID")?.text ?? "";
    const tdl = this.tdlObjects(root);
    if (type === "COLLECTION") return this.exportCollection(root, id, tdl);
    const company = this.company(root);
    if (!company) return `<ENVELOPE><HEADER><VERSION>1</VERSION><STATUS>0</STATUS></HEADER><BODY><DATA><LINEERROR>Could not set &apos;SVCurrentCompany&apos;</LINEERROR></DATA></BODY></ENVELOPE>`;
    return this.exportReport(id, tdl, company);
  }

  private tdlObjects(root: XmlNode): Map<string, XmlNode> {
    const desc = findChild(findChild(root, "BODY") ?? { tag: "" }, "DESC");
    const msg = findChild(findChild(desc ?? { tag: "" }, "TDL") ?? { tag: "" }, "TDLMESSAGE");
    const m = new Map<string, XmlNode>();
    for (const n of msg?.children ?? []) m.set(`${n.tag.toUpperCase()}:${(n.attrs?.NAME ?? "").toUpperCase()}`, n);
    return m;
  }

  private passes(formula: string, o: Obj): boolean {
    const text = unent(formula).replace(/\(\(\(\$\$YearOfDate:\$Date\)\*10000\)\+\(\(\$\$MonthOfDate:\$Date\)\*100\)\+\(\$\$DayOfDate:\$Date\)\)/g, "$__DATENUM");
    const atom = (a: string): boolean => {
      const m = /^\s*\$([\w_]+)\s*(>=|<=|>|<|=)\s*(".*?"|\d+)\s*$/.exec(a);
      if (!m) return true;
      const method = m[1]!.toLowerCase();
      const raw = method === "__datenum" ? Number(o.date) : o[method];
      if (m[3]!.startsWith('"')) {
        const want = m[3]!.slice(1, -1);
        if (method === "guid" && !this.options.guidMatchesRemoteId && o._remoteid === want) return false;
        return String(raw ?? "").toLowerCase() === want.toLowerCase();
      }
      const l = Number(raw ?? 0), r = Number(m[3]);
      return m[2] === ">" ? l > r : m[2] === "<" ? l < r : m[2] === ">=" ? l >= r : m[2] === "<=" ? l <= r : l === r;
    };
    return text.split(/\s+or\s+/i).some((orPart) => orPart.split(/\s+and\s+/i).every(atom));
  }

  private rows(tdl: Map<string, XmlNode>, company: Company, collName: string): Obj[] {
    const coll = tdl.get(`COLLECTION:${collName.toUpperCase()}`);
    if (!coll) return [];
    const type = (texts(coll, "TYPE")[0] ?? "").trim();
    let rows: Obj[];
    if (/^Vouchers?\b/i.test(type)) {
      const childOf = (texts(coll, "CHILDOF")[0] ?? "").trim().toUpperCase();
      const cls = VCH_CLASS[childOf];
      rows = childOf ? company.vouchers.filter((v) => v._class === cls) : company.vouchers;
    } else {
      rows = company.masters[type.toLowerCase()] ?? [];
    }
    for (const name of texts(coll, "FILTERS").flatMap(list)) {
      const f = tdl.get(`SYSTEM:${name.toUpperCase()}`);
      if (f?.text) rows = rows.filter((o) => this.passes(f.text!, o));
      else if (name.toUpperCase() === "NOTISOPTIONALVOUCHER") rows = rows.filter((o) => o.isoptional !== "Yes");
    }
    return rows;
  }

  private evalExpr(expr: string, o: Obj, company: Company): string {
    const e = unent(expr).trim();
    if (e === "##SvCurrentCompany") return company.name;
    if (e === "$$LicenseInfo:SerialNumber") return company.serial;
    if (/^"[^"]*"$/.test(e)) return e.slice(1, -1);
    let m = /^if \$\$IsDr:\$(\w+) Then "Dr" Else "Cr"$/i.exec(e);
    if (m) return String(o[m[1]!.toLowerCase()] ?? "").startsWith("-") ? "Dr" : "Cr";
    m = /^\$(\w+)\[Last\]\.(\w+)$/.exec(e);
    if (m) { const arr = o[m[1]!.toLowerCase()]; return String(Array.isArray(arr) ? arr.at(-1)?.[m[2]!.toLowerCase()] ?? "" : ""); }
    m = /^\$(\w+)$/.exec(e);
    if (m) return String(o[m[1]!.toLowerCase()] ?? "");
    return "";
  }

  private line(tdl: Map<string, XmlNode>, name: string, o: Obj, company: Company): string {
    const line = tdl.get(`LINE:${name.toUpperCase()}`);
    if (!line) return "";
    const tag = unquote(texts(line, "XMLTAG")[0]) || "row";
    let inner = "";
    for (const fname of texts(line, "LEFTFIELDS").flatMap(list)) {
      const f = tdl.get(`FIELD:${fname.toUpperCase()}`);
      if (!f) continue;
      const t = unquote(texts(f, "XMLTAG")[0]);
      if (!t) continue;
      inner += `<${t}>${esc(this.evalExpr(texts(f, "SET")[0] ?? texts(f, "INFO")[0] ?? "", o, company))}</${t}>`;
    }
    for (const ex of texts(line, "EXPLODE")) {
      const part = tdl.get(`PART:${ex.split(":")[0]!.trim().toUpperCase()}`);
      if (!part) continue;
      const repeat = texts(part, "REPEAT")[0] ?? "";
      const [childLine, method] = repeat.split(":").map((s) => s.trim());
      const arr = o[(method ?? "").toLowerCase()];
      if (Array.isArray(arr)) for (const child of arr) inner += this.line(tdl, childLine!, child, company);
    }
    return `<${tag}>${inner}</${tag}>`;
  }

  private exportReport(id: string, tdl: Map<string, XmlNode>, company: Company): string {
    const report = tdl.get(`REPORT:${id.toUpperCase()}`);
    if (!report) return `<RESPONSE>Could not find Report '${esc(id)}'</RESPONSE>`;
    const form = tdl.get(`FORM:${list(texts(report, "FORMS")[0])[0]!.toUpperCase()}`)!;
    const part = tdl.get(`PART:${list(texts(form, "TOPPARTS")[0])[0]!.toUpperCase()}`)!;
    const [lineName, coll] = (texts(part, "REPEAT")[0] ?? "").split(":").map((s) => s.trim());
    const rows = this.rows(tdl, company, coll ?? "");
    return `<DATA>${rows.map((o) => this.line(tdl, lineName!, o, company)).join("")}</DATA>`;
  }

  private exportCollection(root: XmlNode, id: string, tdl: Map<string, XmlNode>): string {
    const coll = tdl.get(`COLLECTION:${id.toUpperCase()}`);
    const type = (texts(coll ?? { tag: "" }, "TYPE")[0] ?? "").trim();
    if (type === "Company") {
      const body = this.companies.map((c) => `<COMPANY NAME="${esc(c.name)}"><NAME>${esc(c.name)}</NAME><GUID>${esc(c.guid)}</GUID><BOOKSFROM>${c.booksFrom}</BOOKSFROM><STARTINGFROM>${c.booksFrom}</STARTINGFROM><TALLYSERIAL>${c.serial}</TALLYSERIAL></COMPANY>`).join("");
      return `<ENVELOPE><HEADER><VERSION>1</VERSION><STATUS>1</STATUS></HEADER><BODY><DESC></DESC><DATA><COLLECTION>${body}</COLLECTION></DATA></BODY></ENVELOPE>`;
    }
    const company = this.company(root);
    if (!company) return `<ENVELOPE><BODY><DATA><LINEERROR>No such company</LINEERROR></DATA></BODY></ENVELOPE>`;
    const rows = this.rows(tdl, company, id);
    const tag = type.toUpperCase();
    const body = rows.map((o) => {
      const udfs = Object.entries((o._udfs ?? {}) as Record<string, { type: string; index: number }>).map(([name, meta]) =>
        `<UDF:${name}.LIST DESC="\`${name}\`" ISLIST="YES" TYPE="${meta.type}" INDEX="${meta.index}"><UDF:${name} DESC="\`${name}\`">${esc(o[name.toLowerCase()])}</UDF:${name}></UDF:${name}.LIST>`).join("");
      return `<${tag} NAME="${esc(o.name ?? "")}"><MASTERID> ${o.masterid}</MASTERID>${udfs}</${tag}>`;
    }).join("");
    return `<ENVELOPE><HEADER><VERSION>1</VERSION><STATUS>1</STATUS></HEADER><BODY><DESC></DESC><DATA><COLLECTION>${body}</COLLECTION></DATA></BODY></ENVELOPE>`;
  }

  private result(r: { created?: number; altered?: number; errors?: number; ignored?: number; lastVch?: number; lastMid?: number; lineError?: string }): string {
    return `<RESPONSE><CREATED>${r.created ?? 0}</CREATED><ALTERED>${r.altered ?? 0}</ALTERED><DELETED>0</DELETED><LASTVCHID>${r.lastVch ?? 0}</LASTVCHID><LASTMID>${r.lastMid ?? 0}</LASTMID><COMBINED>0</COMBINED><IGNORED>${r.ignored ?? 0}</IGNORED><ERRORS>${r.errors ?? 0}</ERRORS><CANCELLED>0</CANCELLED>${r.lineError ? `<LINEERROR>${esc(r.lineError)}</LINEERROR>` : ""}</RESPONSE>`;
  }

  private handleImport(root: XmlNode): string | null {
    const data = findChild(findChild(root, "BODY")!, "IMPORTDATA")!;
    const desc = findChild(data, "REQUESTDESC")!;
    const companyName = findChild(findChild(desc, "STATICVARIABLES")!, "SVCURRENTCOMPANY")?.text ?? "";
    const company = this.companies.find((c) => c.name === unent(companyName));
    if (!company) return this.result({ errors: 1, lineError: "Company not open" });
    const object = findChild(findChild(data, "REQUESTDATA")!, "TALLYMESSAGE")!.children![0]!;
    const out = object.tag === "VOUCHER" ? this.importVoucher(company, object) : this.importLedger(company, object);
    if (this.options.crashAfterCommit > 0) {
      this.options.crashAfterCommit--;
      return null;
    }
    return out;
  }

  private importVoucher(company: Company, v: XmlNode): string {
    const action = v.attrs?.ACTION;
    const typeName = unent(v.attrs?.VCHTYPE ?? "");
    const vt = (company.masters.vouchertype ?? []).find((t) => t.name.toLowerCase() === typeName.toLowerCase());
    if (!vt) return this.result({ errors: 1, lineError: `Voucher type '${typeName}' does not exist!` });
    const date = texts(v, "DATE")[0] ?? "";
    if (Number(date) < Number(company.booksFrom)) return this.result({ errors: 1, lineError: `Voucher date is out of range: before books begin` });
    const entries: Obj[] = [];
    let net = 0;
    for (const e of kids(v, "ALLLEDGERENTRIES.LIST")) {
      const name = unent(texts(e, "LEDGERNAME")[0] ?? "");
      if (!(company.masters.ledger ?? []).some((l) => l.name.toLowerCase() === name.toLowerCase())) return this.result({ errors: 1, lineError: `Ledger '${name}' does not exist!` });
      const amount = texts(e, "AMOUNT")[0] ?? "0";
      net += Math.round(Number(amount) * 100);
      entries.push({ ledgername: name, amount, billallocations: kids(e, "BILLALLOCATIONS.LIST").map((b) => ({ name: unent(texts(b, "NAME")[0] ?? ""), amount: texts(b, "AMOUNT")[0], billtype: texts(b, "BILLTYPE")[0] })) });
    }
    if (net !== 0) return this.result({ errors: 1, lineError: "Voucher totals do not match! Does not balance" });
    const fields: Obj = {
      date, vouchertypename: typeName, vouchernumber: unent(texts(v, "VOUCHERNUMBER")[0] ?? ""),
      narration: unent(texts(v, "NARRATION")[0] ?? ""), reference: unent(texts(v, "REFERENCE")[0] ?? ""), ledgerentries: entries,
    };
    for (const c of v.children ?? []) {
      const m = /^UDF:(.+)\.LIST$/.exec(c.tag);
      if (m) fields[m[1]!.toLowerCase()] = unent(c.children?.[0]?.text ?? "");
    }
    if (action === "Alter") {
      const existing = company.vouchers.find((x) => String(x.masterid) === v.attrs?.TAGVALUE);
      if (!existing) return this.result({ errors: 1, lineError: "Voucher not found for alteration" });
      this.touch(existing, fields);
      return this.result({ altered: 1, lastVch: existing.masterid });
    }
    const remoteId = v.attrs?.REMOTEID;
    const cls = vt.parent ?? typeName;
    if (remoteId && this.options.remoteIdBehavior === "alter") {
      const existing = company.vouchers.find((x) => x._remoteid === remoteId);
      if (existing) {
        this.touch(existing, fields);
        return this.result({ altered: 1, lastVch: existing.masterid });
      }
    }
    const created = this.addVoucher(company, cls, { ...fields, guid: remoteId ?? `tally-${this.counter}`, _remoteid: remoteId });
    return this.result({ created: 1, lastVch: created.masterid });
  }

  private importLedger(company: Company, l: XmlNode): string {
    const name = unent(l.attrs?.NAME ?? "");
    const existing = (company.masters.ledger ?? []).find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (l.attrs?.ACTION === "Alter") {
      if (!existing) return this.result({ errors: 1, lineError: `Ledger '${name}' does not exist!` });
      this.touch(existing, { name: unent(texts(l, "NAME")[0] ?? name), parent: unent(texts(l, "PARENT")[0] ?? "") });
      return this.result({ altered: 1, lastMid: existing.masterid });
    }
    if (existing) return this.result({ errors: 1, lineError: `Ledger '${name}' already exists` });
    const created = this.addMaster(company, "ledger", { name, parent: unent(texts(l, "PARENT")[0] ?? "") });
    return this.result({ created: 1, lastMid: created.masterid });
  }
}

/** A small company with custom fields, modelled on the Shanoor data described in the PRD. */
export function seedDemoCompany(t: FakeTally, name = "Shanoor Projects & Realtors Pvt Ltd"): Company {
  const c = t.addCompany(name);
  for (const g of ["Sundry Debtors", "Bank Accounts", "Sales Accounts"]) t.addMaster(c, "group", { name: g, parent: "&#4; Primary", primarygroup: g });
  for (const vt of ["Receipt", "Payment", "Contra", "Journal", "Sales"]) t.addMaster(c, "vouchertype", { name: vt, parent: vt, numberingmethod: "Automatic" });
  t.addMaster(c, "ledger", { name: "HDFC Bank", parent: "Bank Accounts", openingbalance: "-1000000.00" });
  t.addMaster(c, "ledger", { name: "Sales", parent: "Sales Accounts" });
  const udfs = { LEDAPPARTMENTNO: { type: "String", index: 1010 }, LEDPANNO: { type: "String", index: 1011 } };
  t.addMaster(c, "ledger", { name: "A-1203 Customer", parent: "Sundry Debtors", incometaxnumber: "ABCDE1234F", ledappartmentno: "A-1203", ledpanno: "SECRETPAN99", openingbalance: "250000.00", _udfs: udfs });
  t.addMaster(c, "ledger", { name: "EAGLE  TRADERS", parent: "Sundry Debtors", ledappartmentno: "B-0407", ledpanno: "OTHERPAN77", _udfs: udfs });
  t.addVoucher(c, "Receipt", {
    date: "20260410", vouchernumber: "1", vouchertypename: "Receipt", narration: "Booking A-1203, instalment 1",
    ledgerentries: [
      { ledgername: "HDFC Bank", amount: "-100000.00", billallocations: [] },
      { ledgername: "A-1203 Customer", amount: "100000.00", billallocations: [{ name: "INV-1", billtype: "Agst Ref", amount: "100000.00" }] },
    ],
  });
  t.addVoucher(c, "Receipt", {
    date: "20260615", vouchernumber: "2", vouchertypename: "Receipt", narration: "Booking A-1203, instalment 2",
    ledgerentries: [{ ledgername: "HDFC Bank", amount: "-50000.29", billallocations: [] }, { ledgername: "A-1203 Customer", amount: "50000.29", billallocations: [] }],
  });
  return c;
}
