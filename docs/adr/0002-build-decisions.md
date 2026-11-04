# ADR-2: Decisions made while building, and where the code departs from the documents

**Status:** Proposed. **Date:** 3 Nov 2026. **Deciders:** Founder, engineering lead, TDL developer.
**Builds on:** [ADR-1: Engine architecture](https://claude.ai/artifact/4T47Qck4tghE6EeBVq75Sr), which still stands.

## Context

The PRD, spec, ADR-1 and implementation guide were written before the connector code and the schema were read side by side. Building against them surfaced conflicts. Each is recorded here with what was done, so anyone can reverse it.

## Decisions

### 1. The compiler produces the connector's report shape, not the guide's collection shape
The implementation guide shows `COLLECTION` + `FETCH`/`COMPUTE`. The connector's builders use `REPORT/FORM/PART/LINE/FIELD`, verified against a live TallyPrime. Their comments record measurements a from-scratch design would lose, such as `$$Date` filters failing silently and `SVFromDate` not scoping a voucher collection. So templates are generated from the builders themselves, and a custom field becomes one more `FIELD`.

**Trade-off:** templates are larger (the Standard pack is about 750 KB) and less readable than the guide's example, in exchange for keeping every verified behaviour.

### 2. Step 0 compares canonical XML, not exact text
The build plan asks for identical text. The gate compares after collapsing whitespace and sorting TDL objects by name, because Tally resolves those objects by name. All 46 request builders pass, across every option combination. `outstandingContext` is skipped because it returns a fragment, not a request.

**To revisit:** the claim that object order does not matter is reasoning, not a measurement. Compare one recorded response from each form on a real Tally.

### 3. No raw responses go to the cloud (departs from ADR-1, decision 4)
ADR-1 uploads the raw response beside normalised records. A raw response contains every field in it before masking, which breaks the PRD's promise that sensitive KYC data never leaves the PC. `record.raw` stays NULL in v1. Support replays by re-reading from Tally. Revisit only with raw redaction on the connector.

### 4. Discovery samples are masked
The spec returns sample values, and the schema's comment says "real values". Discovery runs before the customer has approved a field, so a PAN in a UDF would reach the cloud unapproved. Samples keep only the last 4 characters. This makes mapping slightly harder.

### 5. Schema changes (migration 002; the supplied file is unchanged as 001)
| Concept schema | Problem | Change |
|---|---|---|
| `installation.tenant_id NOT NULL` | R1: one install serves many developers' projects | Nullable: an installation belongs to the customer's PC |
| `UNIQUE (installation_id, tally_company_guid)` | Blocks two projects sharing one company | Includes `project_id` |
| `connect_link.token`, `webhook_endpoint.secret` | Plaintext secrets at rest | Same columns: SHA-256 and AES-256-GCM |
| `schema_version` | Nowhere to hold the signed bundle | Adds `envelope`, `bundle_hash` |
| `write_job` | No ordering or signed payload | Adds `priority`, `seq`, `envelope`, `payload_hash`, `remote_id` |

### 6. Writes look before they post, on top of REMOTEID
The guide relies on Tally altering the voucher when a `REMOTEID` repeats, which is untested, and an alter on retry could also overwrite a user's later edit. So the connector records `posting` durably, then on every attempt looks up the voucher first. A duplicate now needs both assumptions to fail together. `e2e.test.ts` contains a test that shows that one unsafe combination on purpose.

### 7. Deletions are never applied on weak evidence
An empty key list is ignored. A failed response raises an error rather than reading as empty. Removing more than 20% of a dataset (and at least 10 records) is held as a `sync_issue` for an operator. The thresholds are guesses to review with real data. There is no API yet to release a held deletion.

### 8. One API replica in v1
Live channels are held in the API process, which keeps deployment to one `docker compose up`. Scaling out needs channel routing (Postgres `LISTEN/NOTIFY` or Redis). The worker can already run several copies.

### 9. Deployment: everything on the cloud side in one image
A single image runs `serve`, `worker`, `migrate`, `seed` and `keygen`, using an esbuild bundle with no `node_modules`. It runs as non-root on a read-only filesystem. Caddy provides HTTPS because the connector refuses plain HTTP to a remote backend. **The connector cannot be containerised:** it must run beside Tally on the customer's Windows PC.

### 10. The console is Next.js, and NestJS stays the backend
`apps/console` holds screens only. All business logic stays in NestJS, because it holds long-lived connector channels that do not suit Next.js. The browser talks only to the console's origin, and `/console-api/*` forwards to `/console/v1/*` and nothing else. Accounts use `app_user` with scrypt passwords and a server-side session behind an `httpOnly` cookie, so there is no separate auth service. The console's API types are generated from `apps/console/openapi/console.openapi.json`, and a test compares that file with real API responses. The console package stays on TypeScript 5 because `openapi-typescript` needs the compiler API that TypeScript 7 removed.

Failed logins are limited per email and address, per address, and per email alone. **Trade-off:** the per-email limit lets an attacker lock one account out for up to 15 minutes, which is accepted over allowing unlimited guessing. Limits are held in memory, like live channels, so they reset on restart. There is no email verification or password reset yet because no email provider is chosen. Set `ALLOW_SIGNUP=false` to close signup before those exist.

## Consequences

- **Easier:** adding a UDF needs no connector rebuild. A deployment is one command. Most write-safety logic is testable without Tally.
- **Harder:** bundles are large. Signing keys in `.env` must be backed up, and losing them locks out every connector.
- **Open:** see "What must be done on a real Tally" in the README.
