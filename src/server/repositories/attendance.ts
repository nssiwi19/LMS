import { AttendanceSession, AttendanceRecord } from "../../types";
import { Queryable } from "../db";
import { pool } from "../db";
import { eventBus } from "../eventBus";

export const attendanceRepository = {
  async createSession(db: Queryable, session: AttendanceSession): Promise<AttendanceSession> {
    await db.query(
      "INSERT INTO attendance_sessions (id, course_id, semester_id, teacher_id, date, topic) VALUES ($1,$2,$3,$4,$5,$6)",
      [session.id, session.courseId, session.semesterId || null, session.teacherId, session.date, session.topic]
    );
    return session;
  },

  async bulkMarkRecords(db: Queryable, records: AttendanceRecord[]): Promise<void> {
    for (const r of records) {
      await db.query(
        `INSERT INTO attendance_records (id, session_id, student_id, status, note) 
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
        [r.id, r.sessionId, r.studentId, r.status, r.note || null]
      );
    }
    if (records.length) {
      const session = (await db.query("SELECT course_id FROM attendance_sessions WHERE id = $1", [records[0].sessionId])).rows[0];
      if (session) await eventBus.emit("attendance.session.saved", { sessionId: records[0].sessionId, courseId: session.course_id, records }, pool);
    }
  },

  async saveAttendanceSession(db: Queryable, session: AttendanceSession, records: AttendanceRecord[]) {
    await this.createSession(db, session);
    await this.bulkMarkRecords(db, records);
    return session;
  },

  async calcAttendancePercent(db: Queryable, studentId: string, courseId: string): Promise<number> {
    const sessionsRes = await db.query("SELECT id FROM attendance_sessions WHERE course_id = $1", [courseId]);
    const sessionIds = sessionsRes.rows.map(row => row.id);
    if (sessionIds.length === 0) return 100; // default compliant

    const recordsRes = await db.query(
      "SELECT status FROM attendance_records WHERE student_id = $1 AND session_id = ANY($2)",
      [studentId, sessionIds]
    );

    const attended = recordsRes.rows.filter(r => r.status === "present" || r.status === "late" || r.status === "excused").length;
    return Math.round((attended / sessionIds.length) * 100);
  }
};
