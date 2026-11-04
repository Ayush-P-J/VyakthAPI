/**
 * Request templates. A template is a request string with `{{name}}` values and `{{#flag}}` /
 * `{{^flag}}` blocks. The agent only renders templates; it never compiles (ADR-1, decision 3).
 * Rendering validates values and re-checks the export-only guarantee on the final request.
 */
import { assertExportOnly } from "./guards.ts";
import { escapeXml } from "./escape.ts";

export interface RenderParams {
  company: string;
  /** Include only records with AlterID above this. Omit or 0 for a full pull. */
  watermark?: number;
  /** Voucher date window as YYYYMMDD integers. */
  from?: number;
  to?: number;
  /** MasterID window: gt < id <= lte. */
  gt?: number;
  lte?: number;
  /** Unique report-name suffix, supplied by the host because the engine has no clock. */
  uid?: string;
}

function intParam(name: string, value: number | undefined): string {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Template parameter ${name} must be a non-negative integer`);
  }
  return String(value);
}

export function renderTemplate(template: string, params: RenderParams): string {
  const flags: Record<string, boolean> = {
    delta: Boolean(params.watermark),
    range: params.from !== undefined || params.gt !== undefined,
  };
  let out = template.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (_m, kind: string, flag: string, body: string) =>
    (kind === "#") === Boolean(flags[flag]) ? body : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => {
    switch (name) {
      case "company": return escapeXml(params.company);
      case "uid":
        if (!params.uid || !/^\w+$/.test(params.uid)) throw new Error("Template parameter uid must be a word");
        return params.uid;
      case "watermark": case "from": case "to": case "gt": case "lte":
        return intParam(name, params[name]);
      default: throw new Error(`Unknown template parameter ${name}`);
    }
  });
  assertExportOnly(out);
  return out;
}

/** Renders a request with no parameters, for requests compiled per call (probes, preflight). */
export function assertRendered(xml: string): string {
  if (/\{\{/.test(xml)) throw new Error("Request contains an unrendered placeholder");
  assertExportOnly(xml);
  return xml;
}
