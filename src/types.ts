export type UserRole =
  | "super_admin"
  | "admin"
  | "academic_admin"
  | "finance"
  | "advisor"
  | "teacher"
  | "student"
  | "parent"
  | "le_tan";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  createdAt: string;
  linkedStudentId?: string; // parent account links to student
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  status: "draft" | "pending" | "published" | "rejected";
  category: string;
  thumbnail?: string;
  price?: number;
  level?: "Cơ bản" | "Trung cấp" | "Nâng cao";
  tags?: string[];
  rejectionReason?: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  videoUrl?: string;
  order: number;
  duration: string; // e.g. "15 mins"
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: "active" | "completed" | "cancelled" | "pending_payment";
  enrolledAt: string;
  completedAt?: string;
}

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  lessonId?: string; // or linked to course directly
  title: string;
  passingScore: number; // e.g. 70 for 70%
  timeLimit: number; // in mins
  maxAttempts: number;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: "single" | "multiple" | "text";
  options: string[]; // only for single or multiple
  correctAnswer: string; // indices comma-separated for multi, or text
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: Record<string, string>; // questionId -> answer
  score: number; // computed percentage
  passed: boolean;
  startedAt: string;
  submittedAt: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: string;
  maxScore: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
}

export interface Certificate {
  id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  issuedAt: string;
  certificateCode: string; // 8-char alphanumeric
}

export interface Notification {
  id: string;
  userId: string;
  type: string; // e.g., "info", "success", "warning", "danger"
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  content: string;
  replies: ForumReply[];
  createdAt: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string;
  type: "fall" | "spring" | "summer";
  startDate: string;
  endDate: string;
  registrationOpen: string;
  registrationClose: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headTeacherId: string;
  description: string;
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  type: "certificate" | "diploma" | "degree";
  totalCredits: number;
  description: string;
}

export interface ProgramCourse {
  id: string;
  programId: string;
  courseId: string;
  credits: number;
  isRequired: boolean;
  semester: number;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentCode: string;
  programId: string;
  departmentId: string;
  academicYear: number;
  enrollmentDate: string;
  expectedGraduation: string;
  status: "active" | "on-leave" | "suspended" | "graduated" | "withdrawn";
  gpa: number;
  totalCreditsEarned: number;
  address?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  notes?: string;
  feeHold?: boolean;
  academicProbation?: boolean;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  semesterId: string;
  teacherId: string;
  date: string;
  topic: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  note?: string;
}

export interface TuitionFee {
  id: string;
  studentId: string;
  semesterId: string;
  amount: number;
  dueDate: string;
  status: "unpaid" | "partial" | "paid";
  paidAmount: number;
  paidAt?: string;
  receiptCode?: string;
}

export interface AcademicWarning {
  id: string;
  studentId: string;
  type: "low_gpa" | "low_attendance" | "unpaid_fee" | "exam_ban" | "overdue_assignment" | "low-gpa" | "attendance" | "unpaid-fee" | "overdue-assignment";
  courseId?: string;
  message: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface OfficialTranscriptEntry {
  courseId: string;
  courseName: string;
  credits: number;
  grade: number;
  letterGrade: "A" | "B" | "C" | "D" | "F";
  semesterId: string;
}

export interface OfficialTranscript {
  id: string;
  studentId: string;
  entries: OfficialTranscriptEntry[];
  cumulativeGpa: number;
  totalCredits: number;
  generatedAt: string;
}

export interface AdvisorNote {
  id: string;
  advisorId: string;
  studentId: string;
  content: string;
  type: "academic" | "behavioral" | "financial";
  shareWithParent?: boolean;
  createdAt: string;
}

export interface CourseSection {
  id: string;
  courseId: string;
  semesterId: string;
  teacherId: string;
  sectionCode: string;          // e.g. "CS101-01"
  maxStudents: number;          // capacity cap
  schedule: Array<{ dayOfWeek: string; startTime: string; endTime: string; room: string }>;
  status: "open" | "closed" | "cancelled";
}

export interface RegistrationPeriod {
  id: string;
  semesterId: string;
  name: string;
  startDate: string;
  endDate: string;
  allowedYears: number[];   // which year-of-study can register
  isOpen: boolean;
}

export interface CourseRegistration {
  id: string;
  studentId: string;
  sectionId: string;
  semesterId: string;
  status: "registered" | "waitlisted" | "dropped" | "withdrawn" | "completed" | "failed";
  registeredAt: string;
  droppedAt?: string;
  grade?: string;
  letterGrade?: string;
  gradePoint?: number;
  credits: number;
  isRetake?: boolean;                // true if student previously failed this course
  examBan?: boolean;
  gradePostedAt?: string;
}

export interface Scholarship {
  id: string;
  name: string;
  type: "full" | "partial" | "merit" | "need-based";
  amount?: number;                 // fixed amount OR
  discountPercent?: number;        // percentage off tuition
  semesterId: string;
  conditions: string;      // description of eligibility
}

export interface ScholarshipApplication {
  id: string;
  studentId: string;
  scholarshipId: string;
  semesterId: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface GradeAppeal {
  id: string;
  studentId: string;
  courseRegistrationId: string;
  reason: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  originalGrade: number;
  revisedGrade?: number;
  submittedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface AdvisorAssignment {
  id: string;
  advisorId: string;
  studentId: string;
  semesterId: string;
  assignedAt: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  type: "medical" | "personal" | "financial";
  semesterId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
  resumeSemesterId: string;        // semester they plan to return
}

export interface GraduationApplication {
  id: string;
  studentId: string;
  status: "pending" | "eligible" | "approved" | "rejected";
  appliedAt: string;
  reviewedBy?: string;
  totalCreditsAtApplication: number;
  gpaAtApplication: number;
  note?: string;
}

export interface SystemEvent {
  id: string;
  type: string;
  payload: any;
  triggeredAt: string;
  processed: boolean;
}

export interface LMSDataStore {
  users: User[];
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  quizzes: Quiz[];
  questions: Question[];
  quizAttempts: QuizAttempt[];
  assignments: Assignment[];
  submissions: Submission[];
  certificates: Certificate[];
  notifications: Notification[];
  forumPosts: ForumPost[];
  auditLogs: AuditLog[];
  transactions: Transaction[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  departments: Department[];
  programs: Program[];
  programCourses: ProgramCourse[];
  studentProfiles: StudentProfile[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  tuitionFees: TuitionFee[];
  academicWarnings: AcademicWarning[];
  officialTranscripts: OfficialTranscript[];
  advisorNotes: AdvisorNote[];
  courseSections?: CourseSection[];
  registrationPeriods?: RegistrationPeriod[];
  courseRegistrations?: CourseRegistration[];
  scholarships?: Scholarship[];
  scholarshipApplications?: ScholarshipApplication[];
  gradeAppeals?: GradeAppeal[];
  advisorAssignments?: AdvisorAssignment[];
  leaveRequests?: LeaveRequest[];
  graduationApplications?: GraduationApplication[];
  systemEvents?: SystemEvent[];
}
