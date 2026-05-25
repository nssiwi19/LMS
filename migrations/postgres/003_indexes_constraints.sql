-- Query indexes for production API paths.
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses (status);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments (student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON lesson_progress (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes (course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments (course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_tuition_fees_student_id ON tuition_fees (student_id);
CREATE INDEX IF NOT EXISTS idx_academic_warnings_student_id ON academic_warnings (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records (session_id);

-- Business constraints that are safe to apply idempotently.
CREATE UNIQUE INDEX IF NOT EXISTS ux_enrollments_student_course ON enrollments (student_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_lesson_progress_enrollment_lesson ON lesson_progress (enrollment_id, lesson_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'le_tan', 'academic', 'finance', 'advisor', 'parent'));

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'pending', 'published', 'rejected'));

ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check CHECK (status IN ('active', 'completed', 'cancelled', 'pending_payment'));

ALTER TABLE tuition_fees DROP CONSTRAINT IF EXISTS tuition_fees_status_check;
ALTER TABLE tuition_fees ADD CONSTRAINT tuition_fees_status_check CHECK (status IN ('unpaid', 'partial', 'paid'));
