import { StudentProfile } from "../../types";
import { Queryable } from "../db";

export const studentProfilesRepository = {
  async findByUserId(db: Queryable, userId: string): Promise<StudentProfile | null> {
    const res = await db.query("SELECT * FROM student_profiles WHERE user_id = $1", [userId]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  },

  async findById(db: Queryable, id: string): Promise<StudentProfile | null> {
    const res = await db.query("SELECT * FROM student_profiles WHERE id = $1", [id]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  },

  async create(db: Queryable, profile: StudentProfile): Promise<StudentProfile> {
    await db.query(
      `INSERT INTO student_profiles (
        id, user_id, student_code, program_id, department_id, academic_year, enrollment_date,
        expected_graduation, status, gpa, total_credits_earned, address, phone, date_of_birth,
        gender, guardian_name, guardian_phone, guardian_email, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        profile.id, profile.userId, profile.studentCode, profile.programId, profile.departmentId,
        profile.academicYear, profile.enrollmentDate, profile.expectedGraduation, profile.status,
        profile.gpa, profile.totalCreditsEarned, profile.address || null, profile.phone || null,
        profile.dateOfBirth || null, profile.gender || null, profile.guardianName || null,
        profile.guardianPhone || null, profile.guardianEmail || null, profile.notes || null
      ]
    );
    return profile;
  },

  async updateGpa(db: Queryable, userId: string, gpa: number): Promise<void> {
    await db.query("UPDATE student_profiles SET gpa = $1 WHERE user_id = $2", [gpa, userId]);
  },

  async updateStatus(db: Queryable, userId: string, status: StudentProfile["status"]): Promise<void> {
    await db.query("UPDATE student_profiles SET status = $1 WHERE user_id = $2", [status, userId]);
  },

  mapRow(row: any): StudentProfile {
    return {
      id: row.id,
      userId: row.user_id,
      studentCode: row.student_code,
      programId: row.program_id,
      departmentId: row.department_id,
      academicYear: row.academic_year,
      enrollmentDate: row.enrollment_date,
      expectedGraduation: row.expected_graduation,
      status: row.status,
      gpa: Number(row.gpa),
      totalCreditsEarned: Number(row.total_credits_earned),
      address: row.address || undefined,
      phone: row.phone || undefined,
      dateOfBirth: row.date_of_birth || undefined,
      gender: row.gender || undefined,
      guardianName: row.guardian_name || undefined,
      guardianPhone: row.guardian_phone || undefined,
      guardianEmail: row.guardian_email || undefined,
      notes: row.notes || undefined
    };
  }
};
