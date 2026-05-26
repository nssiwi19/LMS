import { Enrollment, LessonProgress, User } from "../../types";
import { Queryable } from "../db";
import { generateId } from "../ids";
import { enrollmentFromRow, lessonProgressFromRow } from "../mappers";

export const enrollmentsRepository = {
  async listForUser(db: Queryable, user: User) {
    const adminRoles = ["admin", "super_admin", "academic_admin"] as User["role"][];
    const result = adminRoles.includes(user.role)
      ? await db.query("SELECT * FROM enrollments")
      : await db.query("SELECT * FROM enrollments WHERE student_id = $1", [user.id]);
    return result.rows.map(enrollmentFromRow);
  },

  async register(db: Queryable, studentId: string, courseId: string, isPaidCourse: boolean) {
    const enrollment: Enrollment = {
      id: generateId("enroll"),
      courseId,
      studentId,
      status: isPaidCourse ? "pending_payment" : "active",
      enrolledAt: new Date().toISOString()
    };
    await db.query(
      "INSERT INTO enrollments (id,course_id,student_id,status,enrolled_at,completed_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [enrollment.id, enrollment.courseId, enrollment.studentId, enrollment.status, enrollment.enrolledAt, null]
    );
    return enrollment;
  },

  async findStudentEnrollment(db: Queryable, studentId: string, enrollmentId: string) {
    return (await db.query("SELECT * FROM enrollments WHERE id = $1 AND student_id = $2", [enrollmentId, studentId])).rows[0] || null;
  },

  async existsForCourse(db: Queryable, studentId: string, courseId: string) {
    return Boolean((await db.query("SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2", [courseId, studentId])).rows[0]);
  },

  async toggleProgress(db: Queryable, enrollmentId: string, lessonId: string) {
    const existing = (await db.query("SELECT * FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2", [enrollmentId, lessonId])).rows[0];
    if (existing) {
      const completed = !Boolean(existing.completed);
      const completedAt = completed ? new Date().toISOString() : null;
      const row = (await db.query("UPDATE lesson_progress SET completed = $1, completed_at = $2 WHERE id = $3 RETURNING *", [completed, completedAt, existing.id])).rows[0];
      return lessonProgressFromRow(row);
    }

    const progress: LessonProgress = { id: generateId("prog"), enrollmentId, lessonId, completed: true, completedAt: new Date().toISOString() };
    await db.query("INSERT INTO lesson_progress (id,enrollment_id,lesson_id,completed,completed_at) VALUES ($1,$2,$3,$4,$5)", [progress.id, enrollmentId, lessonId, true, progress.completedAt]);
    return progress;
  },

  async activateEnrollment(db: Queryable, id: string) {
    const row = (await db.query("UPDATE enrollments SET status = 'active' WHERE id = $1 RETURNING *", [id])).rows[0];
    return row ? enrollmentFromRow(row) : null;
  }
};
