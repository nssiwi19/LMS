import express from "express";
import { ZodSchema, z } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body.", issues: z.treeifyError(parsed.error) });
    }
    req.body = parsed.data;
    next();
  };
}

export const schemas = {
  login: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1)
  }),
  createUser: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8),
    name: z.string().trim().min(1),
    role: z.enum(["admin", "super_admin", "teacher", "student", "le_tan", "academic_admin", "finance", "advisor", "parent"]),
    phone: z.string().trim().optional(),
    linkedStudentId: z.string().trim().optional()
  }),
  setUserActive: z.object({
    isActive: z.boolean()
  }),
  createCourse: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    teacherId: z.string().trim().optional(),
    category: z.string().trim().min(1).default("General"),
    thumbnail: z.string().trim().optional(),
    price: z.coerce.number().min(0).default(0),
    level: z.string().trim().optional(),
    tags: z.array(z.string().trim()).default([])
  }),
  rejectCourse: z.object({
    rejectionReason: z.string().trim().min(1)
  }),
  addLesson: z.object({
    courseId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    videoUrl: z.string().trim().optional(),
    order: z.coerce.number().int().min(0),
    duration: z.string().trim().min(1)
  }),
  createQuiz: z.object({
    courseId: z.string().trim().min(1),
    lessonId: z.string().trim().optional(),
    title: z.string().trim().min(1),
    passingScore: z.coerce.number().min(0).max(100),
    timeLimit: z.coerce.number().int().min(1),
    maxAttempts: z.coerce.number().int().min(1)
  }),
  addQuestion: z.object({
    text: z.string().trim().min(1),
    type: z.enum(["single", "multiple", "text"]),
    options: z.array(z.string()).default([]),
    correctAnswer: z.string().trim().min(1)
  }),
  registerEnrollment: z.object({
    courseId: z.string().trim().min(1)
  }),
  toggleProgress: z.object({
    enrollmentId: z.string().trim().min(1),
    lessonId: z.string().trim().min(1)
  }),
  submitQuiz: z.object({
    quizId: z.string().trim().min(1),
    answers: z.record(z.string(), z.string()).default({}),
    startedAt: z.string().trim().optional()
  }),
  createAssignment: z.object({
    courseId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    deadline: z.string().trim().min(1),
    maxScore: z.coerce.number().min(1)
  }),
  submitAssignment: z.object({
    assignmentId: z.string().trim().min(1),
    content: z.string().trim().min(1)
  }),
  gradeAssignment: z.object({
    submissionId: z.string().trim().min(1),
    score: z.coerce.number().min(0),
    feedback: z.string().trim().default("")
  }),
  payTuition: z.object({
    feeId: z.string().trim().min(1),
    paidAmount: z.coerce.number().positive()
  }),
  reviewTransaction: z.object({
    status: z.enum(["approved", "rejected"]),
    notes: z.string().trim().optional()
  }),
  attendanceSession: z.object({
    courseId: z.string().trim().min(1),
    semesterId: z.string().trim().optional(),
    date: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    records: z.array(z.object({
      studentId: z.string().trim().min(1),
      status: z.enum(["present", "absent", "late", "excused"]),
      note: z.string().trim().optional()
    })).default([])
  }),
  attendanceRecord: z.object({
    sessionId: z.string().trim().min(1),
    studentId: z.string().trim().min(1),
    status: z.enum(["present", "absent", "late", "excused"]),
    note: z.string().trim().optional()
  }),
  createWarning: z.object({
    studentId: z.string().trim().min(1),
    type: z.enum(["low_gpa", "low_attendance", "unpaid_fee", "exam_ban", "overdue_assignment"]),
    message: z.string().trim().min(1)
  }),
  addAdvisorNote: z.object({
    studentId: z.string().trim().min(1),
    content: z.string().trim().min(1),
    type: z.enum(["academic", "behavioral", "financial"])
  }),
  advisorNote: z.object({
    studentId: z.string().min(1),
    type: z.enum(["academic", "behavioral", "financial"]),
    content: z.string().min(1).max(2000),
    shareWithParent: z.boolean().default(false)
  }),
  advisorAssignment: z.object({
    advisorId: z.string().min(1),
    studentId: z.string().min(1),
    semesterId: z.string().optional()
  }),
  courseRegistration: z.object({
    sectionId: z.string().min(1)
  }),
  gradeAppeal: z.object({
    courseRegistrationId: z.string().min(1),
    reason: z.string().min(1).max(2000)
  }),
  gradeAppealReview: z.object({
    revisedGrade: z.string().optional()
  }),
  gradeAppealResolve: z.object({
    status: z.enum(["approved", "rejected"]),
    resolutionNote: z.string().optional()
  }),
  leaveRequest: z.object({
    type: z.enum(["medical", "personal", "financial"]),
    semesterId: z.string().min(1),
    reason: z.string().min(1).max(2000),
    resumeSemesterId: z.string().optional()
  }),
  reviewNote: z.object({
    reviewNote: z.string().optional()
  }),
  scholarship: z.object({
    name: z.string().min(1),
    type: z.enum(["full", "partial", "merit", "need-based"]),
    amount: z.coerce.number().optional(),
    discountPercent: z.coerce.number().optional(),
    semesterId: z.string().optional(),
    conditions: z.string().optional()
  }),
  scholarshipApplication: z.object({
    scholarshipId: z.string().min(1),
    semesterId: z.string().min(1)
  }),
  graduationApplicationReview: z.object({
    note: z.string().optional()
  }),
  updateProfile: z.object({
    phone: z.string().trim().optional(),
    dateOfBirth: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    address: z.string().trim().optional(),
    guardianName: z.string().trim().optional(),
    guardianPhone: z.string().trim().optional()
  }),
  updateStudentNotes: z.object({
    notes: z.string().min(1)
  })
};
