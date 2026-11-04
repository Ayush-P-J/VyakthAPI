/** The connector's builders and how to call each one. Used by the Step 0 gate and pack generation. */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SENTINEL, type BuilderOutputs } from "../src/extract.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const CONNECTOR_DIST = resolve(here, "../../../vyakth-connector/dist");
export const connectorAvailable = () => existsSync(CONNECTOR_DIST);

export function loadBuilderModule(file: string): Record<string, (...a: never[]) => string> {
  return createRequire(import.meta.url)(resolve(CONNECTOR_DIST, "tally-core/xml/builders", file));
}

export function builderFiles(): Promise<string[]> {
  return import("node:fs/promises").then(async (fs) =>
    (await fs.readdir(resolve(CONNECTOR_DIST, "tally-core/xml/builders"))).filter((f) => f.endsWith(".builder.js")).sort());
}

/** Calls one builder for each option its parameter list declares. */
export function outputsFor(fn: (...a: any[]) => string, paramNames: string[]): BuilderOutputs {
  const c = SENTINEL.company;
  const has = (re: RegExp) => paramNames.findIndex((p) => re.test(p));
  const args = (over: Record<number, unknown>) => paramNames.map((_, i) => (i in over ? over[i] : i === 0 ? c : undefined));
  const wmAt = has(/alterid/i);
  const dateAt = has(/daterange/i);
  const midAt = has(/masteridrange|range$/i);
  const rangeAt = dateAt >= 0 ? dateAt : midAt;
  const rangeValue = dateAt >= 0 ? { from: SENTINEL.from, to: SENTINEL.to } : { gt: SENTINEL.gt, lte: SENTINEL.lte };
  const out: BuilderOutputs = { base: fn(...args(wmAt >= 0 ? { [wmAt]: 0 } : {})) };
  if (wmAt >= 0) out.delta = fn(...args({ [wmAt]: SENTINEL.watermark }));
  if (rangeAt >= 0) out.range = fn(...args({ ...(wmAt >= 0 ? { [wmAt]: 0 } : {}), [rangeAt]: rangeValue }));
  return out;
}

export function paramNamesOf(fn: Function): string[] {
  const m = /^(?:async\s*)?(?:function\s*\w*\s*)?\(([^)]*)\)/.exec(fn.toString());
  return (m?.[1] ?? "").split(",").map((s) => s.trim().split("=")[0]!.trim()).filter(Boolean);
}
