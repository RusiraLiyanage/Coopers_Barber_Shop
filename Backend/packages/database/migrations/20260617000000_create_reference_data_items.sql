CREATE TABLE IF NOT EXISTS reference_data_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (
    type IN ('barber_capability', 'safety_trigger')
  ),
  label text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_data_items_type_value
  ON reference_data_items(type, value);

CREATE INDEX IF NOT EXISTS idx_reference_data_items_type
  ON reference_data_items(type);

INSERT INTO reference_data_items (type, label, value)
SELECT DISTINCT
  'barber_capability',
  btrim(capability),
  btrim(capability)
FROM (
  SELECT unnest(skills) AS capability
  FROM staff
  UNION ALL
  SELECT unnest(required_skills) AS capability
  FROM services
) existing_capabilities
WHERE capability IS NOT NULL
  AND btrim(capability) <> ''
ON CONFLICT (type, value) DO NOTHING;

INSERT INTO reference_data_items (type, label, value)
SELECT DISTINCT
  'safety_trigger',
  btrim(trigger),
  btrim(trigger)
FROM (
  SELECT unnest(safety_triggers) AS trigger
  FROM services
) existing_triggers
WHERE trigger IS NOT NULL
  AND btrim(trigger) <> ''
ON CONFLICT (type, value) DO NOTHING;

INSERT INTO reference_data_items (type, label, value)
VALUES
  ('barber_capability', 'Classic haircuts', 'classic haircuts'),
  ('barber_capability', 'Skin fades', 'skin fades'),
  ('barber_capability', 'Beard shaping', 'beard shaping'),
  ('barber_capability', 'Hot towel shaves', 'hot towel shaves'),
  ('barber_capability', 'Head shaves', 'head shaves'),
  ('barber_capability', 'Hair styling', 'hair styling'),
  ('barber_capability', 'Formal styling', 'formal styling'),
  ('barber_capability', 'Colour consultation', 'colour consultation'),
  (
    'barber_capability',
    'Colour correction consultation',
    'colour correction consultation'
  ),
  ('barber_capability', 'Hair colouring', 'hair colouring'),
  ('barber_capability', 'Beard colouring', 'beard colouring'),
  ('barber_capability', 'Colour correction', 'colour correction'),
  ('barber_capability', 'Bleach work', 'bleach work'),
  (
    'barber_capability',
    'Deep conditioning treatments',
    'deep conditioning treatments'
  ),
  ('barber_capability', 'Scalp treatments', 'scalp treatments'),
  ('barber_capability', 'Scalp care', 'scalp care'),
  ('barber_capability', 'Curly hair', 'curly hair'),
  (
    'barber_capability',
    'Sensitive scalp support',
    'sensitive scalp support'
  ),
  ('barber_capability', 'Damaged hair support', 'damaged hair support'),
  (
    'barber_capability',
    'Chemical safety assessment',
    'chemical safety assessment'
  ),
  ('barber_capability', 'Client consultation', 'client consultation'),
  ('safety_trigger', 'Allergy', 'allergy'),
  ('safety_trigger', 'Scalp sensitivity', 'scalp sensitivity'),
  ('safety_trigger', 'Chemical history', 'chemical history'),
  ('safety_trigger', 'Bleach history', 'bleach history'),
  ('safety_trigger', 'Box dye history', 'box dye history'),
  (
    'safety_trigger',
    'Colour correction request',
    'colour correction request'
  ),
  ('safety_trigger', 'Damaged hair', 'damaged hair'),
  ('safety_trigger', 'Dry or brittle hair', 'dry or brittle hair'),
  ('safety_trigger', 'Patch test required', 'patch test required'),
  ('safety_trigger', 'Sensitive skin', 'sensitive skin'),
  ('safety_trigger', 'Scalp irritation', 'scalp irritation'),
  ('safety_trigger', 'Beard sensitivity', 'beard sensitivity'),
  (
    'safety_trigger',
    'Razor irritation history',
    'razor irritation history'
  ),
  ('safety_trigger', 'Formal event request', 'formal event request'),
  ('safety_trigger', 'Curl definition request', 'curl definition request'),
  (
    'safety_trigger',
    'High maintenance request',
    'high maintenance request'
  )
ON CONFLICT (type, value) DO UPDATE
SET label = EXCLUDED.label;
