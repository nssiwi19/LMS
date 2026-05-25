import { CourseSection, CourseRegistration } from "../../types";
import { Queryable } from "../db";

export const sectionsRepository = {
  async createSection(db: Queryable, section: CourseSection): Promise<CourseSection> {
    await db.query(
      `INSERT INTO course_sections (id, course_id, semester_id, teacher_id, section_code, max_students, schedule_json, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [section.id, section.courseId, section.semesterId, section.teacherId, section.sectionCode, section.maxStudents, JSON.stringify(section.schedule), section.status]
    );
    return section;
  },

  async listSections(db: Queryable, courseId?: string): Promise<CourseSection[]> {
    const res = courseId
      ? await db.query("SELECT * FROM course_sections WHERE course_id = $1", [courseId])
      : await db.query("SELECT * FROM course_sections");
    return res.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      semesterId: row.semester_id,
      teacherId: row.teacher_id,
      sectionCode: row.section_code,
      maxStudents: row.max_students,
      schedule: JSON.parse(row.schedule_json || "[]"),
      status: row.status
    }));
  },

  async registerToSection(db: Queryable, reg: CourseRegistration): Promise<CourseRegistration> {
    await db.query(
      `INSERT INTO course_registrations (id, student_id, section_id, semester_id, status, registered_at, dropped_at, grade, letter_grade, grade_point, credits, is_retake)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [reg.id, reg.studentId, reg.sectionId, reg.semesterId, reg.status, reg.registeredAt, reg.droppedAt || null, reg.grade || null, reg.letterGrade || null, reg.gradePoint ?? null, reg.credits, reg.isRetake || false]
    );
    return reg;
  },

  async conflictCheck(db: Queryable, studentId: string, sectionId: string): Promise<boolean> {
    // 1. Get schedule of target section
    const targetRes = await db.query("SELECT schedule_json FROM course_sections WHERE id = $1", [sectionId]);
    if (!targetRes.rows[0]) return false;
    const targetSchedule = JSON.parse(targetRes.rows[0].schedule_json || "[]") as CourseSection["schedule"];

    // 2. Get schedules of student's already registered sections in same semester
    const secRes = await db.query("SELECT semester_id FROM course_sections WHERE id = $1", [sectionId]);
    const semId = secRes.rows[0]?.semester_id;
    if (!semId) return false;

    const currentRegs = await db.query(
      `SELECT cs.schedule_json 
       FROM course_registrations cr
       JOIN course_sections cs ON cr.section_id = cs.id
       WHERE cr.student_id = $1 AND cr.semester_id = $2 AND cr.status = 'registered'`,
      [studentId, semId]
    );

    const existingSchedules = currentRegs.rows.flatMap(r => JSON.parse(r.schedule_json || "[]") as CourseSection["schedule"]);

    // 3. Compare day of week and overlapping times
    for (const t of targetSchedule) {
      for (const e of existingSchedules) {
        if (t.dayOfWeek.toLowerCase() === e.dayOfWeek.toLowerCase()) {
          const tStart = this.timeToMinutes(t.startTime);
          const tEnd = this.timeToMinutes(t.endTime);
          const eStart = this.timeToMinutes(e.startTime);
          const eEnd = this.timeToMinutes(e.endTime);

          if (Math.max(tStart, eStart) < Math.min(tEnd, eEnd)) {
            return true; // Overlap found
          }
        }
      }
    }

    return false;
  },

  async promoteWaitlist(db: Queryable, sectionId: string): Promise<void> {
    // Check if space is available
    const secRes = await db.query("SELECT max_students FROM course_sections WHERE id = $1", [sectionId]);
    if (!secRes.rows[0]) return;
    const cap = secRes.rows[0].max_students;

    const countRes = await db.query("SELECT COUNT(*) AS count FROM course_registrations WHERE section_id = $1 AND status = 'registered'", [sectionId]);
    const enrolled = Number(countRes.rows[0].count);

    if (enrolled < cap) {
      // Find oldest waitlisted
      const wlRes = await db.query(
        "SELECT id FROM course_registrations WHERE section_id = $1 AND status = 'waitlisted' ORDER BY registered_at ASC LIMIT 1",
        [sectionId]
      );
      if (wlRes.rows[0]) {
        await db.query("UPDATE course_registrations SET status = 'registered' WHERE id = $1", [wlRes.rows[0].id]);
      }
    }
  },

  timeToMinutes(timeStr: string): number {
    const [hrs, mins] = timeStr.split(":").map(Number);
    return hrs * 60 + mins;
  }
};
