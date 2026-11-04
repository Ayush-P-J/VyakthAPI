/**
 * Step 0 gate from the build plan: every connector builder round-trips through a template and
 * produces the same request as the builder, for every combination of options it supports.
 * Comparison is canonical (whitespace and TDL object order), see canonicalRequest.
 */
import { describe, expect, it } from "vitest";
import { builderFiles, connectorAvailable, loadBuilderModule, outputsFor, paramNamesOf } from "../scripts/builders.ts";
import { templateFromOutputs } from "../src/extract.ts";
import { renderTemplate, type RenderParams } from "../src/template.ts";
import { canonicalRequest } from "../src/tree.ts";

const COMPANY = "Shanoor Projects & Realtors <Pvt> 'Ltd'";
const stableNames = (xml: string) => xml.replace(/_\d{13}_\d+/g, "_UID");
const same = (xml: string) => stableNames(canonicalRequest(xml));

const SKIP = new Set(["outstandingContext"]); // a helper that returns a fragment, not a request

describe.skipIf(!connectorAvailable())("Step 0: builders round-trip through templates", async () => {
  const entries: [string, Function][] = [];
  for (const f of connectorAvailable() ? await builderFiles() : []) {
    for (const [name, fn] of Object.entries(loadBuilderModule(f))) {
      if (typeof fn === "function" && !SKIP.has(name)) entries.push([name, fn]);
    }
  }

  it("found the connector's builders", () => expect(entries.length).toBeGreaterThanOrEqual(37));

  it.each(entries)("%s", (name, fn) => {
    const params = paramNamesOf(fn);
    const extra: Record<string, unknown> = { stockItemName: "ITEM", fromDate: "20250401", toDate: "20260331", snapshot: undefined, voucherTypeSystemVar: "$$VchTypeReceipt" };
    const withArgs = (...a: unknown[]) => (fn as Function)(...params.map((p, i) => (a[i] !== undefined ? a[i] : extra[p])));
    const wrapped = (...a: unknown[]) => withArgs(...a);
    const outputs = outputsFor(wrapped as never, params);
    const template = templateFromOutputs(outputs);
    const iWm = params.findIndex((p) => /alterid/i.test(p));
    const iDate = params.findIndex((p) => /daterange/i.test(p));
    const iMid = params.findIndex((p) => /masteridrange/i.test(p));

    const cases: { wm?: number; date?: boolean; mid?: boolean }[] = [{}];
    if (iWm >= 0) cases.push({ wm: 1200 });
    if (iDate >= 0) cases.push({ date: true }, ...(iWm >= 0 ? [{ wm: 1200, date: true }] : []));
    if (iMid >= 0) cases.push({ mid: true }, ...(iWm >= 0 ? [{ wm: 1200, mid: true }] : []));

    for (const c of cases) {
      const args: unknown[] = params.map((_, i) => (i === 0 ? COMPANY : undefined));
      if (iWm >= 0) args[iWm] = c.wm ?? 0;
      if (c.date) args[iDate] = { from: 20250401, to: 20250430 };
      if (c.mid) args[iMid] = { gt: 100, lte: 500 };
      const expected = withArgs(...args);
      const render: RenderParams = { company: COMPANY, uid: "1700000000000_1", ...(c.wm ? { watermark: c.wm } : {}) };
      if (c.date) Object.assign(render, { from: 20250401, to: 20250430 });
      if (c.mid) Object.assign(render, { gt: 100, lte: 500 });
      expect(same(renderTemplate(template, render)), `${name} ${JSON.stringify(c)}`).toBe(same(expected));
    }
  });
});
