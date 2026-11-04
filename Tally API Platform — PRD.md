# Tally API Platform — PRD

Nov 3, 2026 · @Hexspare Global

## Overview

**A Tally API for developers: connect any customer's Tally once, then read and write its data — custom fields included — through plain REST and webhooks, with no XML or TDL.**

Tally runs India's small businesses but has no cloud API. Every team that needs Tally data rebuilds the same plumbing: hand-written requests, a sync agent, and mapping code. This platform turns that one-off work into a product. Developers pay per connected company; Hexspare is the first customer, through Vyakth and Shanoor.

**Status:** approved concept, entering build. The connector already exists (it is the Vyakth connector); the cloud API, configurable schemas, write path and developer onboarding are the work ahead.

**Who this is for:** the Hexspare team building it. It is the single entry point; the spec, architecture, build plan, schema and API collection hold the detail and are linked at the end.

## Background and why now

Tally exposes data only as XML (and, from TallyPrime 7.0, JSON) over a local port, described by TDL. So every integration repeats three jobs: write the requests, build a sync agent, and map the data into the app. Only the client's custom fields and business meaning change between projects.

The Shanoor project showed the cost: the Tally connector was 69 of 588 planned hours, the hand-written requests carried defects found only on review, and the client's custom fields (apartment, payment schedule, stage) were found only by reading 273 KB of request XML by hand. The next similar client would repeat all of it.

**Why now: the connector already exists.** Hexspare built a cloud sync connector for Vyakth. Reading its code confirmed it already does AlterID incremental sync, voucher and master batching, deleted-record detection, a durable upload queue, and licensing by Tally serial — and it encodes hard-won Tally knowledge (one request at a time; `$$Date` filters fail silently; `SVFromDate` does not scope a voucher collection). That connector is the platform's agent. The missing pieces are configurable requests, custom-field discovery, a write path, a live channel, and the developer-facing API and console. Building now means productising an asset that already runs in the field, not starting from zero.

## Goals and non-goals

### Goals

1. A developer reads a customer's Tally in under an hour, with no TDL written.
2. Any custom field is reachable without code — discovered, then mapped.
3. Writes are safe: a retry never duplicates a voucher, and a rejection returns Tally's reason in plain terms.
4. One connector serves Vyakth, Shanoor and external developers.
5. A TDL developer moves data between two Tally companies through the API, with no CRUD code.

### Non-goals (v1)

| Not doing | Why |
| --- | --- |
| A unified schema across other accounting systems | Unified.to and RootFi sell that; the edge here is depth in Tally |
| Tally.ERP 9 | TallyPrime only, to keep the test matrix small |
| Installing TDL inside the customer's Tally | Everything goes through requests from the connector |
| Deleting or cancelling vouchers through the API | Highest-risk write; add after create and alter are proven |
| A no-code workflow builder or marketplace | Developers and TDL developers first; recipes cover common flows |

## Success metrics

Targets are hypotheses; review after the first 5 external developers go live.

| Metric | Target | Measured by |
| --- | --- | --- |
| Time from signup to first API call on a real connection | ≤ 1 hour | Console events |
| Connect-flow completion by customers | ≥ 80% of started links | Link and connection events |
| Write jobs that create a duplicate | 0 | Idempotency log audits |
| Write jobs failing for platform reasons (not Tally data errors) | ≤ 1% | Job results by error class |
| Connector effort on Hexspare client projects | ≤ 20 h, down from 69 h on Shanoor | Timesheets |
| External projects with ≥ 1 paid connection | 10 within 6 months of launch | Billing |
| Connections using at least one custom field | ≥ 30% | Schema versions |

The last metric tests the core bet: if most connections never use a custom field, the edge over unified APIs is smaller than assumed.

## Users and personas

Three parties, and the one who pays is not the one who installs. This split shapes the whole product.

&#91;embedded content: the three parties and how they relate\]

- **App developer (the buyer).** Builds a mobile or web app that needs Tally data — like the Shanoor app. Wants to read and write through REST without learning TDL, and pays per connected company. The main customer.
- **TDL developer.** A Tally specialist, in-house or a partner. Moves data between companies and writes the odd TDL expression. Uses raw requests and recipes; his knowledge goes into the shared definitions instead of per-project code.
- **The customer (the business).** Runs TallyPrime. Installs the connector from a link the developer sends, picks a company, and approves which fields are shared. Never writes code.
- **Hexspare operations.** Watches every connection's health, recovers failing clients, and keeps connectors updated.

## Scope and the connect experience

**What a developer does:** signs up, creates a project, gets API keys, and sends a connect link to each customer. Once connected, they read datasets, subscribe to webhooks, and post writes — all through REST, against a schema that includes the customer's custom fields.

**What a customer does:** opens the connect link, installs the connector, picks their Tally company, and approves which fields are shared (some marked masked or excluded so sensitive KYC data never leaves their PC). Then they carry on using Tally as normal.

**The connect flow, step by step:**

1. Developer calls `POST /connect-links` and sends the customer the link.
2. Customer installs the connector and signs in through the link.
3. Customer picks a company and approves the requested fields.
4. The developer receives a connection ID, by redirect and webhook, and can start calling the API.

**Two read modes:** *synced* reads come from the cloud copy and always work, even with the customer's PC off; *live* reads and all writes go through the connector to Tally and only work while Tally is open. Every response carries the connection's freshness and status, so a developer's app can tell the difference.

## Functional requirements

Summarised here; the [spec (v2)](https://claude.ai/artifact/BtnCzArZirttwm8Y6takwa) holds each with acceptance criteria.

### P0 — must ship

| # | Requirement |
| --- | --- |
| R1 | Connector runs versioned definitions, holds a live outbound channel, queues writes, enforces field privacy |
| R2 | Connect flow: link, install, company picker, consent screen, connection ID returned |
| R3 | Standard pack and versioned schemas, with a generated OpenAPI document |
| R4 | Custom-field discovery; a mapped UDF appears in the API on the next schema version |
| R5 | Synced reads: AlterID sync, deletion reconciliation, cursor paging, `updatedSince` |
| R6 | Live reads through the connector channel, with a timeout and record limit |
| R7 | Write jobs (create and alter): JSON in, idempotency key = REMOTEID, references validated, Tally errors in plain terms, every write logged |
| R8 | Signed, replayable webhooks; API keys scoped by project, connection, read/write/raw |
| R9 | Metering: every call and write job counted per project and connection |

### P1 — fast follow

Raw TDL requests for TDL developers; Tally-to-Tally recipes; developer console with live preview and logs; vertical packs starting with real estate from Shanoor.

### P2 — design for, don't build

Delete and cancel behind approval; several companies per connector; TallyPrime 7.0 native JSON transport; partner reselling and white-labelled connect flows.

## System overview

The full design is in the [architecture decision record](https://claude.ai/artifact/4T47Qck4tghE6EeBVq75Sr). In brief:

- **One engine library** (`@hexspare/tally-engine`, TypeScript) holds the definition model, the compiler (definition to TDL), the parser/normaliser, and the discovery parser. Built mostly from the connector's existing code. The connector and the cloud both use it.
- **The connector** is the existing Vyakth exe, extended: it runs signed configuration bundles, never compiles TDL itself, holds the live channel, and runs write jobs.
- **The cloud** stays separate for two callers: the connector API (sync, licensing, live channel) and the public API (developer keys). It holds the generic record store, the write-job queue, metering and webhooks.
- **The database** (PostgreSQL schema, delivered as a file) is tenant-scoped from day one, with records stored as JSON so a new field never needs a migration.
- **Writes are jobs, not bundles:** a write is compiled in the cloud, signed as a single-use job with an idempotency key, and run once by the connector. Configuration bundles stay export-only, a guarantee checked at compile and again on the connector.

## Release plan

Four stages, each gated on a test. The [build plan](https://claude.ai/artifact/PEZG4xMFuRHss55FKyqUGA) has the task-level detail.

| Stage | Ships | Gate |
| --- | --- | --- |
| Step 0 — Engine | The engine library, built from existing connector code | All 37 builders round-trip through a definition to identical XML |
| Phase 1 — Read API | Configurable reads, discovery, generic store, public read API | Shanoor reads all its data, custom fields included, through the API |
| Phase 2 — Write + connect | Live channel, write jobs, connect flow, metering | Shanoor posts receipts with zero duplicates over 30 days |
| Phase 3 — Developer product | Console, sandbox, docs, SDK, pricing | 5 outside developers with a live, paid connection |

Shanoor is the first customer of each stage; nothing ships to outsiders until a real app has run on it. Phase 4 (vertical packs, partner reselling, native JSON) follows once Phase 3 proves the model.

## Dependencies, risks and open decisions

**Key risks**

- **Duplicate or wrong postings** damage a customer's books and Hexspare's name. Mitigation: required idempotency keys, dry-run validation, write scopes, a full write log, no delete in v1.
- **Tally is a desktop app**, so live calls and writes fail when the PC is off. Mitigation: synced reads by default, queued writes, connection status in every response.
- **Unified.to already has read and write for TallyPrime.** Mitigation: win on custom fields, TDL access and Indian go-to-market, where a global unified API is weakest.
- **Shared connector, shared blast radius:** a bug now affects Vyakth and every API customer. Mitigation: staged rollouts and automatic rollback.

**Open decisions** (fuller list in the spec and build plan)

| Decision | Owner |
| --- | --- |
| Does Shanoor move onto the platform now? (funds Phase 1) | Founder |
| Is the `REMOTEID` retry fully safe? (from the Tally test) | TDL developer |
| Pricing: rupee amounts per connection and call allowance | Founder |
| Connector branding: Vyakth, Hexspare, or neutral | Founder |
| DPDP review of consent for third-party access to accounting and KYC data | Legal |

## Related documents

This PRD is the entry point. The detail lives here:

- [Tally API Platform — Product Spec (v2)](https://claude.ai/artifact/BtnCzArZirttwm8Y6takwa) — requirements with acceptance criteria, pricing, positioning.
- [ADR-1: Engine architecture](https://claude.ai/artifact/4T47Qck4tghE6EeBVq75Sr) — the engine-and-bundle design and the options weighed.
- [Implementation Guide](https://claude.ai/artifact/85bQqB1KW5WeiTQ7sWNSMJ) — how Tally's interface works, with the research behind it.
- [Build Plan](https://claude.ai/artifact/PEZG4xMFuRHss55FKyqUGA) — the phased task list, team ownership, and first week.
- [Protecting the Connector exe](https://claude.ai/artifact/8wTeJsEHpAJapnNR3m7yMi) — hardening the client before external launch.

**Files** (sent in chat, not docs): the PostgreSQL schema (`tally-platform-schema.sql`), the Postman collection (`hexspare-tally-api.postman_collection.json`), and the extracted connector code.
