ALTER TABLE safety_rules
  ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE safety_rules safety_rule
SET service_ids = COALESCE(
  (
    SELECT array_agg(service.id)
    FROM services service
    WHERE service.name = ANY(safety_rule.services)
  ),
  '{}'
)
WHERE cardinality(safety_rule.service_ids) = 0
  AND cardinality(safety_rule.services) > 0;

CREATE INDEX IF NOT EXISTS idx_safety_rules_service_ids
  ON safety_rules USING gin(service_ids);

ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS used_at timestamptz;

ALTER TABLE invite_tokens
  ALTER COLUMN barber_id DROP NOT NULL;

UPDATE invite_tokens
SET email = concat(token::text, '@legacy-invite.local')
WHERE email IS NULL;

ALTER TABLE invite_tokens
  ALTER COLUMN email SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_email
  ON invite_tokens(lower(email));

CREATE INDEX IF NOT EXISTS idx_invite_tokens_active_email
  ON invite_tokens(lower(email))
  WHERE used = false;
