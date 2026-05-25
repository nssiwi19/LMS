import dotenv from "dotenv";
import pg from "pg";
import { getInitialStore } from "../src/store";
import { backfillMegaDemoData } from "../src/mockSeeds";
import { runMigrations } from "../src/dbMigrations";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed Supabase/Postgres.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

const store = getInitialStore();
backfillMegaDemoData(store);

type Row = Array<string | number | boolean | null | undefined>;

async function insertBatch(
  client: pg.PoolClient,
  table: string,
  columns: string[],
  rows: Row[],
  conflict = "DO NOTHING",
  chunkSize = 200
) {
  if (rows.length === 0) return;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const params = row.map((value, colIndex) => {
        values.push(value ?? null);
        return `$${rowIndex * columns.length + colIndex + 1}`;
      });
      return `(${params.join(",")})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders.join(",")} ON CONFLICT ${conflict}`,
      values
    );
  }
}

async function main() {
  await runMigrations(pool);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await insertBatch(
      client,
      "users",
      ["id", "email", "password_hash", "password_salt", "name", "role", "is_active", "phone", "linked_student_id", "created_at"],
      store.users.map(u => [u.id, u.email.toLowerCase(), u.passwordHash, u.passwordSalt || null, u.name, u.role, u.isActive ? 1 : 0, u.phone || null, u.linkedStudentId || null, u.createdAt]),
      `(id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, password_salt = EXCLUDED.password_salt, name = EXCLUDED.name, role = EXCLUDED.role, is_active = EXCLUDED.is_active, phone = EXCLUDED.phone, linked_student_id = EXCLUDED.linked_student_id`
    );

    await insertBatch(
      client,
      "academic_years",
      ["id", "name", "start_date", "end_date", "is_current"],
      store.academicYears.map(y => [y.id, y.name, y.startDate, y.endDate, y.isCurrent ? 1 : 0])
    );

    await insertBatch(
      client,
      "semesters",
      ["id", "academic_year_id", "name", "type", "start_date", "end_date", "registration_open", "registration_close"],
      store.semesters.map(s => [s.id, s.academicYearId, s.name, s.type, s.startDate, s.endDate, s.registrationOpen, s.registrationClose])
    );

    await insertBatch(
      client,
      "courses",
      ["id", "title", "description", "teacher_id", "status", "category", "thumbnail", "price", "level", "tags_json", "rejection_reason", "created_at"],
      store.courses.map(c => [c.id, c.title, c.description, c.teacherId, c.status, c.category, c.thumbnail || null, c.price || 0, c.level || null, JSON.stringify(c.tags || []), c.rejectionReason || null, c.createdAt])
    );

    await insertBatch(
      client,
      "lessons",
      ["id", "course_id", "title", "content", "video_url", "lesson_order", "duration"],
      store.lessons.map(l => [l.id, l.courseId, l.title, l.content, l.videoUrl || null, l.order, l.duration])
    );

    await insertBatch(
      client,
      "enrollments",
      ["id", "course_id", "student_id", "status", "enrolled_at", "completed_at"],
      store.enrollments.map(e => [e.id, e.courseId, e.studentId, e.status, e.enrolledAt, e.completedAt || null])
    );

    const lessonIds = new Set(store.lessons.map(l => l.id));
    const enrollmentIds = new Set(store.enrollments.map(e => e.id));
    await insertBatch(
      client,
      "lesson_progress",
      ["id", "enrollment_id", "lesson_id", "completed", "completed_at"],
      store.lessonProgress
        .filter(p => enrollmentIds.has(p.enrollmentId) && lessonIds.has(p.lessonId))
        .map(p => [p.id, p.enrollmentId, p.lessonId, p.completed ? 1 : 0, p.completedAt || null])
    );

    await insertBatch(
      client,
      "quizzes",
      ["id", "course_id", "lesson_id", "title", "passing_score", "time_limit", "max_attempts"],
      store.quizzes.map(q => [q.id, q.courseId, q.lessonId || null, q.title, q.passingScore, q.timeLimit, q.maxAttempts])
    );

    await insertBatch(
      client,
      "questions",
      ["id", "quiz_id", "text", "type", "options_json", "correct_answer"],
      store.questions.map(q => [q.id, q.quizId, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer])
    );

    await insertBatch(
      client,
      "quiz_attempts",
      ["id", "quiz_id", "student_id", "answers_json", "score", "passed", "started_at", "submitted_at"],
      store.quizAttempts
        .filter(a => store.quizzes.some(q => q.id === a.quizId))
        .map(a => [a.id, a.quizId, a.studentId, JSON.stringify(a.answers || {}), a.score, a.passed ? 1 : 0, a.startedAt, a.submittedAt])
    );

    await insertBatch(
      client,
      "assignments",
      ["id", "course_id", "title", "description", "deadline", "max_score"],
      store.assignments.map(a => [a.id, a.courseId, a.title, a.description, a.deadline, a.maxScore])
    );

    await insertBatch(
      client,
      "submissions",
      ["id", "assignment_id", "student_id", "content", "score", "feedback", "submitted_at", "graded_at"],
      store.submissions.map(s => [s.id, s.assignmentId, s.studentId, s.content, s.score ?? null, s.feedback || null, s.submittedAt, s.gradedAt || null])
    );

    await insertBatch(
      client,
      "tuition_fees",
      ["id", "student_id", "semester_id", "amount", "due_date", "status", "paid_amount", "paid_at", "receipt_code"],
      store.tuitionFees.map(f => [f.id, f.studentId, f.semesterId || null, f.amount, f.dueDate, f.status, f.paidAmount, f.paidAt || null, f.receiptCode || null])
    );

    await insertBatch(
      client,
      "academic_warnings",
      ["id", "student_id", "type", "message", "is_resolved", "created_at"],
      store.academicWarnings.map(w => [w.id, w.studentId, w.type, w.message, w.isResolved ? 1 : 0, w.createdAt])
    );

    await client.query("COMMIT");
    console.log(`Seeded Postgres database with ${store.users.filter(u => u.role === "student").length} students and ${store.courses.length} courses.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
