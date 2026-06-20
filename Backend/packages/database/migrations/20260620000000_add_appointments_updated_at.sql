ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE appointments
SET updated_at = created_at
WHERE updated_at IS NULL;
