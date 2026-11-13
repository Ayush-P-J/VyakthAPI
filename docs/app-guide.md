# What this app does and how to use it

Hexspare connects a customer's Tally company to another application through a REST API. It reads accounting and stock records, keeps a cloud copy for access while the customer's PC is offline, and queues supported writes for the connector to send to Tally.

Use it when building a reporting dashboard, reconciling payments, importing accounting data, or integrating business software with customer companies. It avoids having every consuming application speak Tally XML/TDL or maintain its own sync loop. A customer still runs the connector beside Tally and approves which company and fields to share.

For example, a collections app can read customer ledgers from synced data, create a receipt after a payment, and mark that payment as posted after receiving `write_job.completed`. A `202` HTTP response only confirms that the write was accepted into the queue.

## The parts of the app

| Part | What it is | When and why you use it |
|---|---|---|
| Developer console | Browser UI on port 3001 locally | Create a project and credentials, connect companies, inspect jobs, deliveries and usage. |
| Public API | REST API on port 3000 locally, under `/v1` | Integrate your backend with the customer's datasets. Authenticate using a project API key. |
| Customer connect page | Public console page at `/connect/<token>` | Let a customer select a company and choose privacy rules without a developer account. |
| Connector | Node.js CLI running beside Tally, normally on the customer's Windows PC | Reach local Tally, sync records, answer live calls and run write jobs. It makes outbound connections to the cloud. |
| Engine | Shared TypeScript package | Maintain parsing, XML templates, privacy, signing and dataset definitions. Integration clients normally do not call it directly. |
| PostgreSQL | Cloud database | Stores projects, connections, approved records, jobs, schemas, sessions, usage and webhook delivery state. |
| Worker | Separate cloud process | Delivers webhooks and retries failed deliveries. It does not execute Tally writes; the connector does. |
| Fake Tally | Simulated Tally server, demo profile only | Try the product and run automated integration tests without a customer PC. |

## Words used in the app

| Word | Meaning |
|---|---|
| Tenant | An organization boundary containing projects and account access. Signup creates the organization and initial project. |
| Project | An integration workspace with its own keys, connections, jobs, webhooks and usage. Use separate projects for separate applications or environments. |
| API key | A secret for your backend to call `/v1`. A key has explicit `read`, `write`, and/or `admin` scopes. Keep it on your server. |
| Installation | One enrolled connector identity, with a device secret stored locally. One installation can serve multiple connections/projects. |
| Connect link | An expiring, single-use invitation for one company connection. Its token is a credential. |
| Connection | One project sharing one company through an installation. Every dataset call names its connection ID. |
| Dataset | A named collection such as `ledgers`, `sales`, or `stock_items`. |
| Record ID | Tally MasterID, represented as a string. IDs belong to the company/dataset context. Keep them as strings. |
| AlterID | Tally's change counter, represented as a string. Used internally for incremental sync. |
| Schema version | Immutable definition of exposed datasets, fields and generated OpenAPI for one connection. |
| Bundle | Signed schema plus executable export templates, trusted and verified by the connector. |
| UDF | A Tally user-defined field. Mapping gives it an API name and a privacy class. |
| Watermark | Connector progress marker used to resume incremental syncing. |
| Write job | Durable request to create or alter a supported record in Tally. |
| Idempotency key | Your business-operation identifier, unique within a project, used to return the same job on retries. |
| Webhook | Signed HTTP event delivered to your backend after an event occurs. |

## First use

1. Start the platform using [Setup and operations](operations.md). For evaluation, use the simulated demo.
2. Open the console and sign up. Signup creates a tenant and initial project. Select that project.
3. Create a key under **API keys**. Copy it immediately; the app shows its full value once.
4. Under **Connections**, create a customer link. Start/enroll the connector with its token, then approve a company on the link page.
5. Wait for the first sync. Open the company status and check `lastSyncAt`.
6. Follow the [quickstart](../apps/console/content/docs/quickstart.mdx) to read ledgers, validate a receipt and inspect its write job.
7. Add a webhook when your integration needs automatic completion or change notifications.

The seeded API key created by the deployment CLI belongs to the seeded tenant/project. Signing up in the console creates a separate organization; a newly signed-up account does not automatically manage seeded projects.

## Choose the right operation

| Need | Use | Why |
|---|---|---|
| Show reports, browse records, import a company's data | Synced `GET /v1/connections/{id}/{dataset}` | Reads the cloud copy and works when the customer's PC is offline. |
| Check the current Tally value | Read with `live=true` | Asks the online connector and Tally directly. Live lists are bounded and may be truncated. |
| Build your own cache | Synced pagination plus `updatedSince` and `includeDeleted=true` | Includes changed records and deletion tombstones. Save cursors/checkpoints durably. |
| Create an accounting entry | `POST` to a writable dataset with `Idempotency-Key` | Queues work even if Tally is temporarily unavailable. |
| Check a write first | `POST .../{dataset}:validate` | Runs preflight against live Tally and posts nothing. It does not guarantee a later job will succeed. |
| Change an existing supported record | `PATCH .../{dataset}/{recordId}` | Queues an alter job. Send the complete write input. |
| React when a job finishes | `write_job.completed` / `write_job.failed` webhooks | Avoids repeatedly polling every pending operation. Polling remains available. |
| Add business-specific values | Discover and map UDFs | Extends a connection schema without rebuilding the connector. |
| Stop access | Revoke the connection | Blocks further data access and rejects unfinished jobs. It does not erase cloud history. |

## Available datasets

All 24 Standard pack datasets support list and single-record reads. Actual exposed fields depend on the active connection schema and privacy policy.

| Group | Datasets | Writes |
|---|---|---|
| Accounting masters | `ledgers`, `ledger_groups`, `cost_centres`, `cost_categories`, `voucher_types` | `ledgers` only |
| Stock masters | `stock_items`, `stock_groups`, `stock_categories`, `godowns`, `units` | None |
| Accounting vouchers | `receipts`, `payments`, `contras`, `journals` | All four |
| Sales and purchase vouchers | `sales`, `purchases`, `credit_notes`, `debit_notes`, `sales_orders`, `purchase_orders` | None |
| Stock movements | `delivery_notes`, `receipt_notes`, `stock_journals`, `physical_stock` | None |

Use each connection's `/schema` response for field names and nested collections. Read records and write inputs have different shapes: for example, a read voucher has `ledgerEntries`, while a voucher write uses `entries` with positive integer `amountPaise` and a `Dr`/`Cr` side.

## Credentials and customer privacy

| Credential | Used by | Grants |
|---|---|---|
| Console session cookie | Signed-in browser | Management access to that user's tenant/project screens. |
| Project API key | Your application backend | The key's explicit public API scopes. `admin` does not imply `read` or `write`. |
| Connect-link token | Customer browser and enrollment command | Access to one invitation and company approval flow. |
| Device secret | Connector | Access to that installation's connector protocol. |
| Webhook secret | Your webhook receiver | Signature verification of incoming events. |
| Signing public key | Connector | Verification of trusted cloud bundles, jobs and probes. |

Field privacy classes are **public** (share the value), **masked** (strings longer than four characters retain the last four; short strings become `****`; non-strings become `null`), and **excluded** (omit the field). The connector applies privacy before uploading records. Raw Tally response XML is not stored in the cloud record table. Discovery samples are masked before upload.

## Current limitations

- Tests demonstrate behavior against Fake Tally. The real TallyPrime verification checklist remains open; use a dedicated test company before considering live books.
- Requested `read`/`write` scopes on a connect link are displayed, but the current connection model/runtime does not enforce them as customer-level write consent. The connector verifies the signed job's `scope: write`; the public API checks the API key's write scope. Do not rely on a read-only invitation to block writes by a write-capable project key.
- The connector is a headless CLI. There is no packaged Windows installer, system-service installer or desktop consent UI in this repository.
- Signup has no email verification, password reset or invitation flow. Disable open signup on a public deployment once required accounts exist.
- The API must run as a single replica because live WebSocket channels are held in process memory. Webhook workers can run multiple copies.
- Writes support only five datasets. There is no record deletion endpoint or job cancellation endpoint, and a PATCH is a full input replacement.
- `202` and `Idempotent-Replay` do not prove exactly-once posting in real Tally. Duplicate protection depends on local durable state, lookup behavior and Tally's import behavior.
- A queued/ambiguous job may wait without a fixed expiry while Tally is unavailable. Losing a connector's SQLite state can affect recovery guarantees.
- Deletion reconciliation holds unusually large removals for inspection. There is no API to release a deletion hold.
- Schema rollback changes the active definition; it does not undo posted vouchers or historical data.
- Prices are placeholders and no payments are collected. Weighted usage is recorded for implemented metered operations.
