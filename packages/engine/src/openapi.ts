/** Generates the OpenAPI document for one connection's schema version. */
import type { DatasetDef, FieldDef, LineDef } from "./definition.ts";
import { IDENTITY_TAGS } from "./definition.ts";
import { WRITABLE_VOUCHERS } from "./write.ts";
import { LedgerInput, VoucherInput } from "./write.ts";
import { z } from "zod";

const MONEY = { type: ["object", "null"], properties: { paise: { type: "integer" }, side: { enum: ["Dr", "Cr", null] } } };
const QTY = { type: ["object", "null"], properties: { value: { type: "number" }, unit: { type: ["string", "null"] } } };

function fieldSchema(f: FieldDef): Record<string, unknown> {
  const note = f.privacy === "masked" ? { description: "Masked by the connector." } : {};
  switch (f.type) {
    case "amount": return { ...MONEY, ...note };
    case "quantity": case "rate": return { ...QTY, ...note };
    case "number": return { type: ["number", "null"], ...note };
    case "logical": return { type: ["boolean", "null"], ...note };
    case "date": return { type: ["string", "null"], ...(f.privacy === "masked" ? {} : { format: "date" }), ...note };
    default: return { type: ["string", "null"], ...note };
  }
}

function objectSchema(fields: FieldDef[], lines: LineDef[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const f of fields) if (!IDENTITY_TAGS.has(f.tag)) properties[f.name] = fieldSchema(f);
  for (const l of lines) properties[l.name] = { type: "array", items: objectSchema(l.fields, l.lines) };
  return { type: "object", properties };
}

const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema: unknown) => ({ "application/json": { schema } });
const errors = { default: { description: "API error. See error.code and error.message.", content: json(ref("ApiError")) } };
const job = { "202": { description: "Job accepted; poll its status or subscribe to write_job events. Acceptance does not mean Tally has posted it.", headers: { "Idempotent-Replay": { description: "true when returning an existing job", schema: { type: "string", enum: ["true"] } } }, content: json(ref("WriteJob")) }, ...errors };
const idem = { name: "Idempotency-Key", in: "header", required: true, description: "Unique within the project. Reusing it with a different connection, action, record or body returns 409.", schema: { type: "string", minLength: 1, maxLength: 255 } };
const query = (name: string, schema: unknown, description: string) => ({ name, in: "query", schema, description });
const freshness = Object.fromEntries(["X-Tally-Connection-Status", "X-Tally-Connector-Online", "X-Tally-Open", "X-Tally-Last-Sync"].map((name) => [name, { description: name === "X-Tally-Last-Sync" ? "Last sync across the connection; omitted before the first sync." : "Current connection availability.", schema: { type: "string" } }]));
const request = (name: string) => ({ required: true, content: json(ref(name)) });
function inputSchema(input: typeof LedgerInput | typeof VoucherInput) {
  const { $schema: _dialect, ...schema } = z.toJSONSchema(input);
  return schema;
}

export function generateOpenApi(opts: { connectionId: string; version: number; datasets: DatasetDef[] }): Record<string, unknown> {
  const schemas: Record<string, unknown> = {
    ApiError: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, details: {} } } } },
    WriteIssue: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, path: { type: "string" } } },
    VoucherInput: { ...inputSchema(VoucherInput), description: "Complete voucher input. Amounts are positive integer paise; total Dr must equal total Cr. Bill allocations must total their entry amount. The dataset selects the default voucher type." },
    LedgerInput: { ...inputSchema(LedgerInput), description: "Complete ledger input. openingBalancePaise is signed: negative for debit, positive for credit." },
    ValidationResult: { type: "object", required: ["valid", "issues"], properties: { valid: { type: "boolean" }, issues: { type: "array", items: ref("WriteIssue") } } },
    ReadMeta: { type: "object", required: ["mode"], properties: { mode: { enum: ["synced", "live"] }, lastSyncAt: { type: ["string", "null"] }, tallyOpen: { type: "boolean" } } },
    WriteJob: { type: "object", required: ["id", "connectionId", "dataset", "action", "idempotencyKey", "status", "tallyId", "created", "altered", "deduplicated", "errors", "payloadHash", "createdAt", "completedAt"], properties: {
      id: { type: "string", format: "uuid" }, connectionId: { type: "string", format: "uuid" }, dataset: { type: "string" }, action: { enum: ["create", "alter"] }, idempotencyKey: { type: "string" },
      status: { enum: ["queued", "sent", "completed", "failed", "rejected"] }, tallyId: { type: ["string", "null"] }, created: { type: ["integer", "null"] }, altered: { type: ["integer", "null"] }, deduplicated: { type: "boolean" }, errors: { type: "array", items: ref("WriteIssue") }, payloadHash: { type: "string" }, createdAt: { type: "string", format: "date-time" }, completedAt: { type: ["string", "null"], format: "date-time" },
    } },
  };
  const paths: Record<string, unknown> = {};
  const conn = { name: "id", in: "path", required: true, schema: { type: "string", const: opts.connectionId } };
  for (const d of opts.datasets) {
    const name = d.name;
    schemas[name] = { allOf: [{ type: "object", properties: { id: { type: "string" }, alterId: { type: "string" }, updatedAt: { type: "string" }, deleted: { type: "boolean" } } }, objectSchema(d.fields, d.lines)] };
    const list = {
      get: {
        summary: `List ${d.title.toLowerCase()}`, parameters: [conn,
          query("cursor", { type: "string", maxLength: 500 }, "Opaque nextCursor from a synced list; ignored in live mode."),
          query("limit", { type: "integer", minimum: 1, maximum: 500, default: 100 }, "Maximum records returned."),
          query("updatedSince", { type: "string", format: "date-time" }, "Synced mode only: records updated strictly after this timestamp."),
          query("fields", { type: "string", maxLength: 2000 }, "Synced mode only: comma-separated top-level fields; identity and metadata remain."),
          query("live", { type: "boolean", default: false }, "Ask the online connector and Tally directly. Live lists have no cursor pagination; check truncated."),
          query("includeDeleted", { type: "boolean", default: false }, "Synced mode only: include deletion tombstones."),
          query("from", { type: "string", format: "date" }, "Live date-paged datasets only. Defaults to the start of the current UTC month."),
          query("to", { type: "string", format: "date" }, "Live date-paged datasets only. Defaults to day 31 of the current UTC month."),
        ],
        tags: ["Datasets"], operationId: `list_${name}`, "x-required-scope": "read",
        responses: { "200": { description: "Synced or live records. updatedAt and deleted are synced metadata. Live responses add truncated.", headers: freshness, content: json({ type: "object", required: ["data", "nextCursor", "meta"], properties: { data: { type: "array", items: ref(name) }, nextCursor: { type: ["string", "null"] }, truncated: { type: "boolean" }, meta: ref("ReadMeta") } }) }, ...errors },
      },
    };
    const writable = name === "ledgers" || name in WRITABLE_VOUCHERS;
    const input = name === "ledgers" ? "LedgerInput" : "VoucherInput";
    paths[`/v1/connections/{id}/${name}`] = writable ? { ...list, post: { summary: `Create ${d.title.toLowerCase()} (write job)`, tags: ["Writes"], operationId: `create_${name}`, "x-required-scope": "write", parameters: [conn, idem], requestBody: request(input), responses: job } } : list;
    paths[`/v1/connections/{id}/${name}/{recordId}`] = {
      get: { summary: `Get one record from ${name}`, tags: ["Datasets"], operationId: `get_${name}`, "x-required-scope": "read", parameters: [conn, { name: "recordId", in: "path", required: true, schema: { type: "string", pattern: "^[0-9]{1,18}$" } }, query("live", { type: "boolean", default: false }, "Read directly from Tally."), query("fields", { type: "string" }, "Synced mode only: comma-separated top-level fields.")], responses: { "200": { description: "One record", headers: freshness, content: json(ref(name)) }, ...errors } },
      ...(writable ? { patch: { summary: "Alter (write job). Send the complete write input.", tags: ["Writes"], operationId: `alter_${name}`, "x-required-scope": "write", parameters: [conn, { name: "recordId", in: "path", required: true, schema: { type: "string", pattern: "^[0-9]{1,18}$" } }, idem], requestBody: request(input), responses: job } } : {}),
    };
    if (writable) paths[`/v1/connections/{id}/${name}:validate`] = { post: { summary: "Dry run against live Tally; posts nothing", tags: ["Writes"], operationId: `validate_${name}`, "x-required-scope": "write", parameters: [conn], requestBody: request(input), responses: { "200": { description: "Validation result. valid=false is a normal validation outcome; malformed input can return an API error.", headers: freshness, content: json(ref("ValidationResult")) }, ...errors } } };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Hexspare Tally API", version: `${opts.version}`, description: `Schema version ${opts.version} of connection ${opts.connectionId}.` },
    security: [{ bearer: [] }],
    paths,
    components: { schemas, securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
  };
}
