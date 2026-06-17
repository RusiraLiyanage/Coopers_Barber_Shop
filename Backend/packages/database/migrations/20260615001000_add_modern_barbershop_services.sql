INSERT INTO services (
  name,
  duration_minutes,
  is_active,
  required_skills,
  safety_triggers,
  complexity
)
VALUES
  ('Skin Fade', 45, true, '{}', '{}', 'low'),
  ('Beard Trim & Sculpting', 30, true, '{}', '{}', 'low'),
  ('Hot Towel Shave', 30, true, '{}', '{}', 'low'),
  ('Head Shave', 30, true, '{}', '{}', 'low'),
  ('Beard Colour', 45, true, '{}', '{}', 'low'),
  ('Colour Correction Consultation', 30, true, '{}', '{}', 'low'),
  ('Scalp Treatment', 45, true, '{}', '{}', 'low')
ON CONFLICT (name) DO UPDATE
SET duration_minutes = EXCLUDED.duration_minutes,
    is_active = true;
