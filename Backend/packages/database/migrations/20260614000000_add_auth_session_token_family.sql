-- Adds a token family id so refresh-token rotation can detect reuse: replaying a
-- rotated (revoked) token revokes every session sharing its family id.
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS token_family_id uuid;

-- Backfill existing rows: each pre-existing session becomes its own family.
UPDATE auth_sessions SET token_family_id = gen_random_uuid() WHERE token_family_id IS NULL;

ALTER TABLE auth_sessions ALTER COLUMN token_family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_family_id
  ON auth_sessions(token_family_id);
