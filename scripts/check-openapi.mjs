/** Offline structural checks and source-route coverage, in addition to generation freshness. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const docs = Object.fromEntries([
  ["public", "docs/openapi/public.openapi.json"],
  ["connector", "docs/openapi/connector.openapi.json"],
  ["console", "apps/console/openapi/console.openapi.json"],
].map(([name, path]) => [name, JSON.parse(read(path))]));
const methods = ["get", "post", "patch", "delete", "put", "head", "options"];
const normalize = (path) => path.replace(/\{[^}]+\}/g, "{}");
function walk(value, visit) {
  if (!value || typeof value !== "object") return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}
for (const [name, doc] of Object.entries(docs)) {
  assert.equal(doc.openapi, "3.1.0");
  assert.ok(doc.info.title && doc.info.version && doc.servers?.length, `${name}: metadata/servers missing`);
  const ids = new Set();
  walk(doc, (node) => {
    if (node.$ref?.startsWith("#/")) {
      let target = doc;
      for (const key of node.$ref.slice(2).split("/")) target = target?.[key.replaceAll("~1", "/").replaceAll("~0", "~")];
      assert.notEqual(target, undefined, `${name}: unresolved ${node.$ref}`);
    }
  });
  let count = 0;
  for (const [path, item] of Object.entries(doc.paths)) for (const method of methods) {
    const op = item[method];
    if (!op) continue;
    count++;
    assert.ok(Object.keys(op.responses ?? {}).length, `${name}: ${method} ${path} has no response`);
    if (op.operationId) { assert.ok(!ids.has(op.operationId), `Duplicate operationId ${op.operationId}`); ids.add(op.operationId); }
    const params = [...(item.parameters ?? []), ...(op.parameters ?? [])];
    for (const match of path.matchAll(/\{([^}]+)\}/g)) assert.ok(params.some((p) => p.in === "path" && p.name === match[1] && p.required), `${name}: ${path} missing parameter ${match[1]}`);
    for (const p of params.filter((p) => p.in === "path")) assert.ok(path.includes(`{${p.name}}`), `${name}: ${path} has extra parameter ${p.name}`);
    for (const requirement of op.security ?? doc.security ?? []) for (const scheme of Object.keys(requirement)) assert.ok(doc.components?.securitySchemes?.[scheme], `${name}: unknown security scheme ${scheme}`);
  }
  console.log(`${name}: checked ${count} operations, local references, parameters and security`);
}

// Nest controller decorators are intentionally simple in this repository. Generic dataset routes
// expand to concrete Standard pack paths, including the :validate branch of the target handler.
const pack = JSON.parse(read("packages/engine/src/standard-pack.generated.json"));
const writable = ["ledgers", "receipts", "payments", "contras", "journals"];
const documented = new Set();
for (const doc of Object.values(docs)) for (const [path, item] of Object.entries(doc.paths)) for (const method of methods) if (item[method]) documented.add(`${method} ${normalize(path)}`);
const covered = new Set();
for (const [file, prefix] of [
  ["apps/cloud/src/public.controller.ts", "/v1"],
  ["apps/cloud/src/console.controller.ts", ""],
  ["apps/cloud/src/connector.controller.ts", "/connector/v1"],
  ["apps/cloud/src/connect.controller.ts", ""],
  ["apps/cloud/src/app.ts", ""],
]) {
  for (const [, verb, route] of read(file).matchAll(/@(Get|Post|Patch|Delete|Put|Head|Options)\("([^"]+)"\)/g)) {
    const method = verb.toLowerCase();
    let routes = [route];
    if (route.includes(":target")) routes = writable.flatMap((d) => [route.replace(":target", d), route.replace(":target", `${d}:validate`)]);
    if (route.includes(":dataset")) routes = (method === "patch" ? writable : pack.datasets.map((d) => d.name)).map((d) => route.replace(":dataset", d));
    for (const expanded of routes) {
      const path = `${prefix}/${expanded.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, "{$1}")}`;
      // The colon in concrete ':validate' is a literal suffix rather than a Nest parameter.
      const key = `${method} ${normalize(path.replace("{validate}", ":validate"))}`;
      assert.ok(documented.has(key), `Undocumented controller route: ${method} ${path}`);
      covered.add(key);
    }
  }
}
for (const key of documented) assert.ok(covered.has(key), `Documented route has no controller: ${key}`);
console.log("Controller HTTP route coverage checked");

const meta = JSON.parse(read("apps/console/content/docs/meta.json"));
for (const slug of meta.pages) {
  const source = read(`apps/console/content/docs/${slug}.mdx`);
  for (const [, target] of source.matchAll(/\]\(\/docs(?:\/([^\s)#]+))?(?:#[^\s)]+)?\)/g)) assert.ok(meta.pages.includes(target || "index"), `Broken docs link: ${slug} -> ${target}`);
  for (const [, target] of source.matchAll(/\]\((\/openapi\/[^\s)]+)\)/g)) read(`apps/console/public${target}`);
}
console.log("Documentation navigation and internal links checked");
