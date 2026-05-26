import { Queryable } from "../db";
import { generateId } from "../ids";

export const advisorsRepository = {
  async getAssignments(db: Queryable, advisorId: string) {
    return (await db.query(
      `SELECT aa.*, u.name AS student_name, u.email AS student_email
       FROM advisor_assignments aa
       JOIN users u ON u.id = aa.student_id
       WHERE aa.advisor_id = $1
       ORDER BY aa.assigned_at DESC`,
      [advisorId]
    )).rows;
  },

  async assignStudent(db: Queryable, advisorId: string, studentId: string, semesterId?: string) {
    const row = (await db.query(
      `INSERT INTO advisor_assignments (id, advisor_id, student_id, semester_id, assigned_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [generateId("advisor_assign"), advisorId, studentId, semesterId || null, new Date().toISOString()]
    )).rows[0];
    return row || null;
  },

  async unassignStudent(db: Queryable, assignmentId: string) {
    const row = (await db.query("DELETE FROM advisor_assignments WHERE id = $1 RETURNING *", [assignmentId])).rows[0];
    return row || null;
  },

  async createNote(db: Queryable, input: { advisorId: string; studentId: string; type: string; content: string; shareWithParent?: boolean }) {
    const row = (await db.query(
      `INSERT INTO advisor_notes (id, advisor_id, student_id, type, content, share_with_parent, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [generateId("note"), input.advisorId, input.studentId, input.type, input.content, Boolean(input.shareWithParent), new Date().toISOString()]
    )).rows[0];
    return row;
  },

  async getNotes(db: Queryable, studentId: string) {
    return (await db.query("SELECT * FROM advisor_notes WHERE student_id = $1 ORDER BY created_at DESC", [studentId])).rows;
  },

  async getAdvisorNotes(db: Queryable, advisorId: string) {
    return (await db.query("SELECT * FROM advisor_notes WHERE advisor_id = $1 ORDER BY created_at DESC", [advisorId])).rows;
  },

  async getAtRiskStudents(db: Queryable, advisorId: string) {
    return (await db.query(
      `SELECT DISTINCT u.id, u.name, u.email, aw.type, aw.message
       FROM advisor_assignments aa
       JOIN users u ON u.id = aa.student_id
       JOIN academic_warnings aw ON aw.student_id = aa.student_id AND aw.is_resolved = false
       WHERE aa.advisor_id = $1
       ORDER BY u.name`,
      [advisorId]
    )).rows;
  },

  async getDashboard(db: Queryable, advisorId: string) {
    const assignments = await this.getAssignments(db, advisorId);
    const notes = await this.getAdvisorNotes(db, advisorId);
    const atRisk = await this.getAtRiskStudents(db, advisorId);
    return {
      assignedStudents: assignments.length,
      notesWritten: notes.length,
      atRiskStudents: atRisk.length,
      assignments,
      notes,
      atRisk
    };
  }
};
