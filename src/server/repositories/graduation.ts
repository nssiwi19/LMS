import { Queryable } from "../db";
import { generateId } from "../ids";
import { notifyStudent } from "../notify";

export const graduationRepository = {
  async create(db: Queryable, studentId: string) {
    const profile = (await db.query("SELECT * FROM student_profiles WHERE user_id = $1", [studentId])).rows[0];
    const row = (await db.query(
      `INSERT INTO graduation_applications (id, student_id, status, applied_at, total_credits_at_application, gpa_at_application)
       VALUES ($1,$2,'pending',$3,$4,$5)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [generateId("grad"), studentId, new Date().toISOString(), profile?.total_credits_earned || 0, profile?.gpa || 0]
    )).rows[0];
    return row || null;
  },

  async list(db: Queryable, user: { id: string; role: string }) {
    if (user.role === "student") return (await db.query("SELECT * FROM graduation_applications WHERE student_id = $1 ORDER BY applied_at DESC", [user.id])).rows;
    return (await db.query("SELECT * FROM graduation_applications ORDER BY applied_at DESC")).rows;
  },

  async approve(db: Queryable, id: string, reviewerId: string, note?: string) {
    const row = (await db.query(
      "UPDATE graduation_applications SET status = 'approved', reviewed_by = $2, note = $3 WHERE id = $1 RETURNING *",
      [id, reviewerId, note || null]
    )).rows[0];
    if (!row) return null;
    await db.query("UPDATE student_profiles SET status = 'graduated' WHERE user_id = $1", [row.student_id]);
    await notifyStudent(db, row.student_id, "Graduation application approved.", { relatedEntityType: "graduation_application", relatedEntityId: id });
    return row;
  },

  async reject(db: Queryable, id: string, reviewerId: string, note?: string) {
    const row = (await db.query(
      "UPDATE graduation_applications SET status = 'rejected', reviewed_by = $2, note = $3 WHERE id = $1 RETURNING *",
      [id, reviewerId, note || null]
    )).rows[0];
    if (row) await notifyStudent(db, row.student_id, `Graduation application rejected.${note ? ` ${note}` : ""}`, { relatedEntityType: "graduation_application", relatedEntityId: id });
    return row || null;
  }
};
