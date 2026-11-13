# OpenAPI contracts

All contracts use OpenAPI 3.1.0 and can be imported as files into Postman or compatible tooling. They document the implemented APIs; TallyPrime compatibility still requires the repository's real-company verification checks.

| File | Scope | Server/path rules |
|---|---|---|
| [public.openapi.json](public.openapi.json) | Public management endpoints plus all 24 Standard pack datasets and five writable datasets | Server is the API origin; paths include `/v1`. Project Bearer API key, except public health checks. |
| [connector.openapi.json](connector.openapi.json) | Connector HTTP protocol and customer connect actions | Server is the API origin; paths include `/connector/v1` or `/connect`. Use device secret or link token as documented. |
| [console.openapi.json](../../apps/console/openapi/console.openapi.json) | Console sessions, projects, keys, links, jobs, webhooks and usage | Use console origin + `/console-api`, or API origin + `/console/v1`. Auth uses `hx_session`, not API keys. |

Browser downloads are also available on the console at `/openapi/public.openapi.json`, `/openapi/connector.openapi.json` and `/openapi/console.openapi.json`.

## Quick import

Import the public JSON in Postman, choose or replace the server URL, set Bearer authentication to your project API key, and start with `GET /v1/connections`. Replace path parameters with IDs from that project. Each operation's `x-required-scope` gives the exact scope (`read`, `write`, `admin`); these scopes do not imply one another.

Writable operations describe `LedgerInput`/`VoucherInput`. Supply the complete input for both create and PATCH; the normalized read record is a different shape. Add `Idempotency-Key` to create and PATCH requests. Validation does not require that header. A 202 response describes a queued job, not proof of posting.

## Connection-specific documents

`GET /v1/connections/{id}/schema` returns `{version,bundleHash,datasets,openapi}`. Extract the `openapi` property before importing it. See the [download example](../../apps/console/content/docs/openapi.mdx). This document models actual custom fields/privacy for the saved schema version, and only its dataset endpoints. The full static public contract also covers management endpoints.

New publications use `packages/engine/src/openapi.ts`. Existing bundles remain immutable in PostgreSQL: a software upgrade does not replace their embedded OpenAPI. Re-publication through a real field mapping creates a new version; rollback re-pins the old document. There is no documentation-only republish endpoint.

## Maintenance and validation

```sh
pnpm docs:generate
pnpm docs:check
pnpm --filter @hexspare/console types:api
```

`scripts/generate-openapi.ts` derives dataset record schemas from the committed Standard pack and write-input schemas from the engine's Zod validators. It adds the public management routes and connector/connect HTTP contracts. It emits committed reference files and downloadable copies in `apps/console/public/openapi`.

Management/device request and response declarations must be reviewed alongside controller/platform changes. `docs:check` verifies generated files are current, local references resolve, path parameters are declared, operation IDs are unique, and controller route coverage is maintained. It does not prove runtime conformance or Tally compatibility. The console's existing HTTP tests additionally compare its response shapes with the console contract.

The console contract is authored separately at `apps/console/openapi/console.openapi.json` because it also generates browser client types. After editing it, regenerate both types and downloadable copies. OpenAPI covers HTTP; the device WebSocket is described in [architecture.md](../architecture.md#websocket-protocol).
