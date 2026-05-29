import { Assignment, LMSDataStore, Quiz, QuizAttempt, Submission } from "./types";

export type CanonicalWarningType =
  | "low_gpa"
  | "low_attendance"
  | "unpaid_fee"
  | "exam_ban"
  | "overdue_assignment";

const WARNING_TYPE_ALIASES: Record<string, CanonicalWarningType> = {
  low_gpa: "low_gpa",
  "low-gpa": "low_gpa",
  low_attendance: "low_attendance",
  attendance: "low_attendance",
  unpaid_fee: "unpaid_fee",
  "unpaid-fee": "unpaid_fee",
  exam_ban: "exam_ban",
  overdue_assignment: "overdue_assignment",
  "overdue-assignment": "overdue_assignment"
};

export function normalizeWarningType(type: string): CanonicalWarningType {
  return WARNING_TYPE_ALIASES[type] ?? "low_gpa";
}

export function warningTypesMatch(a: string, b: string): boolean {
  return normalizeWarningType(a) === normalizeWarningType(b);
}

export function warningTypeLabel(type: string): string {
  switch (normalizeWarningType(type)) {
    case "low_attendance":
      return "Chuyên cần";
    case "low_gpa":
      return "Kết quả học tập";
    case "unpaid_fee":
      return "Học phí";
    case "exam_ban":
      return "Cấm thi";
    case "overdue_assignment":
      return "Bài tập quá hạn";
    default:
      return "Học thuật";
  }
}

export function percentToLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function percentToGradePoint(letterGrade: string): number {
  const map: Record<string, number> = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0, W: 0.0 };
  return map[letterGrade] ?? 0.0;
}

export type CourseGradeInputs = {
  quizScores: number[];
  assignmentScoresPercent: number[];
};

export type CourseGradeResult = {
  finalPercent: number | null;
  hasGrades: boolean;
  assignmentAvg: number | null;
  quizAvg: number | null;
  letterGrade: string | null;
  gradePoint: number | null;
  countsForGpa: boolean;
};

export function calculateCourseGradePercent(input: CourseGradeInputs): CourseGradeResult {
  const assignmentAvg = input.assignmentScoresPercent.length > 0
    ? Math.round(input.assignmentScoresPercent.reduce((sum, score) => sum + score, 0) / input.assignmentScoresPercent.length)
    : null;
  const quizAvg = input.quizScores.length > 0
    ? Math.round(input.quizScores.reduce((sum, score) => sum + score, 0) / input.quizScores.length)
    : null;

  let finalPercent: number | null = null;
  if (assignmentAvg !== null && quizAvg !== null) {
    finalPercent = Math.round(assignmentAvg * 0.3 + quizAvg * 0.7);
  } else if (assignmentAvg !== null) {
    finalPercent = assignmentAvg;
  } else if (quizAvg !== null) {
    finalPercent = quizAvg;
  }

  if (finalPercent === null) {
    return {
      finalPercent: null,
      hasGrades: false,
      assignmentAvg,
      quizAvg,
      letterGrade: null,
      gradePoint: null,
      countsForGpa: false
    };
  }

  const letterGrade = percentToLetterGrade(finalPercent);
  return {
    finalPercent,
    hasGrades: true,
    assignmentAvg,
    quizAvg,
    letterGrade,
    gradePoint: percentToGradePoint(letterGrade),
    countsForGpa: finalPercent >= 60
  };
}

export function collectCourseGradeInputs(
  store: Pick<LMSDataStore, "quizzes" | "quizAttempts" | "assignments" | "submissions">,
  studentId: string,
  courseId: string
): CourseGradeInputs {
  const courseQuizzes = store.quizzes.filter((quiz: Quiz) => quiz.courseId === courseId);
  const quizScores = courseQuizzes
    .map((quiz) => {
      const attempts = store.quizAttempts.filter(
        (attempt: QuizAttempt) => attempt.studentId === studentId && attempt.quizId === quiz.id
      );
      return attempts.length > 0 ? Math.max(...attempts.map((attempt) => attempt.score)) : null;
    })
    .filter((score): score is number => score !== null);

  const courseAssignments = store.assignments.filter((assignment: Assignment) => assignment.courseId === courseId);
  const assignmentScoresPercent = store.submissions
    .filter(
      (submission: Submission) =>
        submission.studentId === studentId &&
        courseAssignments.some((assignment) => assignment.id === submission.assignmentId) &&
        submission.score !== undefined
    )
    .map((submission) => {
      const assignment = store.assignments.find((item) => item.id === submission.assignmentId);
      const maxScore = assignment?.maxScore || 100;
      return Math.round(((submission.score || 0) / maxScore) * 100);
    });

  return { quizScores, assignmentScoresPercent };
}
