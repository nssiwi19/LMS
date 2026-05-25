-- Standardize duplicated legacy columns.
-- Canonical choices:
--   courses.tags_json instead of courses.tags
--   quiz_attempts.answers_json instead of quiz_attempts.answers

ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags_json TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND column_name = 'tags'
  ) THEN
    UPDATE courses
    SET tags_json = COALESCE(tags_json, to_json(tags)::text)
    WHERE tags IS NOT NULL;

    ALTER TABLE courses DROP COLUMN tags;
  END IF;
END $$;

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS answers_json TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'answers'
  ) THEN
    UPDATE quiz_attempts
    SET answers_json = COALESCE(answers_json, answers::text)
    WHERE answers IS NOT NULL;

    ALTER TABLE quiz_attempts DROP COLUMN answers;
  END IF;
END $$;

ALTER TABLE quiz_attempts ALTER COLUMN answers_json SET DEFAULT '{}';
UPDATE quiz_attempts SET answers_json = '{}' WHERE answers_json IS NULL;
