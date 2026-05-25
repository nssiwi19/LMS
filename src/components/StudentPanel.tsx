import React, { useState, useEffect } from "react";
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

  const handleMarkNotificationRead = (id: string) => {
    const storeData = AppStore.get();
    storeData.notifications = storeData.notifications.map(n => {
      if (n.id === id) return { ...n, isRead: true };
      return n;
    });
    AppStore.save(storeData);
    onRefreshData();
  };

  const handleMarkAllNotificationsRead = () => {
    const storeData = AppStore.get();
    storeData.notifications = storeData.notifications.map(n => {
      if (n.userId === currentUser.id) return { ...n, isRead: true };
      return n;
    });
    AppStore.save(storeData);
    onRefreshData();
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

      {/* Header section spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 uppercase">
            Active Student Desk
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Welcome Back, {currentUser.name} 🎓</h2>
          <p className="text-sm text-white/60">Explore public curriculum classes, view lessons complete logs, and take certificates assessments easily.</p>
        </div>

        {/* Dynamic Unread Indicators */}
        <button
          onClick={() => {
            setActiveSubTab("notifications");
            handleMarkAllNotificationsRead();
          }}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl relative flex items-center gap-1.5 transition text-white text-xs cursor-pointer self-start"
        >
          <Bell className="h-4 w-4" />
          <span>Xem thông báo</span>
          {myNotifications.some(n => !n.isRead) && (
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-1 -right-1 border border-slate-900 animate-pulse" />
          )}
        </button>
      </div>

      {/* Dynamic Tab groupings layout */}
      <div className="flex flex-col gap-3">
        {/* LMS Modules tab list */}
        <div className="flex flex-wrap border-b border-white/10 bg-white/3 rounded-2xl p-1 gap-1 text-xs">
          <span className="text-[10px] text-white/40 uppercase tracking-widest px-3 py-2 border-r border-white/5 font-bold flex items-center font-mono">
            HỌC TẬP LMS
          </span>
          <button
            onClick={() => { setActiveSubTab("catalog"); setLearningCourseId(null); }}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "catalog" ? "bg-white/10 text-indigo-300 font-bold border border-white/10" : "text-white/60 hover:text-white"
            }`}
          >
            Khám phá Khóa học
          </button>
          <button
            onClick={() => setActiveSubTab("learning")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "learning" ? "bg-white/10 text-indigo-300 font-bold border border-white/10" : "text-white/60 hover:text-white"
            }`}
          >
            Lớp học của tôi
          </button>
          <button
            onClick={() => setActiveSubTab("assignments")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "assignments" ? "bg-white/10 text-indigo-300 font-bold border border-white/10" : "text-white/60 hover:text-white"
            }`}
          >
            Bài tập tự luận
          </button>
          <button
            onClick={() => setActiveSubTab("certificates")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "certificates" ? "bg-white/10 text-indigo-300 font-bold border border-white/10" : "text-white/60 hover:text-white"
            }`}
          >
            Chứng nhận của tôi
          </button>
          <button
            onClick={() => setActiveSubTab("notifications")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "notifications" ? "bg-white/10 text-indigo-300 font-bold border border-white/10" : "text-white/60 hover:text-white"
            }`}
          >
            Hộp thư thông báo ({myNotifications.filter(n => !n.isRead).length})
          </button>
        </div>

        {/* SIS Academics Systems modules tab list */}
        <div className="flex flex-wrap border-b border-indigo-500/10 bg-indigo-505/5 rounded-2xl p-1 gap-1 text-xs border border-white/5">
          <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest px-3 py-2 border-r border-white/5 flex items-center font-mono">
            HỒ SƠ HỌC VỤ SIS
          </span>
          <button
            onClick={() => setActiveSubTab("profile")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "profile" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Lý lịch cá nhân
          </button>
          <button
            onClick={() => setActiveSubTab("academics_record")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "academics_record" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Kết quả học tập
          </button>
          <button
            onClick={() => setActiveSubTab("student_attendance")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "student_attendance" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Điểm chuyên cần
          </button>
          <button
            onClick={() => setActiveSubTab("student_tuition")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "student_tuition" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Đóng học phí
          </button>
          <button
            onClick={() => setActiveSubTab("student_transcript")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "student_transcript" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Học bạ chính thức
          </button>
          <button
            onClick={() => setActiveSubTab("parent_view")}
            className={`px-4 py-2 font-semibold rounded-xl transition duration-150 cursor-pointer ${
              activeSubTab === "parent_view" ? "bg-indigo-600 text-white font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            Cổng Phụ Huynh
          </button>
        </div>
      </div>

      {/* Canvas workspace content bodies */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">

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
            <h4 className="text-base font-display font-semibold text-white">Hộp thư thông báo từ Hệ thống</h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myNotifications.map((note) => (
                <div 
                  key={note.id} 
                  onClick={() => handleMarkNotificationRead(note.id)}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 transition duration-150 cursor-pointer ${
                    note.isRead 
                      ? "bg-white/5 border-white/5 text-white/50" 
                      : "bg-[#2563eb]/10 border-indigo-500/25 text-indigo-200"
                  }`}
                >
                  <Bell className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${note.isRead ? "text-white/30" : "text-indigo-400"}`} />
                  <div className="space-y-1 text-xs">
                    <p className="leading-relaxed font-sans">{note.message}</p>
                    <span className="text-[10px] text-white/30 block font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {myNotifications.length === 0 && (
                <p className="text-xs text-white/40 text-center py-12">Hiện chưa có cập nhật/thông báo nào mới gửi tới tài khoản của bạn.</p>
              )}
            </div>
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
  );
}
