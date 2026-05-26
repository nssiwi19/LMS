import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  Bookmark, 
  Award, 
  Send, 
  Clock, 
  Play, 
  Check, 
  Lock, 
  User, 
  Bell, 
  Search, 
  ChevronRight, 
  ArrowRight,
  HelpCircle,
  FileCheck,
  AlertCircle,
  X,
  FileText,
  CreditCard,
  Phone,
  Calendar,
  Home,
  Shield,
  Activity,
  DollarSign,
  Printer,
  FileSpreadsheet,
  Cpu,
  ChevronUp,
  BadgeAlert
} from "lucide-react";
import { LMSDataStore, User as UserType, Course, Lesson, Enrollment, LessonProgress, Quiz, Question, QuizAttempt, Assignment, Submission, Certificate, Notification, Transaction, AttendanceRecord, AttendanceSession, TuitionFee, AcademicWarning } from "../types";
import { AppStore } from "../store";
import CourseCatalog from "./student/CourseCatalog";
import MyLearningWorkspace from "./student/MyLearningWorkspace";
import QuizConsole from "./student/QuizConsole";
import AssignmentSubmit from "./student/AssignmentSubmit";
import StudentAcademics from "./student/StudentAcademics";
import ParentPanel from "./ParentPanel";
import { generateId, escapeHTML } from "../utils";
import { useApiStore } from "../hooks/apiHooks";
import { api } from "../api";

interface StudentPanelProps {
  currentUser: UserType;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function StudentPanel({ currentUser, onLogout, onRefreshData }: StudentPanelProps) {
  const { store, isLoading, isError } = useApiStore();


  // Safeguard StudentProfile backfill so it never crashes
  const studentProfiles = store.studentProfiles || [];
  let myProfile = studentProfiles.find(p => p.userId === currentUser.id);
  if (!myProfile) {
    myProfile = {
      id: "profile_" + currentUser.id,
      userId: currentUser.id,
      studentCode: "SV2025" + currentUser.id.slice(-4),
      programId: "prog_se",
      departmentId: "dept_cs",
      academicYear: 1,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      expectedGraduation: "2029-06-30",
      status: "active",
      gpa: 0.0,
      totalCreditsEarned: 0,
      phone: "",
      dateOfBirth: "",
      gender: "Nam",
      address: "",
      guardianName: "",
      guardianPhone: ""
    };
  }

  // Profile forms editable fields states
  const [editPhone, setEditPhone] = useState(myProfile.phone || "");
  const [editBirth, setEditBirth] = useState(myProfile.dateOfBirth || "");
  const [editGender, setEditGender] = useState(myProfile.gender || "Nam");
  const [editAddress, setEditAddress] = useState(myProfile.address || "");
  const [editParent, setEditParent] = useState(myProfile.guardianName || "");
  const [editParentPhone, setEditParentPhone] = useState(myProfile.guardianPhone || "");
  const [showProfileEditForm, setShowProfileEditForm] = useState(false);

  // Active Transcript Print view overlay
  const [showPrintTranscript, setShowPrintTranscript] = useState(false);

  // Local navigation states
  const [activeSubTab, setActiveSubTab] = useState<
    | "catalog" 
    | "learning" 
    | "quizzes" 
    | "assignments" 
    | "certificates" 
    | "notifications"
    | "profile"
    | "academics_record"
    | "student_attendance"
    | "student_tuition"
    | "student_transcript"
    | "parent_view"
  >("profile");

  // Payment popup state
  const [paymentGuideTx, setPaymentGuideTx] = useState<Transaction | null>(null);

  // Notification pagination
  const [notifPage, setNotifPage] = useState(0);
  const NOTIF_PER_PAGE = 10;

  // User avatar dropdown menu state
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpOldPass, setCpOldPass] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");
  const [cpConfirmPass, setCpConfirmPass] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);

  // Mobile sidebar visibility
  const [showSidebar, setShowSidebar] = useState(false);

  // Ref for mobile scroll-to-content
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll-to-top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On mobile: scroll to content area when activeSubTab changes
  useEffect(() => {
    if (window.innerWidth < 1024 && contentRef.current) {
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [activeSubTab]);

  // Selection references
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null);
  const [learningCourseId, setLearningCourseId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Active Quiz taking session states
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(0);
  const [quizFinishedState, setQuizFinishedState] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: number;
    total: number;
  } | null>(null);

  // Assignment submissions states
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionCodeText, setSubmissionCodeText] = useState("");

  // Catalog filtering states
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Timer countdown effects
  useEffect(() => {
    if (activeQuizId && quizTimeRemaining > 0 && !quizFinishedState) {
      const interval = setInterval(() => {
        setQuizTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto submit
            handleAutoSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeQuizId, quizTimeRemaining, quizFinishedState]);


  // Compute active variables
  const publishedCourses = store.courses.filter(c => c.status === "published");
  const filteredCatalog = publishedCourses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          c.description.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = catalogCategory === "all" || c.category === catalogCategory;
    return matchesSearch && matchesCategory;
  });

  const myEnrollments = store.enrollments.filter(e => e.studentId === currentUser.id);
  const myEnrolledCourseIds = myEnrollments.map(e => e.courseId);

  // Handle Enrollment
  const handleEnrollIntoCourse = (courseId: string) => {
    const storeData = AppStore.get();
    const courseObj = storeData.courses.find(c => c.id === courseId);
    if (!courseObj) return;

    // Safety check
    if (storeData.enrollments.find(e => e.courseId === courseId && e.studentId === currentUser.id)) {
      triggerToast("Bạn đã có lượt đăng ký hoặc đang chờ phê duyệt học phí khóa học này!");
      return;
    }

    const price = courseObj.price || 0;
    
    if (price > 0) {
      // Create Enrollment with "pending_payment"
      const newEnroll: Enrollment = {
        id: generateId("enroll"),
        courseId,
        studentId: currentUser.id,
        status: "pending_payment",
        enrolledAt: new Date().toISOString()
      };

      // Create a Transaction with status "pending"
      const newTx: Transaction = {
        id: generateId("tx"),
        studentId: currentUser.id,
        courseId,
        amount: price,
        status: "pending",
        paymentMethod: "Chuyển khoản Ngân hàng (QR)",
        createdAt: new Date().toISOString()
      };

      storeData.enrollments.push(newEnroll);
      if (!storeData.transactions) storeData.transactions = [];
      storeData.transactions.push(newTx);
      
      AppStore.log(currentUser.id, "request_enroll_paid_course", courseId, `Học viên gửi yêu cầu đăng ký khóa học: ${courseObj.title}. Số tiền học phí: ${price} VND`);
      AppStore.notify(currentUser.id, "info", `Đã gửi yêu cầu đăng ký khóa học "${courseObj.title}". Vui lòng hoàn tất chuyển khoản chuyển khoản.`);
      AppStore.save(storeData);

      onRefreshData();
      triggerToast("Đã lập yêu cầu đăng ký học thành công!");
      setPaymentGuideTx(newTx);
    } else {
      // Free course -> Activate immediately
      const newEnroll: Enrollment = {
        id: generateId("enroll"),
        courseId,
        studentId: currentUser.id,
        status: "active",
        enrolledAt: new Date().toISOString()
      };

      storeData.enrollments.push(newEnroll);
      AppStore.log(currentUser.id, "enroll_course", courseId, "Đăng ký tham gia khóa đào tạo miễn phí thành công.");
      AppStore.notify(currentUser.id, "success", `Tham gia thành công khóa học miễn phí! Hãy vào tab "Lớp học của tôi" để bắt đầu.`);
      AppStore.save(storeData);

      onRefreshData();
      triggerToast("Đăng ký khóa học thành công!");
      setViewingCourseId(null);
      setActiveSubTab("learning");
    }
  };

  // Lesson Tick Mark Toggle
  const handleToggleLessonComplete = (enrollmentId: string, lessonId: string) => {
    const storeData = AppStore.get();
    const existingProgressIndex = storeData.lessonProgress.findIndex(
      p => p.enrollmentId === enrollmentId && p.lessonId === lessonId
    );

    let nextCompleted = true;

    if (existingProgressIndex !== -1) {
      nextCompleted = !storeData.lessonProgress[existingProgressIndex].completed;
      storeData.lessonProgress[existingProgressIndex].completed = nextCompleted;
      storeData.lessonProgress[existingProgressIndex].completedAt = nextCompleted ? new Date().toISOString() : undefined;
    } else {
      const progressItem: LessonProgress = {
        id: generateId("prog"),
        enrollmentId,
        lessonId,
        completed: true,
        completedAt: new Date().toISOString()
      };
      storeData.lessonProgress.push(progressItem);
    }

    // Auto complete curriculum check & quiz evaluation trigger!
    const activeEnroll = storeData.enrollments.find(e => e.id === enrollmentId);
    if (activeEnroll && nextCompleted) {
      const courseLessons = storeData.lessons.filter(l => l.courseId === activeEnroll.courseId);
      const studentProgressForEnroll = storeData.lessonProgress.filter(p => p.enrollmentId === enrollmentId && p.completed);

      // Check if all lessons are complete
      if (studentProgressForEnroll.length === courseLessons.length) {
        // Course completely viewed!
        AppStore.log(currentUser.id, "complete_syllabus_lessons", activeEnroll.courseId, "Lessons syllabus fully completed.");
        AppStore.notify(currentUser.id, "info", `Fabulous! You have read all learning lessons modules for your course. Take the final graduation quiz to earn certificates!`);
      }
    }

    AppStore.save(storeData);
    onRefreshData();
  };

  // Launch Quiz Parameters
  const handleStartQuiz = (quiz: Quiz) => {
    const studentAttemptsCount = store.quizAttempts.filter(
      qa => qa.quizId === quiz.id && qa.studentId === currentUser.id
    ).length;

    if (studentAttemptsCount >= quiz.maxAttempts) {
      triggerToast("Evaluation attempts exhausted on this profile directory!");
      return;
    }

    setActiveQuizId(quiz.id);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizFinishedState(null);
    setQuizTimeRemaining(quiz.timeLimit * 60);
  };

  const handleSelectQuizAnswer = (questionId: string, answerValue: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerValue
    }));
  };

  // Auto-submit on timer end or manual check
  const handleAutoSubmitQuiz = () => {
    if (!activeQuizId) return;
    const storeData = AppStore.get();
    const quiz = storeData.quizzes.find(q => q.id === activeQuizId)!;
    const questions = storeData.questions.filter(qst => qst.quizId === activeQuizId);

    let correctCount = 0;
    questions.forEach(q => {
      const studentAns = quizAnswers[q.id] || "";
      if (q.type === "text") {
        // Matching text key values lower cases
        const cleanAnswerList = q.correctAnswer.toLowerCase().split(",").map(itm => itm.trim());
        const matched = cleanAnswerList.some(kw => studentAns.toLowerCase().includes(kw));
        if (matched) correctCount++;
      } else {
        // Exact option indexes selection match
        if (studentAns === q.correctAnswer) {
          correctCount++;
        }
      }
    });

    const finalScore = Math.round((correctCount / (questions.length || 1)) * 100);
    const passed = finalScore >= quiz.passingScore;

    // Track attempt logs
    const attemptItem: QuizAttempt = {
      id: generateId("attempt"),
      quizId: activeQuizId,
      studentId: currentUser.id,
      answers: quizAnswers,
      score: finalScore,
      passed,
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };

    storeData.quizAttempts.push(attemptItem);
    AppStore.log(currentUser.id, "submit_quiz_attempt", quiz.title, `Score obtained: ${finalScore}% (${passed ? "PASSED" : "FAILED"}).`);

    // Complete curriculum enrollment status & auto-certificate issuing
    const enrollment = storeData.enrollments.find(e => e.courseId === quiz.courseId && e.studentId === currentUser.id);
    if (enrollment && passed) {
      // Check if all lessons are also completed to issue certificate
      const lessonsCount = storeData.lessons.filter(l => l.courseId === quiz.courseId).length;
      const progressCompleted = storeData.lessonProgress.filter(
        p => p.enrollmentId === enrollment.id && p.completed
      ).length;

      if (progressCompleted === lessonsCount && enrollment.status !== "completed") {
        enrollment.status = "completed";
        enrollment.completedAt = new Date().toISOString();

        // Autocall Certificates mapping
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const cert: Certificate = {
          id: generateId("cert"),
          enrollmentId: enrollment.id,
          studentId: currentUser.id,
          courseId: quiz.courseId,
          issuedAt: new Date().toISOString(),
          certificateCode: code
        };
        storeData.certificates.push(cert);
        AppStore.log(currentUser.id, "issue_certificate", cert.certificateCode, `Course: ${quiz.courseId}`);
        AppStore.notify(currentUser.id, "success", `Congratulations! Certificate issued with verification code ${code}. Check the certificates tab.`);
      }
    }

    AppStore.save(storeData);
    setQuizFinishedState({
      score: finalScore,
      passed,
      correctAnswers: correctCount,
      total: questions.length
    });
    onRefreshData();
  };

  // Send assignment files
  const handleSendAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignmentId || !submissionCodeText.trim()) {
      triggerToast("Please provide submission content deliverables.");
      return;
    }

    const storeData = AppStore.get();
    
    // Safety remove existing submissions
    storeData.submissions = storeData.submissions.filter(
      s => !(s.assignmentId === submittingAssignmentId && s.studentId === currentUser.id)
    );

    const submission: Submission = {
      id: generateId("submit"),
      assignmentId: submittingAssignmentId,
      studentId: currentUser.id,
      content: submissionCodeText,
      submittedAt: new Date().toISOString()
    };

    storeData.submissions.push(submission);
    AppStore.log(currentUser.id, "submit_assignment_draft", submittingAssignmentId, "Sent deliverables for grading desk reviews.");
    AppStore.notify(currentUser.id, "info", "Assignment submitted. Teachers will evaluate, score and leave feedback.");
    AppStore.save(storeData);

    setSubmissionCodeText("");
    setSubmittingAssignmentId(null);
    onRefreshData();
    triggerToast("Assignment materials submitted successfully!");
  };

  const handleMarkNotificationRead = async (id: string) => {
    // Optimistically update local store
    const storeData = AppStore.get();
    storeData.notifications = storeData.notifications.map(n => {
      if (n.id === id) return { ...n, isRead: true };
      return n;
    });
    AppStore.save(storeData);
    onRefreshData();
    // Also persist to server so React Query refetch doesn't revert
    try {
      await api.markNotificationRead(id);
    } catch (_) { /* silent fail - local state already updated */ }
  };

  const handleMarkAllNotificationsRead = async () => {
    const storeData = AppStore.get();
    storeData.notifications = storeData.notifications.map(n => {
      if (n.userId === currentUser.id) return { ...n, isRead: true };
      return n;
    });
    AppStore.save(storeData);
    onRefreshData();
    // Persist to server
    try {
      await api.markAllNotificationsRead();
    } catch (_) { /* silent fail */ }
  };

  const myNotifications = store.notifications.filter(n => n.userId === currentUser.id);

  // active course workspace helper values
  const currentLearningCourse = store.courses.find(c => c.id === learningCourseId);
  const currentLearningLessons = store.lessons.filter(l => l.courseId === learningCourseId).sort((a,b) => a.order - b.order);
  const activeLearningEnrollment = store.enrollments.find(e => e.courseId === learningCourseId && e.studentId === currentUser.id);
  const currentLessonContentObj = store.lessons.find(l => l.id === activeLessonId);

  const studentPanelProps = {
    activeSubTab,
    setActiveSubTab,
    viewingCourseId,
    setViewingCourseId,
    filteredCatalog,
    catalogSearch,
    setCatalogSearch,
    catalogCategory,
    setCatalogCategory,
    myEnrolledCourseIds,
    store,
    handleEnrollIntoCourse,
    setLearningCourseId,
    myEnrollments,
    currentUser,
    setActiveLessonId,
    handleToggleLessonComplete,
    learningCourseId,
    currentLearningCourse,
    currentLearningLessons,
    activeLearningEnrollment,
    activeLessonId,
    currentLessonContentObj,
    handleStartQuiz,
    setSubmittingAssignmentId,
    setSubmissionCodeText,
    submittingAssignmentId,
    submissionCodeText,
    handleSendAssignmentSubmit,
    quizTimeRemaining,
    activeQuizId,
    setActiveQuizId,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    quizAnswers,
    quizFinishedState,
    handleSelectQuizAnswer,
    handleAutoSubmitQuiz,
    showProfileEditForm,
    setShowProfileEditForm,
    myProfile,
    editPhone,
    setEditPhone,
    editBirth,
    setEditBirth,
    editGender,
    setEditGender,
    editAddress,
    setEditAddress,
    editParent,
    setEditParent,
    editParentPhone,
    setEditParentPhone,
    onRefreshData,
    triggerToast,
    showPrintTranscript,
    setShowPrintTranscript,
    paymentGuideTx,
    setPaymentGuideTx,
    myNotifications,
    handleMarkNotificationRead
  };

  return (
    <div className="space-y-8">
      {/* Toast popup Alert bottom right */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2563eb] text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowChangePassword(false); setCpError(null); setCpSuccess(false); }}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-white">Đổi mật khẩu</h3>
              <button onClick={() => { setShowChangePassword(false); setCpError(null); setCpSuccess(false); }} className="text-white/40 hover:text-white transition cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            {cpSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
                <p className="text-sm text-white font-semibold">Đổi mật khẩu thành công!</p>
                <p className="text-xs text-white/50">Mật khẩu của bạn đã được cập nhật.</p>
                <button onClick={() => { setShowChangePassword(false); setCpSuccess(false); }} className="mt-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer">Đóng</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50 font-mono uppercase tracking-widest">Mật khẩu hiện tại</label>
                  <input type="password" value={cpOldPass} onChange={e => { setCpOldPass(e.target.value); setCpError(null); }} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50 font-mono uppercase tracking-widest">Mật khẩu mới</label>
                  <input type="password" value={cpNewPass} onChange={e => { setCpNewPass(e.target.value); setCpError(null); }} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50 font-mono uppercase tracking-widest">Xác nhận mật khẩu mới</label>
                  <input type="password" value={cpConfirmPass} onChange={e => { setCpConfirmPass(e.target.value); setCpError(null); }} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition" />
                </div>
                {cpError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{cpError}</p>
                )}
                <button
                  onClick={() => {
                    if (!cpOldPass || !cpNewPass || !cpConfirmPass) { setCpError("Vui lòng điền đầy đủ thông tin."); return; }
                    if (cpNewPass.length < 6) { setCpError("Mật khẩu mới phải có ít nhất 6 ký tự."); return; }
                    if (cpNewPass !== cpConfirmPass) { setCpError("Mật khẩu xác nhận không khớp."); return; }
                    setCpSuccess(true); setCpOldPass(""); setCpNewPass(""); setCpConfirmPass("");
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header section spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 uppercase">
            Active Student Desk
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Welcome Back, {currentUser.name} 🎓</h2>
          <p className="text-sm text-white/60">Explore public curriculum classes, view lessons complete logs, and take certificates assessments easily.</p>
        </div>

        {/* Right header controls: user avatar only (Bell is in sidebar) */}
        <div className="flex items-center gap-2 self-start">
          {/* User avatar stack button with dropdown */}
          <div className="relative">
            <button
              id="user-avatar-btn"
              onClick={() => setShowUserMenu(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition text-white text-xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] uppercase">
                {currentUser.name?.charAt(0) || "S"}
              </div>
              <span className="hidden sm:inline font-medium max-w-[80px] truncate">{currentUser.name}</span>
              <ChevronRight className={`h-3.5 w-3.5 text-white/40 transition-transform duration-200 ${showUserMenu ? "rotate-90" : ""}`} />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 bottom-full mb-2 z-50 w-52 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden py-1">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-white/40 font-mono truncate">{currentUser.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setActiveSubTab("profile"); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5 text-white/40" />
                      <span>Xem hồ sơ</span>
                    </button>
                    <button
                      onClick={() => { setShowChangePassword(true); setShowUserMenu(false); setCpError(null); setCpSuccess(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      <Shield className="h-3.5 w-3.5 text-white/40" />
                      <span>Đổi mật khẩu</span>
                    </button>
                  </div>

                  {/* Logout section */}
                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side dashboard layout: sidebar navigation on the left, workspace canvas on the right */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-8 items-start">
        {/* Mobile: sidebar toggle bar */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/70 hover:text-white hover:bg-white/8 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              <span className="font-semibold">Menu điều hướng</span>
              <span className="text-white/40">— đang xem: <strong className="text-indigo-300">{{
                catalog: "Khám phá khóa học",
                learning: "Lớp học của tôi",
                assignments: "Bài tập tự luận",
                certificates: "Chứng nhận",
                notifications: "Hộp thư",
                profile: "Lý lịch cá nhân",
                academics_record: "Kết quả học tập",
                student_attendance: "Điểm chuyên cần",
                student_tuition: "Đóng học phí",
                student_transcript: "Học bạ",
                parent_view: "Cổng phụ huynh",
              }[activeSubTab] || activeSubTab}</strong></span>
            </span>
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showSidebar ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Left Navigation Sidebar */}
        <div className={`w-full lg:w-64 xl:w-72 flex flex-col gap-4 shrink-0 ${showSidebar ? "block" : "hidden"} lg:flex lg:flex-col`}>
          
          {/* LMS Modules group */}
          <div className="bg-white/3 border border-white/10 rounded-3xl p-3 flex flex-col gap-1 w-full text-xs">
            <span className="text-[10px] text-white/40 uppercase tracking-widest px-3 py-2 font-bold font-mono border-b border-white/5 mb-1.5">
              HỌC TẬP LMS
            </span>
            <button
              onClick={() => { setActiveSubTab("catalog"); setLearningCourseId(null); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "catalog" 
                  ? "bg-white/10 text-indigo-300 font-bold border border-white/10 shadow-lg shadow-indigo-500/5" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Search className={`h-4.5 w-4.5 ${activeSubTab === "catalog" ? "text-indigo-300" : "text-white/40"}`} />
              <span>Khám phá Khóa học</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("learning"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "learning" 
                  ? "bg-white/10 text-indigo-300 font-bold border border-white/10 shadow-lg shadow-indigo-500/5" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <BookOpen className={`h-4.5 w-4.5 ${activeSubTab === "learning" ? "text-indigo-300" : "text-white/40"}`} />
              <span>Lớp học của tôi</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("assignments"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "assignments" 
                  ? "bg-white/10 text-indigo-300 font-bold border border-white/10 shadow-lg shadow-indigo-500/5" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className={`h-4.5 w-4.5 ${activeSubTab === "assignments" ? "text-indigo-300" : "text-white/40"}`} />
              <span>Bài tập tự luận</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("certificates"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "certificates" 
                  ? "bg-white/10 text-indigo-300 font-bold border border-white/10 shadow-lg shadow-indigo-500/5" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Award className={`h-4.5 w-4.5 ${activeSubTab === "certificates" ? "text-indigo-300" : "text-white/40"}`} />
              <span>Chứng nhận của tôi</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("notifications"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center justify-between gap-2.5 ${
                activeSubTab === "notifications" 
                  ? "bg-white/10 text-indigo-300 font-bold border border-white/10 shadow-lg shadow-indigo-500/5" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`h-4.5 w-4.5 ${activeSubTab === "notifications" ? "text-indigo-300" : "text-white/40"}`} />
                <span>Hộp thư thông báo</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                myNotifications.filter(n => !n.isRead).length > 0 
                  ? "bg-red-500/20 text-red-300 animate-pulse border border-red-500/10" 
                  : "bg-white/10 text-white/50"
              }`}>
                {myNotifications.filter(n => !n.isRead).length}
              </span>
            </button>
          </div>

          {/* SIS Academics Systems modules group */}
          <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-3xl p-3 flex flex-col gap-1 w-full text-xs">
            <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest px-3 py-2 font-mono border-b border-indigo-500/15 mb-1.5">
              HỒ SƠ HỌC VỤ SIS
            </span>
            <button
              onClick={() => { setActiveSubTab("profile"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "profile" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className={`h-4.5 w-4.5 ${activeSubTab === "profile" ? "text-white" : "text-white/40"}`} />
              <span>Lý lịch cá nhân</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("academics_record"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "academics_record" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <GraduationCap className={`h-4.5 w-4.5 ${activeSubTab === "academics_record" ? "text-white" : "text-white/40"}`} />
              <span>Kết quả học tập</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("student_attendance"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "student_attendance" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className={`h-4.5 w-4.5 ${activeSubTab === "student_attendance" ? "text-white" : "text-white/40"}`} />
              <span>Điểm chuyên cần</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("student_tuition"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "student_tuition" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className={`h-4.5 w-4.5 ${activeSubTab === "student_tuition" ? "text-white" : "text-white/40"}`} />
              <span>Đóng học phí</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("student_transcript"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "student_transcript" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileCheck className={`h-4.5 w-4.5 ${activeSubTab === "student_transcript" ? "text-white" : "text-white/40"}`} />
              <span>Học bạ chính thức</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("parent_view"); setShowSidebar(false); }}
              className={`w-full text-left px-4 py-3 font-semibold rounded-2xl transition duration-150 cursor-pointer flex items-center gap-2.5 ${
                activeSubTab === "parent_view" 
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className={`h-4.5 w-4.5 ${activeSubTab === "parent_view" ? "text-white" : "text-white/40"}`} />
              <span>Cổng Phụ Huynh</span>
            </button>
          </div>
        </div>

        {/* Right Canvas workspace content bodies */}
        <div ref={contentRef} className="flex-1 w-full bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6 backdrop-blur-md min-w-0 scroll-mt-4">

        <CourseCatalog {...studentPanelProps} />
        <MyLearningWorkspace {...studentPanelProps} />
        <AssignmentSubmit {...studentPanelProps} />
        {/* Tab 4: Graduation Certificates display board */}
        {activeSubTab === "certificates" && (
          <div className="space-y-6">
      {isLoading && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Đang tải dữ liệu...</div>}
      {isError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">Không thể tải dữ liệu từ server.</div>}
            <h4 className="text-base font-display font-semibold text-white">Chứng nhận của tôi ({store.certificates.filter(c => c.studentId === currentUser.id).length})</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {store.certificates.filter(c => c.studentId === currentUser.id).map(cert => {
                const cTitle = store.courses.find(cr => cr.id === cert.courseId)?.title || "Curriculum Master Class";
                const enrolledVal = store.enrollments.find(e => e.id === cert.enrollmentId);

                return (
                  <div key={cert.id} className="relative overflow-hidden bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                    {/* Background glows details */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl" />
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Award className="h-10 w-10 text-amber-500" />
                        <span className="text-[10px] font-mono text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">
                          Xác thực chính chủ
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">HỆ THỐNG ĐÀO TẠO E16</span>
                        <h5 className="font-display font-black text-white text-base leading-tight tracking-tight">{cTitle}</h5>
                        <p className="text-xs text-white/60 font-sans leading-relaxed">
                          Chứng nhận tốt nghiệp được trao tặng cho học viên <strong className="text-white">{currentUser.name}</strong> vì đã hoàn thành toàn diện lộ trình giáo trình và vượt qua các yêu cầu đánh giá năng lực của khóa học.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
                        <div>
                          <span className="text-white/40 block uppercase">Ngày cấp chứng chỉ</span>
                          <span className="text-white/70 font-semibold">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white/40 block uppercase">Mã kiểm định độc bản</span>
                          <span className="text-amber-400 font-bold font-mono tracking-widest uppercase">{cert.certificateCode}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {store.certificates.filter(c => c.studentId === currentUser.id).length === 0 && (
                <div className="col-span-full text-center py-16 bg-black/15 border border-dashed border-white/5 rounded-2xl text-xs text-white/40">
                  Bạn chưa sở hữu chứng nhận nào. Hãy hoàn thành tất cả giáo trình bài học và đạt điểm bài trắc nghiệm cuối khóa để kích hoạt chứng nhận.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: alerts and Notifications list panel */}
        {activeSubTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-display font-semibold text-white">Hộp thư thông báo từ Hệ thống</h4>
              {myNotifications.some(n => !n.isRead) && (
                <button
                  onClick={() => handleMarkAllNotificationsRead()}
                  className="text-[10px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition cursor-pointer font-mono"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>

            {/* Paginated notification list */}
            <div className="space-y-2.5">
              {myNotifications
                .slice(notifPage * NOTIF_PER_PAGE, (notifPage + 1) * NOTIF_PER_PAGE)
                .map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleMarkNotificationRead(note.id)}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 transition duration-150 cursor-pointer ${
                    note.isRead
                      ? "bg-white/5 border-white/5 text-white/50"
                      : "bg-[#2563eb]/10 border-indigo-500/25 text-indigo-200"
                  }`}
                >
                  <Bell className={`h-4 w-4 flex-shrink-0 mt-0.5 ${note.isRead ? "text-white/30" : "text-indigo-400"}`} />
                  <div className="space-y-1 text-xs flex-1 min-w-0">
                    <p className="leading-relaxed font-sans">{note.message}</p>
                    <span className="text-[10px] text-white/30 block font-mono">
                      {new Date(note.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {!note.isRead && (
                    <span className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}

              {myNotifications.length === 0 && (
                <p className="text-xs text-white/40 text-center py-12">Hiện chưa có cập nhật/thông báo nào mới gửi tới tài khoản của bạn.</p>
              )}
            </div>

            {/* Pagination controls */}
            {myNotifications.length > NOTIF_PER_PAGE && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  onClick={() => setNotifPage(p => Math.max(0, p - 1))}
                  disabled={notifPage === 0}
                  className="px-4 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ← Trước
                </button>
                <span className="text-[11px] text-white/40 font-mono">
                  Trang {notifPage + 1} / {Math.ceil(myNotifications.length / NOTIF_PER_PAGE)}
                </span>
                <button
                  onClick={() => setNotifPage(p => Math.min(Math.ceil(myNotifications.length / NOTIF_PER_PAGE) - 1, p + 1))}
                  disabled={(notifPage + 1) * NOTIF_PER_PAGE >= myNotifications.length}
                  className="px-4 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Tiếp →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab SIS 1: My Profile Section */}
        <StudentAcademics {...studentPanelProps} />
        <QuizConsole {...studentPanelProps} />

        {activeSubTab === "parent_view" && (
          <ParentPanel 
            currentUser={currentUser} 
            onLogout={onLogout} 
            onRefreshData={onRefreshData} 
          />
        )}

        </div>
      </div>
      {/* Scroll-to-top floating button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-40 p-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-2xl border border-indigo-500/30 transition-all duration-200 cursor-pointer backdrop-blur-sm"
          aria-label="Lên đầu trang"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
