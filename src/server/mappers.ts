import { AcademicWarning, Assignment, Course, Enrollment, LessonProgress, Question, Quiz, QuizAttempt, Submission, TuitionFee, User, UserRole } from "../types";

export type DbUserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt?: string | null;
  name: string;
  role: UserRole;
  is_active: number | boolean;
  phone?: string | null;
  linked_student_id?: string | null;
  created_at: string;
};

export function normalizeRole(role: string): UserRole {
  if (role === "ke_toan") return "finance";
  if (role === "quan_ly_hoc_vu" || role === "academic") return "academic_admin";
  return role as UserRole;
}

export function denormalizeRole(role: string): string {
  if (role === "academic" || role === "quan_ly_hoc_vu") return "academic_admin";
  return role;
}

export function toPublicUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: "",
    name: row.name,
    role: normalizeRole(row.role),
    isActive: Boolean(row.is_active),
    phone: row.phone || undefined,
    linkedStudentId: row.linked_student_id || undefined,
    createdAt: row.created_at
  };
}

export function courseFromRow(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    teacherId: row.teacher_id,
    status: row.status,
    category: row.category,
    thumbnail: row.thumbnail || undefined,
    price: row.price === null || row.price === undefined ? undefined : Number(row.price),
    level: row.level || undefined,
    tags: row.tags_json ? JSON.parse(row.tags_json) : [],
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at
  };
}

export function enrollmentFromRow(row: any): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    status: row.status,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at || undefined
  };
}

export function lessonProgressFromRow(row: any): LessonProgress {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    lessonId: row.lesson_id,
    completed: Boolean(row.completed),
    completedAt: row.completed_at || undefined
  };
}

export function quizFromRow(row: any): Quiz {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id || undefined,
    title: row.title,
    passingScore: Number(row.passing_score),
    timeLimit: Number(row.time_limit),
    maxAttempts: Number(row.max_attempts)
  };
}

export function questionFromRow(row: any): Question {
  return {
    id: row.id,
    quizId: row.quiz_id,
    text: row.text,
    type: row.type,
    options: row.options_json ? JSON.parse(row.options_json) : [],
    correctAnswer: row.correct_answer
  };
}

export function quizAttemptFromRow(row: any): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    studentId: row.student_id,
    answers: row.answers_json ? JSON.parse(row.answers_json) : {},
    score: Number(row.score),
    passed: Boolean(row.passed),
    startedAt: row.started_at,
    submittedAt: row.submitted_at
  };
}

export function assignmentFromRow(row: any): Assignment {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    deadline: row.deadline,
    maxScore: Number(row.max_score)
  };
}

export function submissionFromRow(row: any): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    content: row.content,
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    feedback: row.feedback || undefined,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at || undefined
  };
}

export function tuitionFeeFromRow(row: any): TuitionFee {
  return {
    id: row.id,
    studentId: row.student_id,
    semesterId: row.semester_id || "",
    amount: Number(row.amount),
    dueDate: row.due_date,
    status: row.status,
    paidAmount: Number(row.paid_amount || 0),
    paidAt: row.paid_at || undefined,
    receiptCode: row.receipt_code || undefined
  };
}

export function academicWarningFromRow(row: any): AcademicWarning {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    courseId: row.course_id || undefined,
    message: row.message,
    isResolved: Boolean(row.is_resolved),
    resolvedBy: row.resolved_by || undefined,
    resolvedAt: row.resolved_at || undefined,
    createdAt: row.created_at
  };
}
