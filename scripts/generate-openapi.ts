/** Repository-wide HTTP contracts. Dataset schemas come from the same engine as live bundles. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateOpenApi } from "../packages/engine/src/openapi.ts";
import type { DatasetDef } from "../packages/engine/src/definition.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const pack = JSON.parse(readFileSync(resolve(root, "packages/engine/src/standard-pack.generated.json"), "utf8"));
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const str = { type: "string" };
const uuid = { type: "string", format: "uuid" };
const timestamp = { type: "string", format: "date-time" };
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const array = (items: object) => ({ type: "array", items });
const object = (properties: Record<string, unknown>, required = Object.keys(properties), strict = false) => ({ type: "object", properties, required, ...(strict ? { additionalProperties: false } : {}) });
const json = (schema: unknown) => ({ "application/json": { schema } });
const response = (schema: unknown, description = "OK") => ({ description, content: json(schema) });
const body = (schema: unknown, required = true) => ({ required, content: json(schema) });
const param = (name: string, schema: object = uuid, where = "path", description?: string) => ({ name, in: where, ...(where === "path" ? { required: true } : {}), schema, ...(description ? { description } : {}) });
const events = ["record.created", "record.updated", "record.deleted", "write_job.completed", "write_job.failed", "connection.status_changed", "schema.published"];
const privacy = { type: "string", enum: ["public", "masked", "excluded"] };
const fields = object({
  dataset: str, name: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_]{0,63}$" }, expr: { type: "string", minLength: 1, maxLength: 400 },
  type: { type: "string", enum: ["text", "number", "amount", "quantity", "rate", "date", "logical"], default: "text" }, privacy,
  line: str, udfIndex: { type: "integer" }, udfType: { type: "string", maxLength: 40 }, udfName: { type: "string", pattern: "^[A-Za-z0-9_]{1,100}$" },
}, ["dataset", "name", "expr"], true);
const linkInput = object({
  label: { type: "string", maxLength: 200 }, redirectUrl: { type: "string", format: "uri", pattern: "^https?://", maxLength: 2000 },
  requestedScopes: { ...array({ enum: ["read", "write"] }), default: ["read"], description: "Displayed in the consent flow. Current runtime does not enforce connection-level read/write consent; API-key scopes are enforced." },
  requestedFields: { ...array(fields), maxItems: 200, default: [] }, expiresInHours: { type: "integer", minimum: 1, maximum: 720, default: 72 },
}, [], true);
const webhookInput = object({ url: { type: "string", format: "uri", maxLength: 2000, description: "Public HTTPS URL required unless private webhooks are explicitly enabled for development." }, events: { ...array({ enum: events }), minItems: 1 } }, ["url", "events"], true);
const datasetDefs = pack.datasets as DatasetDef[];
const publicDoc: any = generateOpenApi({ connectionId: "connection-id", version: 1, datasets: datasetDefs });
publicDoc.info = { title: "Hexspare Tally public API", version: "0.1.0", description: "Implemented developer API. All data calls use a project API key. Dataset fields describe the Standard pack; actual customer schemas and privacy rules are connection-specific. GET /v1/connections/{id}/schema returns {version,bundleHash,datasets,openapi}; extract openapi for that connection. x-required-scope identifies the exact API-key scope, with no scope inheritance. Real TallyPrime validation is still pending; see the application guide." };
publicDoc.servers = [{ url: "http://localhost:3000", description: "Local Docker API" }, { url: "https://api.example.com", description: "Replace with your deployed API origin" }];
// Static reference accepts any connection ID; live bundle documents pin their own connection.
for (const item of Object.values(publicDoc.paths) as any[]) for (const op of Object.values(item) as any[]) {
  for (const p of op.parameters ?? []) if (p.name === "id" && p.in === "path") p.schema = uuid;
}
Object.assign(publicDoc.components.schemas, {
  CustomFieldInput: fields,
  ConnectLinkInput: linkInput,
  ConnectLink: object({ id: uuid, url: { type: "string", format: "uri" }, token: str, expiresAt: timestamp }),
  Connection: object({ id: uuid, status: { enum: ["pending", "active", "paused", "revoked"] }, company: nullable(str), createdAt: timestamp, connectorOnline: { type: "boolean" }, tallyOpen: { type: "boolean" }, lastSeenAt: nullable(timestamp), lastSyncAt: nullable(timestamp), schemaVersion: nullable({ type: "integer" }) }),
  Schema: object({ version: { type: "integer" }, bundleHash: str, datasets: array(object({ name: str, title: str, kind: { enum: ["master", "voucher", "custom"] }, fields: array(object({ name: str, type: str, privacy, custom: { type: "boolean" } })), lines: array(str) })), openapi: { type: "object", additionalProperties: true } }),
  SchemaVersion: object({ version: { type: "integer" }, hash: str }),
  DiscoveredField: object({ tallyType: str, udfName: str, label: nullable(str), index: nullable({ type: "integer" }), type: str, path: str, samples: array(str), suggestedExpr: str }),
  WebhookInput: webhookInput,
  CreatedWebhook: object({ id: uuid, url: str, events: array({ enum: events }), secret: str }),
  Webhook: object({ id: uuid, url: str, events: array({ enum: events }), is_active: { type: "boolean" }, created_at: timestamp }),
  WebhookEvent: object({ id: uuid, event: { enum: events }, createdAt: timestamp, data: { type: "object", additionalProperties: true } }),
  WebhookDelivery: object({ deliveryId: uuid, event: { enum: events }, payload: ref("WebhookEvent"), attempts: { type: "integer" }, deliveredAt: nullable(timestamp) }),
  Usage: object({ data: array(object({ connectionId: nullable(uuid), kind: { enum: ["synced_read", "live_read", "write"] }, calls: { type: "integer" }, weighted: { type: "integer" } })), activeConnections: { type: "integer" } }),
});
const error = { default: response(ref("ApiError"), "API error; inspect error.code, message and optional details.") };
function add(doc: any, path: string, method: string, summary: string, scope: string | null, schema: object, opts: any = {}) {
  const { status = method === "post" ? 201 : 200, parameters, requestBody, ...rest } = opts;
  const inferred = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => param(m[1]!));
  (doc.paths[path] ??= {})[method] = { summary, operationId: `${method}_${path.replace(/[^A-Za-z0-9]+/g, "_")}`, ...(scope ? { "x-required-scope": scope } : {}), parameters: parameters ?? inferred, ...(requestBody ? { requestBody } : {}), responses: { [status]: response(schema), ...error }, ...rest };
}
const data = (schema: object) => object({ data: array(schema) });
add(publicDoc, "/v1/connect-links", "post", "Create a single-use customer connect link", "admin", ref("ConnectLink"), { requestBody: body(ref("ConnectLinkInput"), false), tags: ["Connections"] });
add(publicDoc, "/v1/connections", "get", "List project connections", "read", data(ref("Connection")), { tags: ["Connections"] });
add(publicDoc, "/v1/connections/{id}", "get", "Get connection availability and sync status", "read", ref("Connection"), { tags: ["Connections"] });
add(publicDoc, "/v1/connections/{id}", "delete", "Revoke connection and reject unfinished jobs", "admin", object({ id: uuid, status: { const: "revoked" } }), { tags: ["Connections"] });
add(publicDoc, "/v1/connections/{id}/schema", "get", "Get active datasets, fields and embedded OpenAPI document", "read", ref("Schema"), { tags: ["Schema"] });
add(publicDoc, "/v1/connections/{id}/schema/fields", "post", "Map custom fields and publish a schema version", "admin", ref("SchemaVersion"), { requestBody: body(object({ fields: { ...array(ref("CustomFieldInput")), minItems: 1, maxItems: 100 } }, ["fields"], true)), tags: ["Schema"] });
add(publicDoc, "/v1/connections/{id}/schema/rollback", "post", "Pin a previous schema version", "admin", ref("SchemaVersion"), { status: 200, requestBody: body(object({ version: { type: "integer", minimum: 1 } }, ["version"], true)), tags: ["Schema"] });
add(publicDoc, "/v1/connections/{id}/discovery", "get", "Discover UDFs using live Tally; samples are masked", "read", data(ref("DiscoveredField")), { tags: ["Schema"] });
add(publicDoc, "/v1/write-jobs/{jobId}", "get", "Get write job status and errors", "read", ref("WriteJob"), { tags: ["Writes"] });
add(publicDoc, "/v1/webhooks", "post", "Create webhook; save the returned secret now", "admin", ref("CreatedWebhook"), { requestBody: body(ref("WebhookInput")), tags: ["Webhooks"] });
add(publicDoc, "/v1/webhooks", "get", "List project webhooks (snake_case metadata)", "read", data(ref("Webhook")), { tags: ["Webhooks"] });
add(publicDoc, "/v1/webhooks/{id}/events", "get", "Read delivery log after a cursor", "read", object({ data: array(ref("WebhookDelivery")), nextCursor: nullable(str) }), { parameters: [param("id"), param("cursor", { type: "string" }, "query"), param("limit", { type: "integer", minimum: 1, maximum: 500, default: 100 }, "query")], tags: ["Webhooks"] });
add(publicDoc, "/v1/webhooks/{id}/replay", "post", "Reset deliveries after cursor for redelivery; omit cursor to replay all", "admin", object({ replaying: { type: "integer" } }), { status: 200, requestBody: body(object({ cursor: { type: "string", maxLength: 500 } }, [], true), false), tags: ["Webhooks"] });
add(publicDoc, "/v1/usage", "get", "Read metered usage (from inclusive, to exclusive)", "read", ref("Usage"), { parameters: [param("from", timestamp, "query", "Defaults to database start of month."), param("to", timestamp, "query", "Defaults to now plus one second.")], tags: ["Usage"] });
for (const path of ["/healthz", "/readyz"]) add(publicDoc, path, "get", path === "/healthz" ? "Process liveness" : "Database readiness", null, object({ ok: { const: true } }), { security: [], tags: ["Operations"] });

// Connector HTTP protocol and token-authenticated customer onboarding are separate credentials.
const device: any = { openapi: "3.1.0", info: { title: "Hexspare connector and connect-page API", version: "0.1.0", description: "Internal HTTP protocol, for connector maintainers and the customer consent page. Application integrations should use the public API. The WebSocket channel is documented in docs/architecture.md; OpenAPI covers HTTP only." }, servers: publicDoc.servers, security: [{ deviceSecret: [] }], paths: {}, components: { securitySchemes: { deviceSecret: { type: "http", scheme: "bearer", description: "hxd_ device secret returned on first enrollment; not a project API key." } }, schemas: { ApiError: publicDoc.components.schemas.ApiError } } };
const digits = { type: "string", pattern: "^[0-9]{1,18}$" };
const company = object({ name: { type: "string", minLength: 1, maxLength: 300 }, guid: { type: "string", maxLength: 200 }, serial: nullable({ type: "string", maxLength: 64 }), booksFrom: nullable({ type: "string", maxLength: 20 }) });
const envelope = object({ kind: { enum: ["bundle", "job", "probe"] }, kid: str, payload: {}, sig: { type: "string", description: "Ed25519 signature, base64url encoded." } });
// Signed envelope fields are defined by bundle.ts, including the canonical payload encoding.
device.components.schemas.Envelope = envelope;
add(device, "/connector/v1/enroll", "post", "Enroll new device or attach existing device to a connect link", null, object({ installationId: uuid, deviceSecret: str }, ["installationId"]), { status: 200, security: [{}, { deviceSecret: [] }], requestBody: body(object({ linkToken: { type: "string", minLength: 10, maxLength: 200 }, appVersion: { type: "string", maxLength: 40 }, companies: { ...array(company), maxItems: 200 } }, ["linkToken", "companies"], true)) });
add(device, "/connector/v1/connections", "get", "List this installation's connections", null, array(object({ id: uuid, company: str, status: str, consent: { type: "object" }, bundleHash: nullable(str), schemaVersion: nullable({ type: "integer" }) })));
add(device, "/connector/v1/connections/{id}/bundle", "get", "Fetch signed active bundle", null, ref("Envelope"));
add(device, "/connector/v1/connections/{id}/batches", "post", "Ingest sync batch; commit watermark after durable upload", null, object({ applied: { type: "integer" } }), { status: 200, requestBody: body(object({ batchId: uuid, dataset: { type: "string", maxLength: 64 }, bundleHash: { type: "string", minLength: 64, maxLength: 64 }, mode: { enum: ["initial", "delta", "repair"] }, records: { ...array(object({ id: digits, alterId: digits, body: { type: "object", additionalProperties: true } })), maxItems: 5000 }, commit: object({ watermark: { type: "integer", minimum: 0 } }) }, ["batchId", "dataset", "bundleHash", "mode", "records"], true)) });
add(device, "/connector/v1/connections/{id}/keys", "post", "Reconcile deleted records and detect repair needs", null, object({ deleted: { type: "integer" }, held: { type: "boolean" }, repairNeeded: { type: "boolean" } }), { status: 200, requestBody: body(object({ dataset: { type: "string", maxLength: 64 }, ids: { ...array(digits), maxItems: 5000000 }, maxAlterId: { type: "integer", minimum: 0 } }, undefined, true)) });
add(device, "/connector/v1/connections/{id}/issues", "post", "Report sync issue", null, object({ ok: { const: true } }), { status: 200, requestBody: body(object({ kind: { type: "string", maxLength: 64 }, message: { type: "string", maxLength: 2000 }, dataset: { type: "string", maxLength: 64 } }, ["kind", "message"], true)) });
add(device, "/connector/v1/connections/{id}/revoke", "post", "Customer revokes sharing", null, object({ id: uuid, status: { const: "revoked" } }), { status: 200 });
add(device, "/connector/v1/jobs/claim", "post", "Claim earliest unfinished job per connection, masters first", null, array(ref("Envelope")), { status: 200 });
add(device, "/connector/v1/jobs/{id}/result", "post", "Report terminal job result; first result wins", null, object({ ok: { const: true } }), { status: 200, requestBody: body(object({ status: { enum: ["completed", "failed", "rejected"] }, tallyId: nullable({ type: "string", maxLength: 64 }), created: { type: "integer" }, altered: { type: "integer" }, errors: { ...array(object({ code: { type: "string", maxLength: 64 }, message: { type: "string", maxLength: 2000 }, path: { type: "string", maxLength: 200 } }, ["code", "message"])), maxItems: 500 }, deduplicated: { type: "boolean" } }, ["status", "tallyId", "created", "altered", "errors"], true)) });
const tokenParam = [param("token", str, "path", "Secret cl_ token from a connect link; do not log or expose it.")];
add(device, "/connect/{token}", "get", "Redirect legacy API connect URL to console", null, {}, { status: 302, security: [], parameters: tokenParam, responses: { 302: { description: "Redirect to CONSOLE_URL/connect/{token}", headers: { Location: { schema: str } } } } });
add(device, "/connect/{token}/state", "get", "Get customer approval flow state", null, object({ status: { enum: ["connected", "expired", "awaiting_approval", "awaiting_connector"] }, project: str, label: nullable(str), requestedScopes: array(str), companies: array(object({ name: str, guid: str })), requestedFields: array(object({ dataset: str, name: str, suggested: privacy })), standardFields: array(object({ dataset: str, name: str, suggested: privacy })), redirect: nullable(str) }), { security: [], parameters: tokenParam });
add(device, "/connect/{token}/approve", "post", "Choose company and approve field privacy", null, object({ connectionId: uuid, redirect: nullable(str) }), { status: 200, security: [], parameters: tokenParam, requestBody: body(object({ companyGuid: { type: "string", maxLength: 200 }, rules: { type: "object", additionalProperties: privacy, default: {} }, customDefault: { ...privacy, default: "masked" } }, ["companyGuid"], true)) });

function emit(path: string, doc: unknown) {
  const text = JSON.stringify(doc, null, 2) + "\n";
  const target = resolve(root, path);
  if (check) {
    if (readFileSync(target, "utf8") !== text) throw new Error(`${path} is stale; run pnpm docs:generate`);
  } else { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text); }
  console.log(`${check ? "Checked" : "Wrote"} ${path}`);
}
for (const [name, doc] of [["public", publicDoc], ["connector", device]] as const) {
  emit(`docs/openapi/${name}.openapi.json`, doc);
  emit(`apps/console/public/openapi/${name}.openapi.json`, doc);
}
const consoleDoc = JSON.parse(readFileSync(resolve(root, "apps/console/openapi/console.openapi.json"), "utf8"));
emit("apps/console/public/openapi/console.openapi.json", consoleDoc);
