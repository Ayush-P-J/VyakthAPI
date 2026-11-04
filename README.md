# Hexspare Tally API Platform

Connect a customer's Tally once, then read and write its data, custom fields included, through REST and webhooks. Start with [the PRD](./Tally%20API%20Platform%20—%20PRD.md); decisions made while building are in [ADR-2](docs/adr/0002-build-decisions.md).

| Part | Where | Runs |
|---|---|---|
| Engine: definitions, templates, parser, guards, signing | `packages/engine` | Inside the cloud and the connector |
| Cloud: public API, connector API, console API, connect page, webhooks | `apps/cloud` | Docker |
| Developer console (Next.js) | `apps/console` | Docker |
| Connector runtime: sync, live channel, write jobs | `apps/connector` | The customer's Windows PC |
| Simulated Tally, for tests and the demo | `packages/fake-tally` | Docker (demo only) |

## Deploy

You need Docker with Compose.

```sh
./scripts/setup.sh https://api.example.com https://console.example.com   # builds images, writes .env with fresh secrets
docker compose --profile tls up -d             # Postgres, migrations, API, worker, console, HTTPS
docker compose run --rm api seed "Acme" "Acme app"   # prints your first API key, once
```

Point both domains' DNS at the server and open ports 80 and 443 first; the certificate is automatic. **Back up `.env`.** Losing `SIGNING_PRIVATE_KEY` or `SECRETS_KEY` locks out connectors and webhooks. To upgrade, run `git pull && docker compose --profile tls up -d --build`; migrations run by themselves.

Every connector must trust your signing public key: give it `SIGNING_KID` and `SIGNING_PUBLIC_KEY` from `.env`.

## Developer console

Open http://localhost:3001 locally, or your console domain, and create an account. Today it covers signup, sign-in and a project overview; API keys and connect links still use the API.

New accounts are open by default. **Set `ALLOW_SIGNUP=false` in `.env` before exposing a server publicly**, because there is no email verification or password reset yet. `CONSOLE_URL` must exactly match the address in the browser, or sign-in is refused as coming from another site.

## Try it locally, with no Windows PC

```sh
./scripts/setup.sh
docker compose up -d
```

Open the console at <http://localhost:3001> and create an account. Under **API keys**, create a key and set it as `$KEY`. Under **Connections**, choose **Connect a customer** and copy the link. The token is the part after `/connect/`. Then:

```sh
CONNECT_LINK_TOKEN=<token> docker compose --profile demo up -d
```

Open the link, choose what to share, and connect. The company then appears under **Connections** with its live status. Then:

```sh
curl localhost:3000/v1/connections -H "authorization: Bearer $KEY"
curl localhost:3000/v1/connections/$ID/ledgers -H "authorization: Bearer $KEY"
curl -X POST localhost:3000/v1/connections/$ID/receipts -H "authorization: Bearer $KEY" \
  -H 'idempotency-key: order-1042' -H 'content-type: application/json' \
  -d '{"date":"2026-11-03","entries":[{"ledger":"HDFC Bank","side":"Dr","amountPaise":25000000},{"ledger":"A-1203 Customer","side":"Cr","amountPaise":25000000}]}'
```

The demo's Tally is simulated, and any result from it says nothing about a real TallyPrime.

## Develop

```sh
pnpm install
pnpm db:dev      # Postgres on localhost:55432
pnpm test
pnpm typecheck
pnpm generate    # rebuilds the Standard pack from vyakth-connector/dist

pnpm --filter @hexspare/console dev         # console on :3001, needs the API on :3000
pnpm --filter @hexspare/console types:api   # regenerates API types after changing openapi/console.openapi.json
pnpm --filter @hexspare/console smoke       # browser test against a running console and API, using local Chrome
```

The generated pack is committed, so the cloud build never needs the connector's code. The Step 0 gate runs only where `vyakth-connector/` is present.

## API

Everything is under `/v1` with `Authorization: Bearer <key>`. Each connection has an OpenAPI document at `GET /v1/connections/{id}/schema`.

| Method and path | Does | Scope |
|---|---|---|
| `POST /connect-links` | Link for a customer to connect their Tally | admin |
| `GET /connections`, `GET /connections/{id}` | Connector, Tally and sync status | read |
| `DELETE /connections/{id}` | Revoke | admin |
| `GET /connections/{id}/schema` | Datasets, fields, OpenAPI | read |
| `POST /connections/{id}/schema/fields` | Map a custom field; publishes a new version | admin |
| `POST /connections/{id}/schema/rollback` | Re-pin an earlier version | admin |
| `GET /connections/{id}/discovery` | Custom fields found in Tally (live) | read |
| `GET /connections/{id}/{dataset}` | List: `cursor`, `limit`, `updatedSince`, `fields`, `includeDeleted`; `live=true` with `from`, `to` | read |
| `GET /connections/{id}/{dataset}/{recordId}` | One record; `live=true` to ask Tally now | read |
| `POST /connections/{id}/{dataset}` | Create, as a write job. Needs `Idempotency-Key` | write |
| `PATCH /connections/{id}/{dataset}/{recordId}` | Alter, as a write job. Send the complete record | write |
| `POST /connections/{id}/{dataset}:validate` | Dry run against live Tally | write |
| `GET /write-jobs/{id}` | Job status and errors in plain words | read |
| `POST /webhooks`, `GET /webhooks` | Subscribe | admin, read |
| `GET /webhooks/{id}/events`, `POST /webhooks/{id}/replay` | Read or resend from a cursor | read, admin |
| `GET /usage` | Calls and weighted usage per connection | read |

Writable today: `receipts`, `payments`, `contras`, `journals`, `ledgers`. Webhooks carry `X-Hexspare-Signature: t=<unix>,v1=<hmac-sha256 of "t.body">`.

## What must be done on a real Tally

None of this can be settled without a real TallyPrime. Until it is, do not post to a customer's live books.

1. **`REMOTEID`:** post one voucher twice with one `REMOTEID`. Is the result one voucher?
2. **Voucher lookup:** can `$GUID` or `$RemoteID` find a voucher by the `REMOTEID` it was imported with? See `compileVoucherLookup`.
3. **Custom-field write:** does Tally keep a UDF value when the TDL defining it is not loaded?
4. **Discovery request:** does `NATIVEMETHOD *` on a filtered collection return `UDF:*.LIST` tags? See `compileNativeSample`.
5. **Preflight reports:** does `$NumberingMethod` on `VoucherType` read as expected?
6. **Import response:** compare real responses and error text with `parseImportResult` and `explainTallyError`.
7. **Restored backups:** do AlterIDs reset after a restore?

Export requests for the Standard pack come from the connector's verified builders, but this pipeline has never been run against a real Tally either.
