# Setup and operations

## Choose a way to run

| Mode | Use it for | Requirements |
|---|---|---|
| Docker with Fake Tally | First exploration and reproducible demonstrations | Docker with Compose; no Windows PC or real company required |
| Docker cloud plus a real connector | A pilot with a dedicated Tally test company | Cloud host, connector PC with Node.js, Tally's local HTTP interface |
| Source development | Changing code and running tests | Node.js 24 recommended (Docker uses 24), pnpm 11.9.0, Docker for development PostgreSQL |

The root package declares Node `>=22.13`; the connector uses `node:sqlite`. Use the Docker-matched Node 24 runtime for the documented source workflow.

## Local Docker demo

From the repository root:

```sh
./scripts/setup.sh
docker compose up -d
docker compose ps
```

The setup script builds images and creates `.env` only if it does not exist. If `.env` already exists, its URLs and secrets are preserved: review its `PUBLIC_URL` and `CONSOLE_URL` privately before proceeding. Do not copy secrets into logs or documentation.

1. Open `http://localhost:3001` and create an account. Signup requires a password of at least 10 characters.
2. In the initial project, create an API key. Create a customer link under **Connections**.
3. The link ends in `/connect/cl_...`. Copy that complete `cl_...` token and start the demo connector:

```sh
CONNECT_LINK_TOKEN='cl_replace_with_your_token' docker compose --profile demo up -d
```

4. Return to the link page, select the simulated company and approve the privacy choices.
5. Check **Connections** until the connector is online and data has synced. The demo interval is 15 seconds.

```sh
export API='http://localhost:3000'
export KEY='replace_with_the_key_you_saved'
curl "$API/v1/connections" -H "Authorization: Bearer $KEY"
export ID='replace_with_connection_uuid'
curl "$API/v1/connections/$ID/ledgers?limit=10" -H "Authorization: Bearer $KEY"
```

The demo's persistent connector enrolls from `CONNECT_LINK_TOKEN` only when it has no device secret. Changing this variable later does not automatically enroll an existing connector into another link; run its `connect` command explicitly. Fake Tally tests do not establish compatibility with real TallyPrime.

## Cloud deployment

Point the API and console domains at your server and allow ports 80/443 for Caddy. On a first setup:

```sh
./scripts/setup.sh https://api.example.com https://console.example.com
docker compose --profile tls up -d
```

For an existing `.env`, edit the URLs and `DOMAIN`/`CONSOLE_DOMAIN` yourself; setup preserves existing settings. Create the required console account(s), then set `ALLOW_SIGNUP=false` in `.env` and recreate services with `docker compose --profile tls up -d` before allowing general public access.

The console URL must match the browser origin exactly, including scheme, host and port. Customer links are generated from `CONSOLE_URL`. The connector's `CLOUD_URL` is the API origin, without `/v1` or `/connector/v1`.

For an API-only bootstrap, the optional command below creates a separate tenant/project and prints one full-access key once. It does not create a console login and is not idempotent: each invocation creates another tenant/project/key.

```sh
docker compose run --rm api seed "Acme" "Acme integration"
```

Keep one API replica. Multiple webhook worker instances are supported. The reverse proxy must forward WebSocket upgrades for `/connector/v1/channel`.

## Run the connector beside Tally

This repository supplies a headless CLI for pilots. It does not supply a Windows installer or background service. Use an installed Node 24 runtime, this repository and installed workspace dependencies on the connector PC. Configure Tally to serve its local HTTP interface on the chosen host/port and open the test company.

Set the following environment variables in the terminal that launches the connector. The public key is the **base64-encoded PEM** value generated in the cloud `.env`; never distribute the private key.

Example in PowerShell, from the repository root:

```powershell
$env:CLOUD_URL = 'https://api.example.com'
$env:TALLY_HOST = '127.0.0.1'
$env:TALLY_PORT = '9000'
$env:CONNECTOR_DB = 'C:\Hexspare\data\connector.sqlite'
$env:TRUSTED_SIGNING_KEYS = 'replace_kid=replace_base64_public_pem'
pnpm --filter @hexspare/connector cli connect 'cl_replace_with_link_token'
```

Approve the company in the customer's browser, then keep this process running:

```powershell
pnpm --filter @hexspare/connector cli run
```

To enroll the same installation into another project link, use `cli connect` again with the same `CONNECTOR_DB`. To revoke a connection:

```powershell
pnpm --filter @hexspare/connector cli revoke 'replace_connection_uuid'
```

Stop with Ctrl+C. Tally remains the source of truth. Retain the SQLite database and its WAL state; they contain the device identity, approved policy, sync outbox and write recovery history.

## Configuration reference

Cloud values below are read by `apps/cloud/src/config.ts`; Compose supplies the primary values. Optional direct-process settings such as `LIVE_TIMEOUT_MS` and `ALLOW_PRIVATE_WEBHOOKS` require an explicit Compose environment entry/override if used in Docker. Adding them only to `.env` does not automatically pass them to the container.

| Variable | Required/default | Purpose |
|---|---|---|
| `DATABASE_URL` | Required by cloud processes; composed automatically in Docker | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | Generated by setup | Docker database credentials |
| `PUBLIC_URL` | Required | Externally reachable API origin |
| `CONSOLE_URL` | `http://localhost:3001` | Browser origin, connect links, cookie security and origin checks |
| `ALLOW_SIGNUP` | Allowed unless exactly `false` | Whether new console organizations can sign up |
| `SECRETS_KEY` | Required; base64 of 32 random bytes | AES-GCM encryption key for stored webhook secrets |
| `SIGNING_KID` | Required | Active signing key identifier |
| `SIGNING_PRIVATE_KEY` | Required; base64 PEM | Ed25519 cloud signing key |
| `SIGNING_PUBLIC_KEY` | Generated by setup | Public verification key distributed to connectors |
| `PORT` | `3000` | Cloud process listening port |
| `LIVE_TIMEOUT_MS` | `25000` | Default live request timeout; discovery uses 120 seconds |
| `ALLOW_PRIVATE_WEBHOOKS` | `false` | Allows HTTP/private-network webhook targets for local development |
| `MIGRATIONS_DIR` | Docker sets `/app/db/migrations`; set an absolute path for source runs | SQL migration directory |
| `API_INTERNAL_URL` | `http://localhost:3000` in source; Docker build arg is `http://api:3000` | Console proxy destination, baked into Next.js at build time |
| `API_PORT`, `CONSOLE_PORT` | `3000`, `3001` | Host ports, bound to localhost by Docker Compose |
| `DOMAIN`, `CONSOLE_DOMAIN` | Derived by setup for HTTPS URLs | Caddy hostnames |
| `IMAGE_TAG` | `latest` | Compose image tag |

Connector CLI configuration:

| Variable | Required/default | Purpose |
|---|---|---|
| `CLOUD_URL` | Required | Cloud API origin |
| `TRUSTED_SIGNING_KEYS` | Required | `kid=base64PublicPem`; separate multiple trusted keys with `;` |
| `TALLY_HOST`, `TALLY_PORT` | `127.0.0.1`, `9000` | Local Tally interface |
| `CONNECTOR_DB` | `./.connector-data/connector.sqlite`; demo uses `/data/connector.sqlite` | Durable installation and recovery state |
| `SYNC_INTERVAL_MS` | `60000`; demo overrides to `15000` | Sync and job polling interval |
| `CONNECT_LINK_TOKEN` | Optional | Automatic first enrollment on `run` if no device secret exists |
| `ALLOW_INSECURE_CLOUD` | `false` | Permit remote plain HTTP for the Docker demo; loopback HTTP is already allowed |

## Develop from source

```sh
pnpm install
pnpm db:dev
pnpm test
pnpm typecheck
pnpm docs:generate
pnpm docs:check
```

The development PostgreSQL uses port 55432, database `tally_platform`, user `hexspare` and password `hexspare_dev`. It stores data on a temporary filesystem and is intended for disposable tests.

To run source services, load private cloud environment settings in your shell, set `DATABASE_URL` to the development database and `MIGRATIONS_DIR` to the absolute path of this repository's `db/migrations`, and ensure the URLs match local ports. Source start commands do not load `.env` automatically. Then use separate terminals:

```sh
pnpm --filter @hexspare/cloud migrate
pnpm --filter @hexspare/cloud start
pnpm --filter @hexspare/cloud worker
pnpm --filter @hexspare/console dev
```

Use `pnpm build` for cloud/connector/demo bundles, `pnpm --filter @hexspare/console build` for the console, and `pnpm --filter @hexspare/console smoke` for the browser smoke test against running services. `pnpm generate` rebuilds the Standard pack from the legacy `vyakth-connector/dist` builders; it is separate from `pnpm docs:generate`.

## Monitor and troubleshoot

```sh
docker compose ps
docker compose logs --tail=100 api worker console
docker compose --profile demo logs --tail=100 connector
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

`/healthz` confirms the API process responds. `/readyz` additionally queries PostgreSQL; it does not test connector or Tally availability. Use each connection's status, `lastSyncAt`, jobs and delivery logs for those checks. Normal JSON requests are limited to 1 MB; authenticated `/connector/v1/connections` ingestion requests allow up to 100 MB. The API accepts WebSocket messages up to 32 MB; the connector accepts up to 16 MB.

## Backups, upgrades and recovery

Back up PostgreSQL, the cloud `.env` (especially signing and encryption keys), and each connector's SQLite state. For SQLite, stop the connector for a filesystem backup and preserve associated WAL files, or use a consistent SQLite backup mechanism. A database dump alone cannot restore webhook secrets without `SECRETS_KEY`. Connectors must continue to trust the cloud's signing key after recovery.

Before upgrades, take a consistent database backup and preserve the matching source/image version. After pulling the reviewed version, run `docker compose --profile tls up -d --build`. The migration service applies numbered SQL files automatically. There is no documented automatic down-migration flow; restore a compatible database backup for a database rollback. `docker compose down` stops services; deleting named volumes removes persisted state.

Key rotation is a coordinated operator task: distribute both old and new public keys to connectors before changing the active cloud signing key, and retain trust in old keys while old signed bundles/jobs remain in use. There is no automated rotation flow. Do not regenerate secrets as a troubleshooting step.
