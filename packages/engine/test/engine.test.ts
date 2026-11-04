import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as e from "../src/index.ts";

const ledgers = e.standardPack.datasets.find((d) => d.name === "ledgers")!;
const receipts = e.standardPack.datasets.find((d) => d.name === "receipts")!;

describe("purity (ADR-1: no I/O and no clock in the engine)", () => {
  const src = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
  it.each(readdirSync(src).filter((f) => f.endsWith(".ts")))("%s", (file) => {
    const text = readFileSync(resolve(src, file), "utf8");
    expect(text).not.toMatch(/from "(node:)?(fs|net|http|https|child_process|dns|dgram|tls)(\/[^"]*)?"/);
    expect(text).not.toMatch(/\bDate\.now\(|\bnew Date\(\)|Math\.random\(|\bfetch\(|process\.env/);
  });
});

describe("export-only guard", () => {
  const good = e.renderTemplate(ledgers.template, { company: "A" });
  it("accepts a real request", () => expect(() => e.assertExportOnly(good)).not.toThrow());
  it.each([
    ["Import", good.replace("<TALLYREQUEST>Export", "<TALLYREQUEST>Import")],
    ["Execute", good.replace("<TALLYREQUEST>Export", "<TALLYREQUEST>Execute")],
    ["two TALLYREQUEST", good.replace("<TALLYREQUEST>", "<TALLYREQUEST>Import</TALLYREQUEST><TALLYREQUEST>")],
    ["FUNCTION", good.replace("</TDLMESSAGE>", "<FUNCTION NAME='x'/></TDLMESSAGE>")],
    ["$$ExecuteAction", good.replace("$MASTERID", () => "$$ExecuteAction:x")],
    ["IMPORTDATA", good.replace("</BODY>", "<IMPORTDATA/></BODY>")],
    ["DOCTYPE", `<!DOCTYPE x>${good}`],
  ])("rejects %s", (_n, xml) => expect(() => e.assertExportOnly(xml)).toThrow(e.UnsafeRequestError));
  it("rejects template injection through the company name", () => {
    const xml = e.renderTemplate(ledgers.template, { company: "</SVCURRENTCOMPANY><TALLYREQUEST>Import" });
    expect(xml).toContain("&lt;/SVCURRENTCOMPANY&gt;");
  });
  it("rejects a non-integer watermark", () => {
    expect(() => e.renderTemplate(ledgers.template, { company: "A", watermark: "1 or 1=1" as never })).toThrow();
  });
});

describe("write guard", () => {
  const input: e.VoucherInput = { date: "2026-11-03", entries: [{ ledger: "HDFC & Co", side: "Dr", amountPaise: 25000000 }, { ledger: "A-1203", side: "Cr", amountPaise: 25000000 }] };
  const xml = e.compileVoucherWrite({ company: "X", dataset: "receipts", input, remoteId: "hx-1", action: "create" });
  it("builds Tally's sign convention: debit is negative and deemed positive", () => {
    expect(xml).toContain("<LEDGERNAME>HDFC &amp; Co</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-250000.00</AMOUNT>");
    expect(xml).toContain("<LEDGERNAME>A-1203</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>250000.00</AMOUNT>");
    expect(xml).toContain('REMOTEID="hx-1"');
  });
  it.each([
    ["delete", xml.replace('ACTION="Create"', 'ACTION="Delete"')],
    ["cancel", xml.replace('ACTION="Create"', 'ACTION="Cancel"')],
    ["two objects", xml.replace("</VOUCHER>", "</VOUCHER><VOUCHER ACTION=\"Create\"></VOUCHER>")],
    ["an export", xml.replace("Import Data", "Export")],
    ["inline TDL", xml.replace("</TALLYMESSAGE>", "</TALLYMESSAGE><TDL/>")],
  ])("rejects %s", (_n, bad) => expect(() => e.assertWriteSafe(bad)).toThrow(e.UnsafeRequestError));
  it("rejects an unbalanced voucher", () => {
    expect(() => e.compileVoucherWrite({ company: "X", dataset: "receipts", remoteId: "r", action: "create", input: { ...input, entries: [input.entries[0]!, { ...input.entries[1]!, amountPaise: 1 }] } })).toThrow(/Debits and credits/);
  });
  it("a remote id is stable, per connection, and safe in a formula", () => {
    const a = e.remoteIdFor("c1", 'x"; drop');
    expect(a).toBe(e.remoteIdFor("c1", 'x"; drop'));
    expect(a).not.toBe(e.remoteIdFor("c2", 'x"; drop'));
    expect(a).toMatch(/^[\w-]+$/);
  });
});

describe("parser", () => {
  const rows = new Set(["LEDGERLIST"]);
  it("strips Tally's &#4; marker and keeps inner spaces in names", async () => {
    const [r] = await e.collectRows(`<DATA><LEDGERLIST><NAME>EAGLE  TRADERS</NAME><PARENT>&#4; Primary</PARENT></LEDGERLIST></DATA>`, rows);
    expect(r!.NAME).toBe("EAGLE  TRADERS");
    expect(e.normaliseValue(e.unwrap(r!.PARENT), "text")).toBe("Primary");
  });
  it("handles a reference split across chunks", async () => {
    async function* chunks() { yield "<DATA><LEDGERLIST><NAME>A&#"; yield "4;B</NAME></LEDGERLIST></DATA>"; }
    expect((await e.collectRows(chunks(), rows))[0]!.NAME).toBe("AB");
  });
  it.each([
    ["LINEERROR", "<ENVELOPE><LINEERROR>Could not find company</LINEERROR></ENVELOPE>"],
    ["STATUS 0", "<ENVELOPE><HEADER><STATUS>0</STATUS></HEADER></ENVELOPE>"],
    ["RESPONSE", "<RESPONSE>Unknown Request, cannot be processed</RESPONSE>"],
    ["empty", ""],
    ["garbage", "<html>proxy error</html>"],
    ["truncated", "<DATA><LEDGERLIST><NAME>A"],
  ])("a failed response (%s) never looks like an empty result", async (_n, xml) => {
    await expect(e.collectRows(xml, rows)).rejects.toThrow(e.TallyResponseError);
  });
  it("an honest empty result is empty", async () => expect(await e.collectRows("<DATA></DATA>", rows)).toEqual([]));
});

describe("normaliser", () => {
  it.each([
    ["-250000.00", { paise: 25000000, side: "Dr" }],
    ["250000.00", { paise: 25000000, side: "Cr" }],
    ["1,00,000.50 Dr", { paise: 10000050, side: "Dr" }],
    ["-$100.00 @ ₹ 83.00/$ = -₹ 8300.00", { paise: 830000, side: "Dr" }],
    ["0.29", { paise: 29, side: "Cr" }],
    ["1.005", { paise: 101, side: "Cr" }],
    ["0", { paise: 0, side: null }],
    ["", null],
  ])("amount %s", (raw, want) => expect(e.parseAmount(raw)).toEqual(want));
  it("0.29 stays exact, where float arithmetic gives 28.999...", () => expect(0.29 * 100).not.toBe(29));
  it.each([["20260401", "2026-04-01"], ["1-Apr-26", "2026-04-01"], ["31-Dec-2025", "2025-12-31"], ["20260231", null], ["junk", null]])("date %s", (raw, want) => expect(e.parseDate(raw)).toBe(want));
  it("quantity and rate", () => {
    expect(e.parseQuantity("10 Nos = 5 Box")).toEqual({ value: 10, unit: "Nos" });
    expect(e.parseRate("100.50/Nos")).toEqual({ value: 100.5, unit: "Nos" });
  });
  it("skips a row with no valid identity", () => {
    expect(e.normaliseRow({ NAME: "x" }, ledgers)).toBeNull();
    expect(e.normaliseRow({ MASTERID: "0", ALTERID: "1" }, ledgers)).toBeNull();
  });
  it("takes Dr/Cr from the sibling field when the amount is absolute", () => {
    const line = receipts.lines[0]!;
    const r = e.normaliseRow({ MASTERID: "1", ALTERID: "2", LEDGERENTRIES: [{ LEDGERNAME: "HDFC", AMOUNT: "100.00", ISDEEMED: "Dr" }] }, { fields: [], lines: [line] })!;
    expect((r.body.ledgerEntries as any)[0].amount).toEqual({ paise: 10000, side: "Dr" });
  });
});

describe("custom fields and privacy", () => {
  const mapped = e.addCustomField(ledgers, { name: "apartmentNo", expr: "$LEDAppartmentNo", type: "text", udfIndex: 1010, udfName: "LEDAPPARTMENTNO" });
  it("adding a UDF adds one field to the report and to the schema", () => {
    const xml = e.renderTemplate(mapped.template, { company: "A" });
    expect(xml).toContain("<SET>$LEDAppartmentNo</SET><XMLTAG>&quot;HX_APARTMENTNO&quot;</XMLTAG>");
    expect(xml).toMatch(/<LEFTFIELDS>[^<]*HXF_ledgers_row_apartmentNo<\/LEFTFIELDS>/);
    expect(mapped.fields.at(-1)!.custom).toBe(true);
  });
  it("adds a field to a nested child line", () => {
    const d = e.addCustomField(receipts, { name: "stage", expr: "$StageUdf", type: "text", line: "billAllocations" });
    expect(e.renderTemplate(d.template, { company: "A" })).toContain("<SET>$StageUdf</SET>");
    const bills = d.lines[0]!.lines.find((l) => l.name === "billAllocations")!;
    expect(bills.fields.at(-1)!.name).toBe("stage");
  });
  it.each(["$$ExecuteAction:x", "$$Call:Foo", "$Name</SET><FUNCTION>", "", "$$NotAllowed:$Name"])("refuses expression %j", (expr) => {
    expect(() => e.addCustomField(ledgers, { name: "x", expr, type: "text" })).toThrow();
  });
  it("an excluded field is not even requested from Tally", () => {
    const out = e.applyPrivacyClasses(ledgers, { incomeTaxNumber: "excluded" });
    const xml = e.renderTemplate(out.template, { company: "A" });
    const line = /<LINE NAME="LedgerXML"[^>]*><LEFTFIELDS>([^<]*)/.exec(xml)![1]!;
    expect(line).not.toContain("MBI_LEDPAN");
    expect(out.fields.find((f) => f.name === "incomeTaxNumber")).toBeUndefined();
  });
  it("the local policy tightens but never relaxes", () => {
    const def = { fields: [{ ...ledgers.fields[2]!, name: "a", privacy: "masked" as const }, { ...ledgers.fields[2]!, name: "b" }, { ...ledgers.fields[2]!, name: "c" }], lines: [] };
    const out = e.applyPolicy({ a: "ABCDEFGH", b: "ABCDEFGH", c: "secret", z: "undeclared" }, def, { "d.a": "public", "d.c": "excluded" }, "d");
    expect(out).toEqual({ a: "****EFGH", b: "ABCDEFGH" });
  });
  it("suggests masking for KYC-looking names", () => {
    expect(e.suggestPrivacy("incomeTaxNumber")).toBe("masked");
    expect(e.suggestPrivacy("aadhaarNo")).toBe("masked");
    expect(e.suggestPrivacy("name")).toBe("public");
  });
});

describe("discovery", () => {
  const xml = `<ENVELOPE><BODY><DATA><COLLECTION><LEDGER NAME="A"><NAME>A</NAME>
    <UDF:LEDAPPARTMENTNO.LIST DESC="\`Led Appartment No\`" ISLIST="YES" TYPE="String" INDEX="1010"><UDF:LEDAPPARTMENTNO DESC="\`x\`">A-1203</UDF:LEDAPPARTMENTNO></UDF:LEDAPPARTMENTNO.LIST>
    <ALLLEDGERENTRIES.LIST><UDF:STAGE.LIST TYPE="Amount" INDEX="1011"><UDF:STAGE>500.00</UDF:STAGE></UDF:STAGE.LIST></ALLLEDGERENTRIES.LIST>
    </LEDGER></COLLECTION></DATA></BODY></ENVELOPE>`;
  it("finds UDFs at any depth, with masked samples", () => {
    const found = e.parseDiscovery(xml, "Ledger");
    expect(found.map((f) => f.udfName)).toEqual(["LEDAPPARTMENTNO", "STAGE"]);
    expect(found[0]).toMatchObject({ index: 1010, type: "text", label: "Led Appartment No", samples: ["**1203"] });
    expect(found[1]!.type).toBe("amount");
    expect(JSON.stringify(found)).not.toContain("A-1203");
  });
});

describe("import results", () => {
  it("one created and no errors is success", () => {
    const r = e.parseImportResult("<RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED><ERRORS>0</ERRORS><LASTVCHID>4242</LASTVCHID></RESPONSE>");
    expect(r).toMatchObject({ ok: true, tallyId: "4242" });
  });
  it("Tally's nested IMPORTRESULT form", () => {
    expect(e.parseImportResult("<ENVELOPE><BODY><DATA><IMPORTRESULT><CREATED>1</CREATED><ERRORS>0</ERRORS><LASTVCHID>7</LASTVCHID></IMPORTRESULT></DATA></BODY></ENVELOPE>").tallyId).toBe("7");
  });
  it("errors become plain language", () => {
    const r = e.parseImportResult("<RESPONSE><CREATED>0</CREATED><ERRORS>1</ERRORS><LINEERROR>Ledger &apos;XYZ&apos; does not exist!</LINEERROR></RESPONSE>");
    expect(r.ok).toBe(false);
    expect(r.issues[0]).toMatchObject({ code: "unknown_ledger" });
    expect(r.issues[0]!.message).toContain("XYZ");
  });
  it("nothing applied is a failure, not silent success", () => {
    expect(e.parseImportResult("<RESPONSE><CREATED>0</CREATED><ALTERED>0</ALTERED><IGNORED>1</IGNORED><ERRORS>0</ERRORS></RESPONSE>").ok).toBe(false);
  });
});

describe("preflight", () => {
  const input: e.VoucherInput = { date: "2020-01-01", entries: [{ ledger: "HDFC", side: "Dr", amountPaise: 100 }, { ledger: "Ghost", side: "Cr", amountPaise: 100 }] };
  const data: e.PreflightData = { ledgerNames: ["HDFC"], voucherTypes: [{ name: "Receipt", numbering: "Manual" }], company: { name: "X", booksFrom: "2021-04-01" } };
  it("reports every cause, per line", () => {
    const codes = e.evaluateVoucher(input, "Receipt", data).map((i) => `${i.code}@${i.path}`);
    expect(codes).toEqual(["unknown_ledger@entries[1].ledger", "voucher_number_required@voucherNumber", "date_before_books@date"]);
  });
});

describe("signing", () => {
  const key = e.generateSigningKey();
  const trusted = { k1: key.publicKeyPem };
  const signer = { kid: "k1", privateKeyPem: key.privateKeyPem };
  it("verifies", () => expect(e.verifyEnvelope(e.signEnvelope("job", { a: 1 }, signer), "job", trusted)).toEqual({ a: 1 }));
  it("refuses tampering", () => {
    const env = e.signEnvelope("job", { a: 1 }, signer);
    expect(() => e.verifyEnvelope({ ...env, payload: { a: 2 } }, "job", trusted)).toThrow(e.SignatureError);
  });
  it("a probe's signature cannot be used as a job", () => {
    const env = e.signEnvelope("probe", { a: 1 }, signer);
    expect(() => e.verifyEnvelope({ ...env, kind: "job" }, "job", trusted)).toThrow(e.SignatureError);
  });
  it("refuses an unknown key", () => expect(() => e.verifyEnvelope(e.signEnvelope("job", {}, { kid: "x", privateKeyPem: key.privateKeyPem }), "job", trusted)).toThrow(/Unknown/));
  it("canonical JSON ignores key order", () => expect(e.canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(e.canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 })));
});

describe("standard pack", () => {
  it("covers the spec's R3 list", () => {
    const names = e.standardPack.datasets.map((d) => d.name);
    for (const n of ["ledger_groups", "ledgers", "cost_centres", "voucher_types", "stock_items", "receipts", "sales", "payments", "journals"]) expect(names).toContain(n);
  });
  it.each(e.standardPack.datasets.map((d) => [d.name, d] as const))("%s renders in every mode and its OpenAPI is valid", (_n, d) => {
    const base = { company: "A & B", uid: "1" };
    for (const p of [{}, { watermark: 5 }, d.paging === "date" ? { from: 20250401, to: 20250430 } : d.paging === "masterId" ? { gt: 1, lte: 2 } : {}]) e.renderTemplate(d.template, { ...base, ...p });
    e.renderTemplate(d.keysTemplate, base);
    expect(d.fields.some((f) => f.tag === "MASTERID")).toBe(true);
    expect(d.fields.some((f) => f.tag === "ALTERID")).toBe(true);
    expect(d.fields.some((f) => f.tag === "TALLYSERIAL")).toBe(false);
    expect(JSON.parse(JSON.stringify(e.generateOpenApi({ connectionId: "c", version: 1, datasets: [d] }))).openapi).toBe("3.1.0");
  });
});
