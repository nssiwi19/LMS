import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";
import { getInitialStore } from "../src/store";
import { backfillMegaDemoData } from "../src/mockSeeds";

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

async function main() {
  await pool.query(fs.readFileSync(path.join(process.cwd(), "migrations", "001_initial_schema.postgres.sql"), "utf8"));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const u of store.users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           password_salt = EXCLUDED.password_salt,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active,
           phone = EXCLUDED.phone,
           linked_student_id = EXCLUDED.linked_student_id`,
        [u.id, u.email.toLowerCase(), u.passwordHash, u.passwordSalt || null, u.name, u.role, u.isActive ? 1 : 0, u.phone || null, u.linkedStudentId || null, u.createdAt]
      );
    }

    for (const c of store.courses) {
      await client.query(
        `INSERT INTO courses (id, title, description, teacher_id, status, category, thumbnail, price, level, tags_json, rejection_reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.title, c.description, c.teacherId, c.status, c.category, c.thumbnail || null, c.price || 0, c.level || null, JSON.stringify(c.tags || []), c.rejectionReason || null, c.createdAt]
      );
    }

    for (const l of store.lessons) {
      await client.query(
        "INSERT INTO lessons (id, course_id, title, content, video_url, lesson_order, duration) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
        [l.id, l.courseId, l.title, l.content, l.videoUrl || null, l.order, l.duration]
      );
    }

    for (const e of store.enrollments) {
      await client.query(
        "INSERT INTO enrollments (id, course_id, student_id, status, enrolled_at, completed_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [e.id, e.courseId, e.studentId, e.status, e.enrolledAt, e.completedAt || null]
      );
    }

    for (const p of store.lessonProgress) {
      await client.query(
        "INSERT INTO lesson_progress (id, enrollment_id, lesson_id, completed, completed_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
        [p.id, p.enrollmentId, p.lessonId, p.completed ? 1 : 0, p.completedAt || null]
      ).catch(() => undefined);
    }

    for (const q of store.quizzes) {
      await client.query(
        "INSERT INTO quizzes (id, course_id, lesson_id, title, passing_score, time_limit, max_attempts) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
        [q.id, q.courseId, q.lessonId || null, q.title, q.passingScore, q.timeLimit, q.maxAttempts]
      );
    }

    for (const q of store.questions) {
      await client.query(
        "INSERT INTO questions (id, quiz_id, text, type, options_json, correct_answer) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [q.id, q.quizId, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer]
      );
    }

    for (const a of store.assignments) {
      await client.query(
        "INSERT INTO assignments (id, course_id, title, description, deadline, max_score) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [a.id, a.courseId, a.title, a.description, a.deadline, a.maxScore]
      );
    }

    for (const s of store.submissions) {
      await client.query(
        "INSERT INTO submissions (id, assignment_id, student_id, content, score, feedback, submitted_at, graded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
        [s.id, s.assignmentId, s.studentId, s.content, s.score ?? null, s.feedback || null, s.submittedAt, s.gradedAt || null]
      );
    }

    for (const f of store.tuitionFees) {
      await client.query(
        "INSERT INTO tuition_fees (id, student_id, semester_id, amount, due_date, status, paid_amount, paid_at, receipt_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING",
        [f.id, f.studentId, f.semesterId || null, f.amount, f.dueDate, f.status, f.paidAmount, f.paidAt || null, f.receiptCode || null]
      );
    }

    for (const w of store.academicWarnings) {
      await client.query(
        "INSERT INTO academic_warnings (id, student_id, type, message, is_resolved, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [w.id, w.studentId, w.type, w.message, w.isResolved ? 1 : 0, w.createdAt]
      );
    }

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
