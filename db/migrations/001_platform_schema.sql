-- ============================================================================
-- Hexspare Tally API Platform — database schema (v1, concept)
-- PostgreSQL 14+
--
-- Design rules:
--   1. Every business table carries tenant_id. Multi-tenancy is built in from
--      day one so it never has to be retrofitted. (Row-Level Security can be
--      switched on later without schema change — the column is already here.)
--   2. The connector already owns incremental sync, batching and a local
--      outbox. These tables are the CLOUD side: what the connector uploads to,
--      what the public API reads from, and what drives writes back to Tally.
--   3. Record bodies and child lines are stored as JSONB, so a new custom
--      field never needs a migration.
--   4. Keep it simple. No partitioning, no sharding yet — add when real load
--      is measured. The hot table (record) is indexed for the two real
--      queries: "give me rows changed since X" and "give me one row by id".
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE connection_status AS ENUM ('pending', 'active', 'paused', 'revoked');
CREATE TYPE field_privacy      AS ENUM ('public', 'masked', 'excluded');
CREATE TYPE field_type         AS ENUM ('text', 'number', 'amount', 'quantity', 'rate', 'date', 'logical');
CREATE TYPE read_mode          AS ENUM ('synced', 'live');
CREATE TYPE write_action       AS ENUM ('create', 'alter');
CREATE TYPE write_status       AS ENUM ('queued', 'sent', 'completed', 'failed', 'rejected');
CREATE TYPE api_scope          AS ENUM ('read', 'write', 'raw', 'admin');
CREATE TYPE webhook_event      AS ENUM (
  'record.created', 'record.updated', 'record.deleted',
  'write_job.completed', 'write_job.failed',
  'connection.status_changed', 'schema.published'
);
CREATE TYPE issue_severity     AS ENUM ('info', 'warning', 'error');

-- ============================================================================
-- 1. TENANCY & IDENTITY
-- ============================================================================

-- The account that owns everything. A developer org, or Hexspare itself.
CREATE TABLE tenant (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- People who sign in. Belong to one tenant.
CREATE TABLE app_user (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    email       text NOT NULL,
    password_hash text,                 -- null if SSO-only later
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (email)
);
CREATE INDEX ON app_user (tenant_id);

-- A developer's API workspace inside a tenant: the thing that holds keys and
-- gets billed. In v1 a tenant may have exactly one; the column keeps the door
-- open for several (e.g. separate prod / sandbox projects).
CREATE TABLE project (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name        text NOT NULL,
    is_sandbox  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON project (tenant_id);

-- API keys a developer's app uses. Store only a hash of the key; show the
-- raw value once at creation. Scopes gate read vs write vs raw TDL access.
CREATE TABLE api_key (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id    uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name          text NOT NULL,
    key_prefix    text NOT NULL,          -- shown in UI, e.g. "hx_live_7Fq…"
    key_hash      text NOT NULL,          -- hash of the full secret
    scopes        api_scope[] NOT NULL DEFAULT '{read}',
    -- optional: restrict a key to one connection
    connection_id uuid,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz,
    revoked_at    timestamptz,
    UNIQUE (key_hash)
);
CREATE INDEX ON api_key (project_id);
CREATE INDEX ON api_key (tenant_id);

-- ============================================================================
-- 2. CONNECTORS & CONNECTIONS
-- ============================================================================

-- One connector installation on one PC. Maps to the connector's installationId
-- and device secret. The live channel (Phase 2) is bound to this row.
CREATE TABLE installation (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    installation_key text NOT NULL,       -- the connector's installationId
    device_secret_hash text,              -- hash of the connector device secret
    app_version    text,
    last_seen_at   timestamptz,           -- heartbeat
    channel_online boolean NOT NULL DEFAULT false,  -- live WebSocket up?
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (installation_key)
);
CREATE INDEX ON installation (tenant_id);

-- The central object: one Tally company, reached through one installation,
-- owned by one project. Everything data-related hangs off a connection.
CREATE TABLE connection (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id       uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    installation_id  uuid REFERENCES installation(id) ON DELETE SET NULL,
    -- how the connector identifies this company locally
    tally_company_guid text,              -- company.guid / sourceId
    company_name     text,
    tally_serial     text,                -- licence is tied to this
    status           connection_status NOT NULL DEFAULT 'pending',
    active_schema_version_id uuid,        -- FK added after schema_version exists
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (installation_id, tally_company_guid)
);
CREATE INDEX ON connection (tenant_id);
CREATE INDEX ON connection (project_id);

-- A link a developer sends a customer so the customer can connect their Tally.
-- The customer installs the connector, picks a company, approves fields; the
-- developer gets back a connection_id.
CREATE TABLE connect_link (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id   uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    token        text NOT NULL,           -- the secret in the link URL
    label        text,                    -- "Acme Industries"
    requested_scopes api_scope[] NOT NULL DEFAULT '{read}',
    connection_id uuid REFERENCES connection(id) ON DELETE SET NULL, -- set once linked
    expires_at   timestamptz,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (token)
);
CREATE INDEX ON connect_link (project_id);

-- ============================================================================
-- 3. SCHEMAS (definitions) — what the engine compiles into TDL
-- ============================================================================

-- A versioned schema. Immutable once published. A connection pins one version.
-- Can belong to a connection (its own overlay) or be a shared pack
-- (connection_id NULL, tenant_id NULL = the Standard pack shipped with product).
CREATE TABLE schema_version (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid REFERENCES tenant(id) ON DELETE CASCADE,
    connection_id uuid REFERENCES connection(id) ON DELETE CASCADE,
    name          text NOT NULL,          -- "Standard", "Shanoor overlay"
    version       integer NOT NULL,
    openapi       jsonb,                  -- generated OpenAPI document
    published_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (connection_id, name, version)
);
CREATE INDEX ON schema_version (tenant_id);

-- now that schema_version exists, wire the connection's active pointer
ALTER TABLE connection
    ADD CONSTRAINT connection_active_schema_fk
    FOREIGN KEY (active_schema_version_id) REFERENCES schema_version(id) ON DELETE SET NULL;

-- One exportable object type within a schema version. Compiles into one TDL
-- export request.
CREATE TABLE dataset (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_version_id  uuid NOT NULL REFERENCES schema_version(id) ON DELETE CASCADE,
    name               text NOT NULL,     -- api path segment, e.g. "customers"
    tally_type         text NOT NULL,     -- "Ledger", "Vouchers : VoucherType"
    child_of           text,              -- parent group / voucher type filter
    incremental        boolean NOT NULL DEFAULT true,  -- use AlterID delta
    config             jsonb,             -- extra compiler settings, child-line defs
    UNIQUE (schema_version_id, name)
);

-- A field inside a dataset. This is where custom fields (UDFs) live: a
-- discovered UDF becomes a row here with is_custom = true and the TDL
-- expression filled from discovery.
CREATE TABLE field (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id  uuid NOT NULL REFERENCES dataset(id) ON DELETE CASCADE,
    name        text NOT NULL,            -- output JSON key, "apartmentNo"
    tdl_expr    text NOT NULL,            -- "$LEDAppartmentNo"
    type        field_type NOT NULL DEFAULT 'text',
    privacy     field_privacy NOT NULL DEFAULT 'public',
    is_custom   boolean NOT NULL DEFAULT false,  -- came from a UDF, not standard
    udf_index   integer,                  -- Tally UDF index if known
    sort_order  integer NOT NULL DEFAULT 0,
    UNIQUE (dataset_id, name)
);

-- ============================================================================
-- 4. DISCOVERY — the custom fields found in a client's Tally
-- ============================================================================

-- What a discovery run found: every UDF seen on sampled records, so an
-- implementer can tick the ones to map. Not yet a field until mapped.
CREATE TABLE discovered_field (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    connection_id  uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    tally_type     text NOT NULL,         -- which object it was found on
    udf_name       text NOT NULL,         -- "LEDAPPARTMENTNO"
    udf_index      integer,
    type           field_type,
    sample_values  jsonb,                 -- up to a handful of real values
    is_mapped      boolean NOT NULL DEFAULT false,
    discovered_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (connection_id, tally_type, udf_name)
);
CREATE INDEX ON discovered_field (connection_id);

-- ============================================================================
-- 5. RECORD STORE — the synced copy the read API serves
-- ============================================================================

-- One row per record. Body and child lines are JSONB, so a new field never
-- needs a migration. Deletes are soft (is_deleted), matching the connector's
-- deleted-voucher snapshot approach — a "missing" record is marked, not erased.
CREATE TABLE record (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    connection_id  uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    dataset_name   text NOT NULL,         -- "customers", "sales_voucher"
    tally_master_id bigint NOT NULL,      -- stable id from Tally
    tally_alter_id  bigint NOT NULL,      -- change marker (watermark)
    body           jsonb NOT NULL,        -- normalised record incl. child lines
    raw            jsonb,                  -- optional raw response for replay/audit
    is_deleted     boolean NOT NULL DEFAULT false,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (connection_id, dataset_name, tally_master_id)
);
-- the two real read queries:
--   "rows in this dataset changed since cursor X"  (updatedSince / webhooks)
CREATE INDEX ON record (connection_id, dataset_name, updated_at);
--   delta bookkeeping by alter id
CREATE INDEX ON record (connection_id, dataset_name, tally_alter_id);
CREATE INDEX ON record (tenant_id);

-- Cloud-side sync watermark per connection + dataset (the connector keeps its
-- own; the cloud tracks what it has committed so paging cursors are stable).
CREATE TABLE sync_state (
    connection_id  uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    dataset_name   text NOT NULL,
    last_alter_id  bigint NOT NULL DEFAULT 0,
    last_synced_at timestamptz,
    PRIMARY KEY (connection_id, dataset_name)
);

-- ============================================================================
-- 6. WRITE JOBS — the queue that writes back to Tally (Phase 2)
-- ============================================================================

-- A create or alter the developer requested. The idempotency_key makes retries
-- safe: it is also the REMOTEID sent to Tally, so a repeat updates the same
-- voucher instead of creating a duplicate. Unique per project.
CREATE TABLE write_job (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id     uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    connection_id  uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    dataset_name   text NOT NULL,         -- "voucher_receipt"
    action         write_action NOT NULL,
    idempotency_key text NOT NULL,        -- also the Tally REMOTEID
    request_body   jsonb NOT NULL,        -- the developer's JSON
    status         write_status NOT NULL DEFAULT 'queued',
    -- Tally's response, parsed:
    tally_master_id bigint,               -- LASTVCHID / LASTMID on success
    result         jsonb,                 -- created/altered/errors counts
    error_message  text,                  -- plain-language failure
    created_at     timestamptz NOT NULL DEFAULT now(),
    completed_at   timestamptz,
    UNIQUE (project_id, idempotency_key)
);
CREATE INDEX ON write_job (connection_id, status);
CREATE INDEX ON write_job (tenant_id);

-- ============================================================================
-- 7. WEBHOOKS (Phase 1 reads, Phase 2 writes)
-- ============================================================================

CREATE TABLE webhook_endpoint (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    url         text NOT NULL,
    secret      text NOT NULL,            -- for HMAC signing
    events      webhook_event[] NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON webhook_endpoint (project_id);

-- Delivery log, so a subscriber that was down can replay from a cursor.
CREATE TABLE webhook_delivery (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    endpoint_id   uuid NOT NULL REFERENCES webhook_endpoint(id) ON DELETE CASCADE,
    event         webhook_event NOT NULL,
    payload       jsonb NOT NULL,
    idempotency_id uuid NOT NULL,
    attempts      integer NOT NULL DEFAULT 0,
    delivered_at  timestamptz,
    next_retry_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON webhook_delivery (endpoint_id, delivered_at);

-- ============================================================================
-- 8. METERING — the basis for billing (Phase 2)
-- ============================================================================

-- One row per billable action. Writes and live reads are weighted heavier than
-- synced reads (weight column), per the pricing model. Rolled up for invoices.
CREATE TABLE usage_event (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    project_id    uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    connection_id uuid REFERENCES connection(id) ON DELETE SET NULL,
    kind          text NOT NULL,          -- 'synced_read', 'live_read', 'write'
    weight        integer NOT NULL DEFAULT 1,
    occurred_at   timestamptz NOT NULL DEFAULT now()
);
-- billing queries roll up by project + month; keep it indexed for that
CREATE INDEX ON usage_event (project_id, occurred_at);
CREATE INDEX ON usage_event (tenant_id, occurred_at);

-- ============================================================================
-- 9. OPERATIONS — sync & write issue log
-- ============================================================================

-- What went wrong on a connection: a sync batch that failed, a write Tally
-- rejected, a blocked batch the connector held back, a discovery that errored.
-- Lets an operator see a failing client before they call. The connector
-- already blocks bad data locally; this is the cloud-visible record of it.
CREATE TABLE sync_issue (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    connection_id uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    kind          text NOT NULL,          -- 'sync_failed','write_rejected','batch_blocked','discovery_failed'
    dataset_name  text,                   -- which dataset, when relevant
    severity      issue_severity NOT NULL DEFAULT 'error',
    message       text NOT NULL,          -- plain-language summary
    details       jsonb,                  -- Tally response, batch id, etc.
    -- link back to the thing that failed, when there is one
    write_job_id  uuid REFERENCES write_job(id) ON DELETE SET NULL,
    is_resolved   boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    resolved_at   timestamptz
);
-- the operator view: open issues on a connection, newest first
CREATE INDEX ON sync_issue (connection_id, is_resolved, created_at DESC);
CREATE INDEX ON sync_issue (tenant_id, is_resolved);

-- ============================================================================
-- Touch-updated_at triggers (optional convenience)
-- ============================================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_tenant_touch     BEFORE UPDATE ON tenant     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_connection_touch BEFORE UPDATE ON connection FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- When you open to real tenants later, turn on Row-Level Security per table:
--
--   ALTER TABLE record ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON record
--     USING (tenant_id = current_setting('app.tenant_id')::uuid);
--
-- The tenant_id column is already on every table, so this needs no migration.
-- ============================================================================
