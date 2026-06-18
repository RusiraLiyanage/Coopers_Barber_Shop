ALTER TABLE appointment_briefs
  ADD COLUMN IF NOT EXISTS generation_source text NOT NULL DEFAULT 'fallback',
  ADD COLUMN IF NOT EXISTS generation_model text;

UPDATE appointment_briefs
SET generation_source = 'fallback'
WHERE generation_source IS NULL OR btrim(generation_source) = '';
