CREATE TABLE IF NOT EXISTS oauth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_identities_provider_user_id
  ON oauth_identities(provider, provider_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_identities_user_provider
  ON oauth_identities(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_id
  ON oauth_identities(user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_email
  ON oauth_identities(email);
