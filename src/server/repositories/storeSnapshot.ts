import { getInitialStore } from "../../store";
import { Course, Enrollment, LessonProgress, User } from "../../types";
import { Queryable } from "../db";
import { assignmentFromRow, courseFromRow, DbUserRow, enrollmentFromRow, questionFromRow, quizAttemptFromRow, quizFromRow, submissionFromRow, toPublicUser, tuitionFeeFromRow, academicWarningFromRow } from "../mappers";

// In-memory cache variables to optimize server performance
let cachedSnapshot: any = null;
let lastCacheTime = 0;
const CACHE_TTL = 15000; // 15 giây TTL dự phòng an toàn

export function invalidateStoreCache() {
  cachedSnapshot = null;
  lastCacheTime = 0;
}

export async function storeSnapshotFromDb(db: Queryable, forceBypassCache = false) {
  const now = Date.now();
  if (!forceBypassCache && cachedSnapshot && (now - lastCacheTime < CACHE_TTL)) {
    return cachedSnapshot;
  }
  const [
    usersRes,
    coursesRes,
    lessonsRes,
    enrollmentsRes,
    lessonProgressRes,
    quizzesRes,
    questionsRes,
    quizAttemptsRes,
    assignmentsRes,
    submissionsRes,
    tuitionFeesRes,
    academicWarningsRes,
    auditLogsRes,
    academicYearsRes,
    semestersRes,
    departmentsRes,
    programsRes,
    programCoursesRes,
    studentProfilesRes,
    attendanceSessionsRes,
    attendanceRecordsRes,
    notificationsRes,
    transactionsRes,
    advisorNotesRes,
    courseSectionsRes,
    registrationPeriodsRes,
    courseRegistrationsRes,
    scholarshipsRes,
    scholarshipApplicationsRes,
    gradeAppealsRes,
    advisorAssignmentsRes,
    leaveRequestsRes,
    graduationApplicationsRes,
    certificatesRes,
    forumRepliesRes,
    forumPostsRes
  ] = await Promise.all([
    db.query<DbUserRow>("SELECT * FROM users"),
    db.query("SELECT * FROM courses"),
    db.query("SELECT * FROM lessons"),
    db.query("SELECT * FROM enrollments"),
    db.query("SELECT * FROM lesson_progress"),
    db.query("SELECT * FROM quizzes"),
    db.query("SELECT * FROM questions"),
    db.query("SELECT * FROM quiz_attempts"),
    db.query("SELECT * FROM assignments"),
    db.query("SELECT * FROM submissions"),
    db.query("SELECT * FROM tuition_fees"),
    db.query("SELECT * FROM academic_warnings"),
    db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200"),
    db.query("SELECT * FROM academic_years"),
    db.query("SELECT * FROM semesters"),
    db.query("SELECT * FROM departments"),
    db.query("SELECT * FROM programs"),
    db.query("SELECT * FROM program_courses"),
    db.query("SELECT * FROM student_profiles"),
    db.query("SELECT * FROM attendance_sessions"),
    db.query("SELECT * FROM attendance_records"),
    db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200"),
    db.query("SELECT * FROM transactions ORDER BY created_at DESC"),
    db.query("SELECT * FROM advisor_notes"),
    db.query("SELECT * FROM course_sections"),
    db.query("SELECT * FROM registration_periods"),
    db.query("SELECT * FROM course_registrations"),
    db.query("SELECT * FROM scholarships"),
    db.query("SELECT * FROM scholarship_applications"),
    db.query("SELECT * FROM grade_appeals"),
    db.query("SELECT * FROM advisor_assignments"),
    db.query("SELECT * FROM leave_requests"),
    db.query("SELECT * FROM graduation_applications"),
    db.query("SELECT * FROM certificates"),
    db.query("SELECT * FROM forum_replies"),
    db.query("SELECT * FROM forum_posts")
  ]);

  const users = usersRes.rows.map(toPublicUser);
  const courses = coursesRes.rows.map(courseFromRow);
  const lessons = lessonsRes.rows.map(row => ({ id: row.id, courseId: row.course_id, title: row.title, content: row.content, videoUrl: row.video_url || undefined, order: row.lesson_order, duration: row.duration }));
  const enrollments = enrollmentsRes.rows.map(enrollmentFromRow);
  const lessonProgress = lessonProgressRes.rows.map(row => ({ id: row.id, enrollmentId: row.enrollment_id, lessonId: row.lesson_id, completed: Boolean(row.completed), completedAt: row.completed_at || undefined }));
  const quizzes = quizzesRes.rows.map(quizFromRow);
  const questions = questionsRes.rows.map(questionFromRow);
  const quizAttempts = quizAttemptsRes.rows.map(quizAttemptFromRow);
  const assignments = assignmentsRes.rows.map(assignmentFromRow);
  const submissions = submissionsRes.rows.map(submissionFromRow);
  const tuitionFees = tuitionFeesRes.rows.map(tuitionFeeFromRow);
  const academicWarnings = academicWarningsRes.rows.map(academicWarningFromRow);
  const auditLogs = auditLogsRes.rows.map(row => ({ id: row.id, userId: row.user_id, action: row.action, target: row.target, detail: row.detail || "", createdAt: row.created_at }));

  // New academic structural tables
  const academicYears = academicYearsRes.rows.map(row => ({ id: row.id, name: row.name, startDate: row.start_date, endDate: row.end_date, isCurrent: Boolean(row.is_current) }));
  const semesters = semestersRes.rows.map(row => ({ id: row.id, academicYearId: row.academic_year_id, name: row.name, type: row.type, startDate: row.start_date, endDate: row.end_date, registrationOpen: row.registration_open, registrationClose: row.registration_close }));
  const departments = departmentsRes.rows.map(row => ({ id: row.id, name: row.name, code: row.code, headTeacherId: row.head_teacher_id, description: row.description }));
  const programs = programsRes.rows.map(row => ({ id: row.id, departmentId: row.department_id, name: row.name, code: row.code, type: row.type, totalCredits: row.total_credits, description: row.description }));
  const programCourses = programCoursesRes.rows.map(row => ({ id: row.id, programId: row.program_id, courseId: row.course_id, credits: row.credits, isRequired: Boolean(row.is_required), semester: row.semester }));

  // Missing Student Profiles, Attendance, Notifications & Transactions
  const studentProfiles = studentProfilesRes.rows.map(row => ({ id: row.id, userId: row.user_id, studentCode: row.student_code, programId: row.program_id, departmentId: row.department_id, academicYear: row.academic_year, enrollmentDate: row.enrollment_date, expectedGraduation: row.expected_graduation, status: row.status, gpa: Number(row.gpa), totalCreditsEarned: row.total_credits_earned, address: row.address || undefined, phone: row.phone || undefined, dateOfBirth: row.date_of_birth || undefined, gender: row.gender || undefined, guardianName: row.guardian_name || undefined, guardianPhone: row.guardian_phone || undefined, guardianEmail: row.guardian_email || undefined, notes: row.notes || undefined, feeHold: Boolean(row.fee_hold), academicProbation: Boolean(row.academic_probation) }));
  const attendanceSessions = attendanceSessionsRes.rows.map(row => ({ id: row.id, courseId: row.course_id, semesterId: row.semester_id, teacherId: row.teacher_id, date: row.date || row.session_date, topic: row.topic }));
  const attendanceRecords = attendanceRecordsRes.rows.map(row => ({ id: row.id, sessionId: row.session_id, studentId: row.student_id, status: row.status, note: row.note || undefined }));
  const notifications = notificationsRes.rows.map(row => ({ id: row.id, userId: row.user_id, type: row.type, message: row.message, isRead: Boolean(row.is_read), createdAt: row.created_at }));
  const transactions = transactionsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, courseId: row.course_id, amount: Number(row.amount), status: row.status, paymentMethod: row.payment_method, createdAt: row.created_at, processedAt: row.processed_at || undefined, processedBy: row.processed_by || undefined, notes: row.notes || undefined }));
  const advisorNotes = advisorNotesRes.rows.map(row => ({ id: row.id, advisorId: row.advisor_id, studentId: row.student_id, content: row.content, type: row.type, createdAt: row.created_at }));

  // Missing registration & requests
  const courseSections = courseSectionsRes.rows.map(row => ({ id: row.id, courseId: row.course_id, semesterId: row.semester_id, teacherId: row.teacher_id, sectionCode: row.section_code, maxStudents: row.max_students, schedule: typeof row.schedule === "string" ? JSON.parse(row.schedule || "[]") : row.schedule || JSON.parse(row.schedule_json || "[]"), status: row.status }));
  const registrationPeriods = registrationPeriodsRes.rows.map(row => ({ id: row.id, semesterId: row.semester_id, name: row.name, startDate: row.start_date, endDate: row.end_date, allowedYears: Array.isArray(row.allowed_years) ? row.allowed_years.map(Number) : JSON.parse(row.allowed_years_json || '[]'), isOpen: Boolean(row.is_open) }));
  const courseRegistrations = courseRegistrationsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, sectionId: row.section_id, semesterId: row.semester_id, status: row.status, registeredAt: row.registered_at, droppedAt: row.dropped_at || undefined, grade: row.grade || undefined, letterGrade: row.letter_grade || undefined, gradePoint: row.grade_point === null ? undefined : Number(row.grade_point), credits: row.credits, isRetake: Boolean(row.is_retake) }));
  const scholarships = scholarshipsRes.rows.map(row => ({ id: row.id, name: row.name, type: row.type, amount: row.amount === null ? undefined : Number(row.amount), discountPercent: row.discount_percent === null ? undefined : Number(row.discount_percent), semesterId: row.semester_id, conditions: row.conditions }));
  const scholarshipApplications = scholarshipApplicationsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, scholarshipId: row.scholarship_id, semesterId: row.semester_id, status: row.status, appliedAt: row.applied_at, reviewedBy: row.reviewed_by || undefined, reviewNote: row.review_note || undefined }));
  const gradeAppeals = gradeAppealsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, courseRegistrationId: row.course_registration_id, reason: row.reason, status: row.status, originalGrade: Number(row.original_grade), revisedGrade: row.revised_grade === null ? undefined : Number(row.revised_grade), submittedAt: row.submitted_at, resolvedAt: row.resolved_at || undefined, resolvedBy: row.resolved_by || undefined, resolutionNote: row.resolution_note || undefined }));
  const advisorAssignments = advisorAssignmentsRes.rows.map(row => ({ id: row.id, advisorId: row.advisor_id, studentId: row.student_id, semesterId: row.semester_id, assignedAt: row.assigned_at }));
  const leaveRequests = leaveRequestsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, type: row.type, semesterId: row.semester_id, reason: row.reason, status: row.status, requestedAt: row.requested_at, reviewedBy: row.reviewed_by || undefined, reviewNote: row.review_note || undefined, resumeSemesterId: row.resume_semester_id }));
  const graduationApplications = graduationApplicationsRes.rows.map(row => ({ id: row.id, studentId: row.student_id, status: row.status, appliedAt: row.applied_at, reviewedBy: row.reviewed_by || undefined, totalCreditsAtApplication: row.total_credits_at_application, gpaAtApplication: Number(row.gpa_at_application), note: row.note || undefined }));
  const certificates = certificatesRes.rows.map(row => ({ id: row.id, enrollmentId: row.enrollment_id, studentId: row.student_id, courseId: row.course_id, issuedAt: row.issued_at, certificateCode: row.certificate_code }));

  const forumReplies = forumRepliesRes.rows.map(row => ({ id: row.id, postId: row.post_id, authorId: row.author_id, content: row.content, createdAt: row.created_at }));
  const forumPosts = forumPostsRes.rows.map(row => {
    const postReplies = forumReplies.filter(r => r.postId === row.id);
    return { id: row.id, courseId: row.course_id, authorId: row.author_id, title: row.title, content: row.content, replies: postReplies, createdAt: row.created_at };
  });

  const snapshot = {
    ...getInitialStore(),
    users,
    courses,
    lessons,
    enrollments,
    lessonProgress,
    quizzes,
    questions,
    quizAttempts,
    assignments,
    submissions,
    tuitionFees,
    academicWarnings,
    auditLogs,
    academicYears,
    semesters,
    departments,
    programs,
    programCourses,
    studentProfiles,
    attendanceSessions,
    attendanceRecords,
    notifications,
    transactions,
    advisorNotes,
    courseSections,
    registrationPeriods,
    courseRegistrations,
    scholarships,
    scholarshipApplications,
    gradeAppeals,
    advisorAssignments,
    leaveRequests,
    graduationApplications,
    certificates,
    forumPosts
  };

  cachedSnapshot = snapshot;
  lastCacheTime = Date.now();
  return snapshot;
}

export function limitStoreForRole(store: any, user: User) {
  if (user.role === "admin" || user.role === "super_admin" || user.role === "academic_admin") {
    return {
      ...store,
      users: store.users.map((item: User) => ({ ...item, passwordHash: "" }))
    };
  }

  if (user.role === "teacher") {
    const teacherCourseIds = new Set(store.courses.filter((course: Course) => course.teacherId === user.id).map((course: Course) => course.id));
    const visibleEnrollments = store.enrollments.filter((item: Enrollment) => teacherCourseIds.has(item.courseId));
    const visibleStudentIds = new Set(visibleEnrollments.map((item: Enrollment) => item.studentId));
    visibleStudentIds.add(user.id);
    return {
      ...store,
      users: store.users.filter((item: User) => visibleStudentIds.has(item.id) || item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" })),
      courses: store.courses.filter((course: Course) => teacherCourseIds.has(course.id)),
      enrollments: visibleEnrollments,
      lessonProgress: store.lessonProgress.filter((item: LessonProgress) => visibleEnrollments.some((enroll: Enrollment) => enroll.id === item.enrollmentId)),
      quizzes: store.quizzes.filter((quiz: any) => teacherCourseIds.has(quiz.courseId)),
      assignments: store.assignments.filter((assignment: any) => teacherCourseIds.has(assignment.courseId)),
      submissions: store.submissions.filter((submission: any) => visibleStudentIds.has(submission.studentId))
    };
  }

  if (user.role === "student") {
    const myEnrollments = store.enrollments.filter((item: Enrollment) => item.studentId === user.id);
    const myCourseIds = new Set(myEnrollments.map((item: Enrollment) => item.courseId));
    return {
      ...store,
      users: store.users.filter((item: User) => item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" })),
      enrollments: myEnrollments,
      lessonProgress: store.lessonProgress.filter((item: LessonProgress) => myEnrollments.some((enroll: Enrollment) => enroll.id === item.enrollmentId)),
      quizAttempts: store.quizAttempts.filter((item: any) => item.studentId === user.id),
      submissions: store.submissions.filter((item: any) => item.studentId === user.id),
      tuitionFees: store.tuitionFees.filter((item: any) => item.studentId === user.id),
      academicWarnings: store.academicWarnings.filter((item: any) => item.studentId === user.id),
      assignments: store.assignments.filter((item: any) => myCourseIds.has(item.courseId)),
      notifications: store.notifications.filter((item: any) => item.userId === user.id)
    };
  }

  if (user.role === "parent") {
    const childId = user.linkedStudentId || "";
    const childEnrollments = store.enrollments.filter((item: Enrollment) => item.studentId === childId);
    const childCourseIds = new Set(childEnrollments.map((item: Enrollment) => item.courseId));
    return {
      ...store,
      users: store.users.filter((item: User) => item.id === user.id || item.id === childId).map((item: User) => ({ ...item, passwordHash: "" })),
      enrollments: childEnrollments,
      lessonProgress: store.lessonProgress.filter((item: LessonProgress) => childEnrollments.some((enroll: Enrollment) => enroll.id === item.enrollmentId)),
      quizAttempts: store.quizAttempts.filter((item: any) => item.studentId === childId),
      submissions: store.submissions.filter((item: any) => item.studentId === childId),
      tuitionFees: store.tuitionFees.filter((item: any) => item.studentId === childId),
      academicWarnings: store.academicWarnings.filter((item: any) => item.studentId === childId),
      assignments: store.assignments.filter((item: any) => childCourseIds.has(item.courseId)),
      studentProfiles: store.studentProfiles.filter((item: any) => item.userId === childId),
      notifications: store.notifications.filter((item: any) => item.userId === user.id || item.userId === childId)
    };
  }

  if (user.role === "finance" || user.role === "le_tan") {
    return {
      ...store,
      users: store.users.map((item: User) => ({ ...item, passwordHash: "" })),
      notifications: store.notifications.filter((item: any) => item.userId === user.id)
    };
  }

  return {
    ...store,
    users: store.users.filter((item: User) => item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" })),
    enrollments: [],
    lessonProgress: [],
    quizAttempts: [],
    submissions: [],
    tuitionFees: [],
    academicWarnings: [],
    assignments: []
  };
}
