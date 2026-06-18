ALTER TABLE appointment_briefs
  ADD COLUMN IF NOT EXISTS goal_photo_media_type text,
  ADD COLUMN IF NOT EXISTS goal_photo_data text;
