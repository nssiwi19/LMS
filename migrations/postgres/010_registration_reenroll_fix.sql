-- Allow re-registration after drop/withdraw: unique only for active registration states.
DROP INDEX IF EXISTS idx_registrations_student_section;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_student_section_active
  ON course_registrations(student_id, section_id)
  WHERE status IN ('registered', 'waitlisted');
