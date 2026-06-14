ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'junior',
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'seniority'
  ) THEN
    UPDATE staff
    SET role = seniority
    WHERE seniority IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'is_available'
  ) THEN
    UPDATE staff
    SET available = is_available
    WHERE is_available IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'is_active'
  ) THEN
    UPDATE staff
    SET active = is_active
    WHERE is_active IS NOT NULL;
  END IF;
END $$;
