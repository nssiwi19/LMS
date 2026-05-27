import { Assignment, Submission } from "../../types";
import { Queryable } from "../db";
import { pool } from "../db";
import { eventBus } from "../eventBus";
import { generateId } from "../ids";

export const assignmentsRepository = {
  async create(db: Queryable, input: Omit<Assignment, "id">) {
    const assignment = { ...input, id: generateId("assign") };
    await db.query(
      "INSERT INTO assignments (id, course_id, title, description, deadline, max_score) VALUES ($1,$2,$3,$4,$5,$6)",
      [assignment.id, assignment.courseId, assignment.title, assignment.description, assignment.deadline, assignment.maxScore]
    );
    return assignment;
  },

  async submit(db: Queryable, studentId: string, assignmentId: string, content: string) {
    const assignment = (await db.query("SELECT course_id FROM assignments WHERE id = $1", [assignmentId])).rows[0];
    if (!assignment) return { error: "Assignment not found.", status: 404 };

    const enrollment = (await db.query(
      "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status IN ('active', 'completed')",
      [studentId, assignment.course_id]
    )).rows[0];
    if (!enrollment) return { error: "Active enrollment required to submit this assignment.", status: 403 };

    const existing = (await db.query(
      "SELECT id FROM submissions WHERE student_id = $1 AND assignment_id = $2",
      [studentId, assignmentId]
    )).rows[0];

    if (existing) {
      const submittedAt = new Date().toISOString();
      await db.query(
        "UPDATE submissions SET content = $1, submitted_at = $2 WHERE id = $3",
        [content, submittedAt, existing.id]
      );
      return { row: { id: existing.id, assignmentId, studentId, content, submittedAt } };
    } else {
      const submission: Submission = { id: generateId("sub"), assignmentId, studentId, content, submittedAt: new Date().toISOString() };
      await db.query(
        "INSERT INTO submissions (id, assignment_id, student_id, content, submitted_at) VALUES ($1,$2,$3,$4,$5)",
        [submission.id, assignmentId, studentId, content, submission.submittedAt]
      );
      return { row: submission };
    }
  },

  async findSubmissionForGrading(db: Queryable, submissionId: string) {
    return (await db.query("SELECT s.*, a.max_score, c.teacher_id FROM submissions s JOIN assignments a ON a.id = s.assignment_id JOIN courses c ON c.id = a.course_id WHERE s.id = $1", [submissionId])).rows[0] || null;
  },

  async grade(db: Queryable, submissionId: string, score: number, feedback: string) {
    await db.query("UPDATE submissions SET score = $1, feedback = $2, graded_at = $3 WHERE id = $4", [score, feedback, new Date().toISOString(), submissionId]);
    const submission = (await db.query("SELECT student_id FROM submissions WHERE id = $1", [submissionId])).rows[0];
    if (submission) await eventBus.emit("grade.saved", { studentId: submission.student_id, grade: score }, pool);
    return { id: submissionId, score, feedback };
  }
};
