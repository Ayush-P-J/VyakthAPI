-- Changes to the concept schema found while building. See docs/adr/0002-build-decisions.md.

-- R1 says one install serves every project the customer approves, but installation belonged to one
-- developer's tenant and one company could be linked only once per install. An installation belongs
-- to the customer's PC; access to it is always through a connection, which is tenant-scoped.
ALTER TABLE installation ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE installation ADD COLUMN tally_open boolean NOT NULL DEFAULT false;
ALTER TABLE connection DROP CONSTRAINT connection_installation_id_tally_company_guid_key;
ALTER TABLE connection ADD CONSTRAINT connection_project_install_company_key UNIQUE (project_id, installation_id, tally_company_guid);

-- What the customer approved on the consent screen.
ALTER TABLE connection ADD COLUMN consent jsonb NOT NULL DEFAULT '{}';

-- Connect flow state. connect_link.token holds a SHA-256 of the secret, never the secret.
ALTER TABLE connect_link
  ADD COLUMN redirect_url text,
  ADD COLUMN requested_fields jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN installation_id uuid REFERENCES installation(id) ON DELETE SET NULL,
  ADD COLUMN companies jsonb;

-- A published version is a signed, immutable bundle (ADR-1). A connection pins it by hash.
ALTER TABLE schema_version
  ADD COLUMN envelope jsonb,
  ADD COLUMN bundle_hash text;

-- Writes are signed single-use jobs. Masters run before vouchers, then oldest first.
ALTER TABLE write_job
  ADD COLUMN payload_hash text NOT NULL DEFAULT '',
  ADD COLUMN remote_id text,
  ADD COLUMN priority smallint NOT NULL DEFAULT 1,
  ADD COLUMN seq bigserial,
  ADD COLUMN envelope jsonb;
CREATE INDEX write_job_claim ON write_job (connection_id, priority, seq) WHERE status IN ('queued', 'sent');

-- Keyset paging for the read API.
CREATE INDEX record_cursor ON record (connection_id, dataset_name, updated_at, tally_master_id);

-- The delivery worker's queue, and the replay cursor.
CREATE INDEX webhook_delivery_pending ON webhook_delivery (next_retry_at) WHERE delivered_at IS NULL AND next_retry_at IS NOT NULL;
CREATE INDEX webhook_delivery_cursor ON webhook_delivery (endpoint_id, created_at, id);
