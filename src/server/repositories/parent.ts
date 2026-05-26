import { Queryable } from "../db";

export const parentRepository = {
  async getLinkedStudent(db: Queryable, parentId: string): Promise<string | null> {
    const row = (await db.query("SELECT student_id FROM parent_links WHERE parent_id = $1 ORDER BY created_at ASC LIMIT 1", [parentId])).rows[0];
    if (row) return row.student_id;
    const legacy = (await db.query("SELECT linked_student_id FROM users WHERE id = $1", [parentId])).rows[0];
    return legacy?.linked_student_id || null;
  },

  async getDashboard(db: Queryable, studentId: string) {
    const [grades, attendance, tuition, warnings, advisorNotes] = await Promise.all([
      this.getGrades(db, studentId),
      this.getAttendance(db, studentId),
      this.getTuition(db, studentId),
      this.getWarnings(db, studentId),
      this.getAdvisorNotes(db, studentId)
    ]);
    return { studentId, grades, attendance, tuition, warnings, advisorNotes };
  },

  async getGrades(db: Queryable, studentId: string) {
    return (await db.query("SELECT * FROM course_registrations WHERE student_id = $1 ORDER BY registered_at DESC", [studentId])).rows;
  },

  async getAttendance(db: Queryable, studentId: string) {
    return (await db.query(
      `SELECT ar.*, s.course_id, s.date, s.topic
       FROM attendance_records ar
       JOIN attendance_sessions s ON s.id = ar.session_id
       WHERE ar.student_id = $1
       ORDER BY s.date DESC`,
      [studentId]
    )).rows;
  },

  async getTuition(db: Queryable, studentId: string) {
    return (await db.query("SELECT * FROM tuition_fees WHERE student_id = $1 ORDER BY due_date DESC", [studentId])).rows;
  },

  async getWarnings(db: Queryable, studentId: string) {
    return (await db.query("SELECT * FROM academic_warnings WHERE student_id = $1 ORDER BY created_at DESC", [studentId])).rows;
  },

  async getNotifications(db: Queryable, parentId: string) {
    return (await db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [parentId])).rows;
  },

  async getAdvisorNotes(db: Queryable, studentId: string) {
    return (await db.query("SELECT * FROM advisor_notes WHERE student_id = $1 AND share_with_parent = true ORDER BY created_at DESC", [studentId])).rows;
  }
};
