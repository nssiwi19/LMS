-- 008_security_sis_roles_and_workflows.sql
-- Idempotent security, role, advisor, parent, notification, and SIS workflow upgrade.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'le_tan', 'academic', 'academic_admin', 'finance', 'advisor', 'parent'));
UPDATE users SET role = 'academic_admin' WHERE role = 'academic';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'le_tan', 'academic_admin', 'finance', 'advisor', 'parent'));

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS fee_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS academic_probation BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS parent_links (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE advisor_notes ADD COLUMN IF NOT EXISTS share_with_parent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE advisor_notes ALTER COLUMN created_at SET DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_advisor_notes_student ON advisor_notes(student_id);

CREATE TABLE IF NOT EXISTS advisor_assignments (
  id            TEXT PRIMARY KEY,
  advisor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id   TEXT REFERENCES semesters(id),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE advisor_assignments ALTER COLUMN semester_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_assignments_unique ON advisor_assignments(advisor_id, student_id, COALESCE(semester_id, ''));
CREATE INDEX IF NOT EXISTS idx_advisor_assignments_advisor ON advisor_assignments(advisor_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id TEXT;

ALTER TABLE academic_warnings ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id);
ALTER TABLE academic_warnings ADD COLUMN IF NOT EXISTS resolved_by TEXT REFERENCES users(id);
ALTER TABLE academic_warnings ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE academic_warnings DROP CONSTRAINT IF EXISTS academic_warnings_type_check;
UPDATE academic_warnings SET type = 'low_gpa' WHERE type = 'low-gpa';
UPDATE academic_warnings SET type = 'low_attendance' WHERE type = 'attendance';
UPDATE academic_warnings SET type = 'unpaid_fee' WHERE type = 'unpaid-fee';
UPDATE academic_warnings SET type = 'overdue_assignment' WHERE type = 'overdue-assignment';
ALTER TABLE academic_warnings ADD CONSTRAINT academic_warnings_type_check CHECK (type IN ('low_gpa','low_attendance','unpaid_fee','exam_ban','overdue_assignment'));
DELETE FROM academic_warnings aw
USING academic_warnings newer
WHERE aw.ctid < newer.ctid
  AND aw.student_id = newer.student_id
  AND aw.type = newer.type
  AND COALESCE(aw.course_id, '') = COALESCE(newer.course_id, '');
CREATE UNIQUE INDEX IF NOT EXISTS idx_warnings_unique_open ON academic_warnings(student_id, type, COALESCE(course_id, ''));
CREATE INDEX IF NOT EXISTS idx_warnings_student ON academic_warnings(student_id, is_resolved);

ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE course_sections ALTER COLUMN max_students SET DEFAULT 40;
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_sections_code_semester ON course_sections(section_code, semester_id);

CREATE TABLE IF NOT EXISTS section_schedules (
  id            TEXT PRIMARY KEY,
  section_id    TEXT NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  room          TEXT
);

ALTER TABLE registration_periods ADD COLUMN IF NOT EXISTS allowed_years INTEGER[] NOT NULL DEFAULT '{1,2,3,4}';

ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS exam_ban BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS grade_posted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_student_section ON course_registrations(student_id, section_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON course_registrations(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_registrations_section ON course_registrations(section_id);

ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scholarships ALTER COLUMN amount TYPE NUMERIC(15,2) USING amount::NUMERIC;
ALTER TABLE scholarships ALTER COLUMN discount_percent TYPE NUMERIC(5,2) USING discount_percent::NUMERIC;
ALTER TABLE scholarships ALTER COLUMN semester_id DROP NOT NULL;
ALTER TABLE scholarships ALTER COLUMN conditions DROP NOT NULL;
ALTER TABLE scholarship_applications ALTER COLUMN applied_at SET DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarship_applications_unique ON scholarship_applications(student_id, scholarship_id, semester_id);

ALTER TABLE grade_appeals ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE grade_appeals ADD COLUMN IF NOT EXISTS grade_posted_at TIMESTAMPTZ;
ALTER TABLE grade_appeals ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE grade_appeals ALTER COLUMN submitted_at SET DEFAULT NOW();
ALTER TABLE grade_appeals ALTER COLUMN original_grade TYPE TEXT USING original_grade::TEXT;
ALTER TABLE grade_appeals ALTER COLUMN revised_grade TYPE TEXT USING revised_grade::TEXT;
CREATE INDEX IF NOT EXISTS idx_grade_appeals_student ON grade_appeals(student_id);

ALTER TABLE leave_requests ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE leave_requests ALTER COLUMN requested_at SET DEFAULT NOW();
ALTER TABLE leave_requests ALTER COLUMN resume_semester_id DROP NOT NULL;

ALTER TABLE graduation_applications ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE graduation_applications ALTER COLUMN applied_at SET DEFAULT NOW();
ALTER TABLE graduation_applications ALTER COLUMN total_credits_at_application DROP NOT NULL;
ALTER TABLE graduation_applications ALTER COLUMN gpa_at_application DROP NOT NULL;
