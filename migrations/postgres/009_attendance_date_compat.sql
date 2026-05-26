-- 009_attendance_date_compat.sql
-- Keep legacy session_date schemas compatible with repositories that use date.

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS date TEXT;
UPDATE attendance_sessions SET date = session_date WHERE date IS NULL AND session_date IS NOT NULL;
