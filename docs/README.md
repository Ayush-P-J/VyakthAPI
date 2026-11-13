# Application documentation

This documentation describes the code in this repository. The product is named **Hexspare Tally API Platform** in the application; the repository directory is `vyakthAPI`. The [PRD](../Tally%20API%20Platform%20—%20PRD.md) describes product intent; implemented behavior and known gaps are described here.

## Read by task

| What you need | Start here |
|---|---|
| Understand what the app is and why to use it | [Application guide](app-guide.md) |
| Run the app or the simulated demo | [Setup and operations](operations.md) |
| Use the console screens | [Console guide](../apps/console/content/docs/console-guide.mdx) |
| Make your first API request | [Quickstart](../apps/console/content/docs/quickstart.mdx) |
| Connect a customer's company | [Customer connection](../apps/console/content/docs/connect-a-customer.mdx) |
| Choose synced or live reads | [Reading data](../apps/console/content/docs/read-data.mdx) |
| Create or alter ledgers and vouchers | [Writing to Tally](../apps/console/content/docs/write-to-tally.mdx) |
| Map a custom field | [Custom fields](../apps/console/content/docs/custom-fields.mdx) |
| Receive and recover events | [Webhooks](../apps/console/content/docs/webhooks.mdx) |
| Import the API into Postman or an OpenAPI tool | [OpenAPI reference](openapi/README.md) |
| Diagnose a problem | [Troubleshooting](../apps/console/content/docs/troubleshooting.mdx) |
| Maintain or extend the code | [Architecture](architecture.md), [build decisions](adr/0002-build-decisions.md) |

The `.mdx` guides above are also rendered in the console at `/docs`, without signing in. Downloadable API contracts are served by the console at `/openapi/public.openapi.json`, `/openapi/connector.openapi.json`, and `/openapi/console.openapi.json`.

## Current readiness

The repository tests use simulated Tally. Real TallyPrime validation of this pipeline, duplicate prevention, discovery and custom-field writes is still pending; see the [verification list](../README.md#what-must-be-done-on-a-real-tally). Use demo data or a dedicated test company for evaluation.

There is no connector installer or desktop UI in this repository: the runnable connector is a Node.js CLI. There is no billing collection, email verification or password reset. Requested connection scopes are displayed during onboarding but are not enforced as connection-level write permission. API-key scopes and field privacy controls are implemented. See [current limitations](app-guide.md#current-limitations).

## Keeping documentation current

After changing dataset definitions, request bodies, routes or responses:

```sh
pnpm docs:generate
pnpm docs:check
```

The generator updates the public and connector contracts and their console downloads. The console contract remains authored at `apps/console/openapi/console.openapi.json`; regenerate console client types with `pnpm --filter @hexspare/console types:api` after editing it. The [OpenAPI guide](openapi/README.md) explains which contract to use and how existing connection bundles behave.
