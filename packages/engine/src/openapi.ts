/** Generates the OpenAPI document for one connection's schema version. */
import type { DatasetDef, FieldDef, LineDef } from "./definition.ts";
import { IDENTITY_TAGS } from "./definition.ts";
import { WRITABLE_VOUCHERS } from "./write.ts";

const MONEY = { type: ["object", "null"], properties: { paise: { type: "integer" }, side: { enum: ["Dr", "Cr", null] } } };
const QTY = { type: ["object", "null"], properties: { value: { type: "number" }, unit: { type: ["string", "null"] } } };

function fieldSchema(f: FieldDef): Record<string, unknown> {
  const note = f.privacy === "masked" ? { description: "Masked by the connector." } : {};
  switch (f.type) {
    case "amount": return { ...MONEY, ...note };
    case "quantity": case "rate": return { ...QTY, ...note };
    case "number": return { type: ["number", "null"], ...note };
    case "logical": return { type: ["boolean", "null"], ...note };
    case "date": return { type: ["string", "null"], format: "date", ...note };
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
const job = { "202": { description: "Write job queued", content: { "application/json": { schema: ref("WriteJob") } } } };
const idem = { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", maxLength: 255 } };

export function generateOpenApi(opts: { connectionId: string; version: number; datasets: DatasetDef[] }): Record<string, unknown> {
  const schemas: Record<string, unknown> = {
    WriteJob: { type: "object", properties: { id: { type: "string" }, status: { enum: ["queued", "sent", "completed", "failed", "rejected"] }, tallyId: { type: ["string", "null"] }, errors: { type: "array" } } },
  };
  const paths: Record<string, unknown> = {};
  const conn = { name: "id", in: "path", required: true, schema: { type: "string", const: opts.connectionId } };
  for (const d of opts.datasets) {
    const name = d.name;
    schemas[name] = { allOf: [{ type: "object", properties: { id: { type: "string" }, alterId: { type: "string" }, updatedAt: { type: "string" }, deleted: { type: "boolean" } } }, objectSchema(d.fields, d.lines)] };
    const list = {
      get: {
        summary: `List ${d.title.toLowerCase()}`, parameters: [conn,
          { name: "cursor", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", maximum: 500 } },
          { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" } }, { name: "fields", in: "query", schema: { type: "string" } },
          { name: "live", in: "query", schema: { type: "boolean" } }, { name: "includeDeleted", in: "query", schema: { type: "boolean" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: ref(name) }, nextCursor: { type: ["string", "null"] } } } } } } },
      },
    };
    const writable = name === "ledgers" || name in WRITABLE_VOUCHERS;
    paths[`/v1/connections/{id}/${name}`] = writable ? { ...list, post: { summary: `Create (write job)`, parameters: [conn, idem], responses: job } } : list;
    paths[`/v1/connections/{id}/${name}/{recordId}`] = {
      get: { summary: "One record", parameters: [conn, { name: "recordId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: ref(name) } } } } },
      ...(writable ? { patch: { summary: "Alter (write job). Send the complete record.", parameters: [conn, { name: "recordId", in: "path", required: true, schema: { type: "string" } }, idem], responses: job } } : {}),
    };
    if (writable) paths[`/v1/connections/{id}/${name}:validate`] = { post: { summary: "Dry run against live Tally", parameters: [conn], responses: { "200": { description: "Validation result" } } } };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Hexspare Tally API", version: `${opts.version}`, description: `Schema version ${opts.version} of connection ${opts.connectionId}.` },
    security: [{ bearer: [] }],
    paths,
    components: { schemas, securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
  };
}
