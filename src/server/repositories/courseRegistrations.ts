import { Queryable } from "../db";
import { pool } from "../db";
import { generateId } from "../ids";
import { notifyStudent, notifyUsers } from "../notify";
import { eventBus } from "../eventBus";

async function resolveSectionCredits(db: Queryable, sectionId: string, courseId: string): Promise<number> {
  const row = (await db.query(
    `SELECT COALESCE(MAX(pc.credits), 3) AS credits
     FROM program_courses pc
     WHERE pc.course_id = $1`,
    [courseId]
  )).rows[0];
  return Number(row?.credits || 3);
}

export const courseRegistrationsRepository = {
  async register(db: Queryable, studentId: string, sectionId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const section = (await client.query("SELECT * FROM course_sections WHERE id = $1 FOR UPDATE", [sectionId])).rows[0];
      if (!section) {
        await client.query("ROLLBACK");
        return { error: "Section not found.", status: 404 };
      }

      const existing = (await client.query(
        "SELECT * FROM course_registrations WHERE student_id = $1 AND section_id = $2 AND status IN ('registered', 'waitlisted')",
        [studentId, sectionId]
      )).rows[0];
      if (existing) {
        await client.query("ROLLBACK");
        return { error: "Student is already registered or waitlisted for this section.", status: 409 };
      }

      const profile = (await client.query("SELECT fee_hold FROM student_profiles WHERE user_id = $1", [studentId])).rows[0];
      if (profile?.fee_hold) {
        await client.query("ROLLBACK");
        return { error: "Clear outstanding fees before registering for courses.", status: 403 };
      }

      const conflict = await client.query(
        `SELECT ss2.*
         FROM course_registrations cr
         JOIN course_sections cs ON cs.id = cr.section_id
         JOIN section_schedules ss ON ss.section_id = cs.id
         JOIN section_schedules ss2 ON ss2.section_id = $1
         WHERE cr.student_id = $2
           AND cr.semester_id = $3
           AND cr.status = 'registered'
           AND ss.day_of_week = ss2.day_of_week
           AND ss.start_time < ss2.end_time
           AND ss2.start_time < ss.end_time`,
        [sectionId, studentId, section.semester_id]
      );
      if (conflict.rowCount) {
        await client.query("ROLLBACK");
        return { error: "Schedule conflict detected", status: 409 };
      }

      const count = Number((await client.query(
        "SELECT COUNT(*) AS count FROM course_registrations WHERE section_id = $1 AND status = 'registered'",
        [sectionId]
      )).rows[0].count);
      const status = count >= Number(section.max_students) ? "waitlisted" : "registered";
      const credits = await resolveSectionCredits(client, sectionId, section.course_id);

      const row = (await client.query(
        `INSERT INTO course_registrations (id, student_id, section_id, semester_id, status, registered_at, credits, is_retake)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false)
         RETURNING *`,
        [generateId("reg"), studentId, sectionId, section.semester_id, status, new Date().toISOString(), credits]
      )).rows[0];

      await client.query("COMMIT");
      await notifyUsers(db, [section.teacher_id], { type: "info", message: `Student registered for section ${section.section_code}.`, relatedEntityType: "course_registration", relatedEntityId: row.id });
      return { row };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async drop(db: Queryable, registrationId: string, studentId: string) {
    const reg = (await db.query(
      `SELECT cr.*, s.start_date, cs.teacher_id
       FROM course_registrations cr
       JOIN semesters s ON s.id = cr.semester_id
       JOIN course_sections cs ON cs.id = cr.section_id
       WHERE cr.id = $1 AND cr.student_id = $2`,
      [registrationId, studentId]
    )).rows[0];
    if (!reg) return null;

    const semesterStart = new Date(reg.start_date).getTime();
    const dropDeadline = semesterStart + 14 * 24 * 60 * 60 * 1000;
    const nextStatus = Date.now() <= dropDeadline ? "dropped" : "withdrawn";
    const grade = nextStatus === "withdrawn" ? "W" : null;
    const row = (await db.query(
      "UPDATE course_registrations SET status = $2, dropped_at = $3, grade = COALESCE($4, grade), letter_grade = COALESCE($4, letter_grade) WHERE id = $1 RETURNING *",
      [registrationId, nextStatus, new Date().toISOString(), grade]
    )).rows[0];

    const promoted = (await db.query(
      `UPDATE course_registrations
       SET status = 'registered'
       WHERE id = (
         SELECT id FROM course_registrations
         WHERE section_id = $1 AND status = 'waitlisted'
         ORDER BY registered_at ASC
         LIMIT 1
       )
       RETURNING *`,
      [reg.section_id]
    )).rows[0];
    if (promoted) await notifyStudent(db, promoted.student_id, "You have been promoted from the waitlist.", { relatedEntityType: "course_registration", relatedEntityId: promoted.id });
    await notifyUsers(db, [reg.teacher_id], { type: "info", message: "A student dropped or withdrew from your section.", relatedEntityType: "course_registration", relatedEntityId: registrationId });
    await eventBus.emit("registration.dropped", { registrationId, studentId, status: nextStatus }, pool);
    return row;
  }
};
