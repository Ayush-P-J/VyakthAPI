-- Accounts for the developer console. app_user comes from the concept schema; email is stored lower-case.
ALTER TABLE app_user ADD COLUMN name text;
ALTER TABLE app_user ADD CONSTRAINT app_user_email_lower CHECK (email = lower(email));

-- A signed-in browser. Only a hash of the cookie's token is stored, so a database leak cannot sign anyone in.
CREATE TABLE user_session (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash  text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL
);
CREATE INDEX ON user_session (user_id);
CREATE INDEX ON user_session (expires_at);
