ALTER TABLE safety_rules
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'safety_rules'
      AND column_name = 'is_active'
  ) THEN
    UPDATE safety_rules
    SET active = is_active
    WHERE is_active IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_safety_rules_active
  ON safety_rules(active);
