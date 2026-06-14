ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS email text UNIQUE,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'junior',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS safety_triggers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS complexity text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE services
SET required_skills = ARRAY['cuts'],
    safety_triggers = '{}',
    complexity = 'low'
WHERE name IN ('Haircut', 'Hair Cut');

UPDATE services
SET required_skills = ARRAY['styling', 'blowout'],
    safety_triggers = '{}',
    complexity = 'medium'
WHERE name = 'Hair Styling';

UPDATE services
SET required_skills = ARRAY['colour', 'bleach'],
    safety_triggers = ARRAY['bleach', 'colour correction', 'scalp sensitivity', 'allergy'],
    complexity = 'high'
WHERE name = 'Hair Coloring';

UPDATE services
SET required_skills = ARRAY['consultation'],
    safety_triggers = ARRAY['allergy', 'scalp sensitivity', 'chemical history', 'damage'],
    complexity = 'medium'
WHERE name = 'Consultation';

UPDATE services
SET required_skills = ARRAY['deep_conditioning', 'treatments'],
    safety_triggers = ARRAY['scalp sensitivity', 'allergy'],
    complexity = 'medium'
WHERE name = 'Deep Conditioning Treatment';

CREATE TABLE IF NOT EXISTS safety_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hair_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service text NOT NULL,
  hair_state text[] NOT NULL DEFAULT '{}',
  products_used text,
  barber_notes text,
  visit_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointment_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  client_summary text NOT NULL,
  safety_notes text,
  hair_state text[] NOT NULL DEFAULT '{}',
  desired_look text,
  generated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invite_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_rules_active
  ON safety_rules(active);

CREATE INDEX IF NOT EXISTS idx_hair_history_client_id
  ON hair_history(client_id);

CREATE INDEX IF NOT EXISTS idx_hair_history_barber_id
  ON hair_history(barber_id);

CREATE INDEX IF NOT EXISTS idx_appointment_briefs_booking_id
  ON appointment_briefs(booking_id);

CREATE INDEX IF NOT EXISTS idx_appointment_briefs_barber_id
  ON appointment_briefs(barber_id);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_barber_id
  ON invite_tokens(barber_id);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at
  ON invite_tokens(expires_at);
