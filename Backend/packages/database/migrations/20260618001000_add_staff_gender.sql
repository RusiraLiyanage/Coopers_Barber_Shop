ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unspecified';

UPDATE staff
SET gender = 'unspecified'
WHERE gender IS NULL OR trim(gender) = '';
