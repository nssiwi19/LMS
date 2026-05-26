-- 007_sis_complete_schema.sql
-- Complete SIS migration adding missing tables, indexes, constraints, and robustly standardizing boolean columns.

-- 1. Standardize existing columns to PostgreSQL BOOLEAN robustly
ALTER TABLE users ALTER COLUMN is_active DROP DEFAULT;
ALTER TABLE users ALTER COLUMN is_active TYPE BOOLEAN USING (CASE WHEN is_active::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;

ALTER TABLE academic_years ALTER COLUMN is_current DROP DEFAULT;
ALTER TABLE academic_years ALTER COLUMN is_current TYPE BOOLEAN USING (CASE WHEN is_current::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE academic_years ALTER COLUMN is_current SET DEFAULT FALSE;

ALTER TABLE academic_warnings ALTER COLUMN is_resolved DROP DEFAULT;
ALTER TABLE academic_warnings ALTER COLUMN is_resolved TYPE BOOLEAN USING (CASE WHEN is_resolved::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE academic_warnings ALTER COLUMN is_resolved SET DEFAULT FALSE;

ALTER TABLE notifications ALTER COLUMN is_read DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN is_read TYPE BOOLEAN USING (CASE WHEN is_read::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT FALSE;

ALTER TABLE lesson_progress ALTER COLUMN completed DROP DEFAULT;
ALTER TABLE lesson_progress ALTER COLUMN completed TYPE BOOLEAN USING (CASE WHEN completed::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE lesson_progress ALTER COLUMN completed SET DEFAULT FALSE;

ALTER TABLE quiz_attempts ALTER COLUMN passed DROP DEFAULT;
ALTER TABLE quiz_attempts ALTER COLUMN passed TYPE BOOLEAN USING (CASE WHEN passed::text IN ('1', 'true', 't') THEN true ELSE false END);
ALTER TABLE quiz_attempts ALTER COLUMN passed SET DEFAULT FALSE;

-- 2. Create the missing departments and programs structural tables
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  head_teacher_id TEXT REFERENCES users(id),
  description TEXT
);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('certificate', 'diploma', 'degree')),
  total_credits INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS program_courses (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  semester INTEGER NOT NULL
);

-- 3. Create student_profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL UNIQUE,
  program_id TEXT NOT NULL REFERENCES programs(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  academic_year INTEGER NOT NULL,
  enrollment_date TEXT NOT NULL,
  expected_graduation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'on-leave', 'suspended', 'graduated', 'withdrawn')),
  gpa REAL NOT NULL DEFAULT 0.0,
  total_credits_earned INTEGER NOT NULL DEFAULT 0,
  address TEXT,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  notes TEXT
);

-- 4. Create course registrations and sections mapping
CREATE TABLE IF NOT EXISTS course_sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  section_code TEXT NOT NULL UNIQUE,
  max_students INTEGER NOT NULL,
  schedule_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS registration_periods (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  allowed_years_json TEXT NOT NULL DEFAULT '[]',
  is_open BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS course_registrations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('registered', 'waitlisted', 'dropped', 'withdrawn', 'completed', 'failed')),
  registered_at TEXT NOT NULL,
  dropped_at TEXT,
  grade TEXT,
  letter_grade TEXT,
  grade_point REAL,
  credits INTEGER NOT NULL,
  is_retake BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Create scholarships and financial transactions
CREATE TABLE IF NOT EXISTS scholarships (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'partial', 'merit', 'need-based')),
  amount INTEGER,
  discount_percent INTEGER,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  conditions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id TEXT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users(id),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_method TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  processed_by TEXT REFERENCES users(id),
  notes TEXT
);

-- 6. Create requests, academic warnings, advisors mapping and certs
CREATE TABLE IF NOT EXISTS grade_appeals (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_registration_id TEXT NOT NULL REFERENCES course_registrations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  original_grade REAL NOT NULL,
  revised_grade REAL,
  submitted_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(id),
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS advisor_assignments (
  id TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('medical', 'personal', 'financial')),
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users(id),
  review_note TEXT,
  resume_semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS graduation_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'eligible', 'approved', 'rejected')),
  applied_at TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users(id),
  total_credits_at_application INTEGER NOT NULL,
  gpa_at_application REAL NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TEXT NOT NULL,
  certificate_code TEXT NOT NULL UNIQUE
);

-- 7. Forum posts & Replies
CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  triggered_at TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. Core indexing maps for missing tables
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_student ON course_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_course ON forum_posts(course_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
