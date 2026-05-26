import { Pool } from "pg";

export function toLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function toGradePoint(letterGrade: string): number {
  const map: Record<string, number> = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0, W: 0.0 };
  return map[letterGrade] ?? 0.0;
}

export async function recalculateGPA(pool: Pool, studentId: string): Promise<{ gpa: number; credits: number }> {
  const { rows } = await pool.query(
    `SELECT grade_point, credits
     FROM course_registrations
     WHERE student_id = $1
       AND status NOT IN ('dropped', 'waitlisted')
       AND grade_point IS NOT NULL
       AND COALESCE(letter_grade, '') != 'W'`,
    [studentId]
  );

  const totalCredits = rows.reduce((sum, row) => sum + Number(row.credits), 0);
  const weightedSum = rows.reduce((sum, row) => sum + Number(row.grade_point) * Number(row.credits), 0);
  const gpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;

  await pool.query(
    "UPDATE student_profiles SET gpa = $1, total_credits_earned = $2 WHERE user_id = $3",
    [gpa, totalCredits, studentId]
  );

  return { gpa, credits: totalCredits };
}
