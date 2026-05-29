import React, { useState } from "react";
import {
  BookOpen,
  HelpCircle,
  FileText,
  Plus,
  Eye,
  Edit,
  Check,
  Award,
  Settings,
  Download,
  Tv,
  Trash,
  ChevronRight,
  TrendingUp,
  BarChart,
  Users,
  Clock,
  Search,
  MessageSquare,
  X,
  PlusCircle,
  FolderPlus
} from "lucide-react";
import { LMSDataStore, User, Course, Lesson, Quiz, Question, Assignment, Submission, QuizAttempt } from "../types";
import { AppStore } from "../store";
import CourseBuilder from "./teacher/CourseBuilder";
import QuizBuilder from "./teacher/QuizBuilder";
import AssignmentGrader from "./teacher/AssignmentGrader";
import GradebookTable from "./teacher/GradebookTable";
import TeacherAnalytics from "./teacher/TeacherAnalytics";
import { generateId } from "../utils";
import { useApiStore } from "../hooks/apiHooks";
import { api } from "../api";

interface TeacherPanelProps {
  currentUser: User;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function TeacherPanel({ currentUser, onLogout, onRefreshData }: TeacherPanelProps) {
  const { store, isLoading, isError } = useApiStore();

  // Local active sub-module state
  const [activeSubTab, setActiveSubTab] = useState<"courses" | "quizzes" | "assignments" | "gradebook" | "analytics">("courses");

  // Selection states
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Modal control states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<"create" | "edit">("create");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Create / Edit course fields
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseCategory, setCourseCategory] = useState("Web Development");
  const [courseThumb, setCourseThumb] = useState("");
  const [coursePrice, setCoursePrice] = useState<number>(0);
  const [courseLevel, setCourseLevel] = useState<string>("Cơ bản");
  const [courseTags, setCourseTags] = useState<string>("");

  // Create Lesson state
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15 mins");

  // Create Quiz state
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizPassing, setQuizPassing] = useState(70);
  const [quizLimit, setQuizLimit] = useState(15);
  const [quizAttempts, setQuizAttempts] = useState(3);

  // Add Question state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"single" | "multiple" | "text">("single");
  const [qOptions, setQOptions] = useState<string[]>(["", "", ""]);
  const [qCorrect, setQCorrect] = useState("0");

  // Create Assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignMaxScore, setAssignMaxScore] = useState(100);

  // Grading submission state
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [gradingScore, setGradingScore] = useState(100);
  const [gradingFeedback, setGradingFeedback] = useState("");

  // General feedback messaging
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Get active teacher datasets
  const myCourses = store.courses.filter(c => c.teacherId === currentUser.id);
  const myCourseIds = myCourses.map(c => c.id);

  // Handle Course creation / update
  const handleOpenCreateCourse = () => {
    setCourseModalMode("create");
    setCourseTitle("");
    setCourseDesc("");
    setCourseCategory("Web Development");
    setCourseThumb("");
    setCoursePrice(0);
    setCourseLevel("Cơ bản");
    setCourseTags("");
    setShowCourseModal(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setCourseModalMode("edit");
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDesc(course.description);
    setCourseCategory(course.category);
    setCourseThumb(course.thumbnail || "");
    setCoursePrice(course.price || 0);
    setCourseLevel(course.level || "Cơ bản");
    setCourseTags(course.tags ? course.tags.join(", ") : "");
    setShowCourseModal(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseDesc.trim()) {
      triggerToast("Vui lòng điền đầy đủ các thông tin tiêu đề và mô tả khóa học.");
      return;
    }

    const storeData = AppStore.get();
    const tagsArray = courseTags
      ? courseTags.split(",").map(item => item.trim()).filter(Boolean)
      : [];

    if (courseModalMode === "create") {
      const newCourse: Course = {
        id: generateId("course"),
        title: courseTitle,
        description: courseDesc,
        teacherId: currentUser.id,
        status: "draft",
        category: courseCategory,
        thumbnail: courseThumb || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60",
        createdAt: new Date().toISOString(),
        price: Number(coursePrice) || 0,
        level: courseLevel as any,
        tags: tagsArray
      };
      storeData.courses.push(newCourse);

      api.createCourse({
        title: courseTitle,
        description: courseDesc,
        teacherId: currentUser.id,
        category: courseCategory,
        thumbnail: courseThumb || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60",
        price: Number(coursePrice) || 0,
        level: courseLevel,
        tags: tagsArray
      }).catch(err => console.warn("Failed to create course on server:", err));

      AppStore.log(currentUser.id, "create_course_draft", newCourse.title, "Saved course outline draft successfully.");
      triggerToast("Đã lập bản nháp khóa đào tạo mới thành công.");
    } else {
      storeData.courses = storeData.courses.map(c => {
        if (c.id === editingCourseId) {
          AppStore.log(currentUser.id, "edit_course_details", c.title, "Updated course detailed descriptors.");
          return {
            ...c,
            title: courseTitle,
            description: courseDesc,
            category: courseCategory,
            thumbnail: courseThumb,
            price: Number(coursePrice) || 0,
            level: courseLevel as any,
            tags: tagsArray
          };
        }
        return c;
      });
      triggerToast("Cập nhật thông tin khóa học thành công!");
    }

    AppStore.save(storeData);
    setShowCourseModal(false);
    onRefreshData();
  };

  const handleSubmitCourseForApproval = (courseId: string) => {
    const storeData = AppStore.get();
    storeData.courses = storeData.courses.map(c => {
      if (c.id === courseId) {
        AppStore.log(currentUser.id, "submit_course_approval", c.title, "Changed status from draft/returned to pending approval queue.");
        return { ...c, status: "pending" };
      }
      return c;
    });

    api.submitCourse(courseId).catch(err => console.warn("Failed to submit course for approval on server:", err));

    AppStore.save(storeData);
    onRefreshData();
    triggerToast("Course submitted into administrative review queue.");
  };

  // Add Lesson to current Course
  const handleAddLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    if (!lessonTitle.trim() || !lessonContent.trim()) {
      triggerToast("Please enter title and tutorial details.");
      return;
    }

    const storeData = AppStore.get();
    const currentLessons = storeData.lessons.filter(l => l.courseId === selectedCourseId);
    const orderNum = currentLessons.length + 1;

    const newLesson: Lesson = {
      id: generateId("lesson"),
      courseId: selectedCourseId,
      title: lessonTitle,
      content: lessonContent,
      videoUrl: lessonVideo,
      order: orderNum,
      duration: lessonDuration
    };

    storeData.lessons.push(newLesson);

    api.addLesson({
      courseId: selectedCourseId,
      title: lessonTitle,
      content: lessonContent,
      videoUrl: lessonVideo || undefined,
      order: orderNum,
      duration: lessonDuration
    }).catch(err => console.warn("Failed to add lesson on server:", err));

    AppStore.log(currentUser.id, "add_lesson", newLesson.title, `Added learning module inside course: ${selectedCourseId}`);
    AppStore.save(storeData);

    // Reset fields
    setLessonTitle("");
    setLessonContent("");
    setLessonVideo("");
    setLessonDuration("15 mins");
    setShowLessonModal(false);
    onRefreshData();
    triggerToast("Module successfully published inside course.");
  };

  // Create Quiz linked to Course
  const handleAddQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    if (!quizTitle.trim()) {
      triggerToast("Please provide a valid assessment caption.");
      return;
    }

    try {
      const created = await api.createQuiz({
        courseId: selectedCourseId,
        title: quizTitle,
        passingScore: quizPassing,
        timeLimit: quizLimit,
        maxAttempts: quizAttempts
      }) as Quiz;
      setSelectedQuizId(created.id);
      setQuizTitle("");
      setQuizPassing(70);
      setQuizLimit(15);
      setQuizAttempts(3);
      setShowQuizModal(false);
      onRefreshData();
      triggerToast("Course final assessment criteria mapped successfully.");
      return;
    } catch (err: any) {
      triggerToast(err.message || "Failed to create quiz on server.");
      return;
    }

    const storeData = AppStore.get();
    const newQuiz: Quiz = {
      id: generateId("quiz"),
      courseId: selectedCourseId,
      title: quizTitle,
      passingScore: quizPassing,
      timeLimit: quizLimit,
      maxAttempts: quizAttempts
    };

    storeData.quizzes.push(newQuiz);

    api.createQuiz({
      courseId: selectedCourseId,
      title: quizTitle,
      passingScore: quizPassing,
      timeLimit: quizLimit,
      maxAttempts: quizAttempts
    }).catch(err => console.warn("Failed to create quiz on server:", err));

    AppStore.log(currentUser.id, "create_quiz", newQuiz.title, `Added assessment linked to course: ${selectedCourseId}`);
    AppStore.save(storeData);

    setQuizTitle("");
    setQuizPassing(70);
    setQuizLimit(15);
    setQuizAttempts(3);
    setShowQuizModal(false);
    onRefreshData();
    triggerToast("Course final assessment criteria mapped successfully.");
  };

  // Add question to active Quiz
  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;
    if (!qText.trim()) {
      triggerToast("Please describe the question prompt.");
      return;
    }

    const storeData = AppStore.get();
    const cleanedOptions = qType !== "text" ? qOptions.filter(o => o.trim() !== "") : [];

    const newQuestion: Question = {
      id: generateId("question"),
      quizId: selectedQuizId,
      text: qText,
      type: qType,
      options: cleanedOptions,
      correctAnswer: qCorrect
    };

    storeData.questions.push(newQuestion);

    api.addQuestion(selectedQuizId, {
      text: qText,
      type: qType,
      options: cleanedOptions,
      correctAnswer: qCorrect
    }).catch(err => console.warn("Failed to add question on server:", err));

    AppStore.log(currentUser.id, "add_quiz_question", newQuestion.text, `Added question mapping inside quiz ID: ${selectedQuizId}`);
    AppStore.save(storeData);

    setQText("");
    setQOptions(["", "", ""]);
    setQCorrect("0");
    setShowQuestionModal(false);
    onRefreshData();
    triggerToast("Question prompt mapped into standard checks.");
  };

  // Create Assignment
  const handleAddAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    if (!assignTitle.trim() || !assignDesc.trim() || !assignDeadline) {
      triggerToast("All fields elements are mandatory.");
      return;
    }

    try {
      await api.createAssignment({
        courseId: selectedCourseId,
        title: assignTitle,
        description: assignDesc,
        deadline: assignDeadline,
        maxScore: Number(assignMaxScore)
      });

      AppStore.log(currentUser.id, "create_assignment", assignTitle, `Added task outline inside course: ${selectedCourseId}`);

      setAssignTitle("");
      setAssignDesc("");
      setAssignDeadline("");
      setAssignMaxScore(100);
      setShowAssignModal(false);
      await onRefreshData();
      triggerToast("Course Assignment challenge configured.");
    } catch (err: any) {
      triggerToast(err.message || "Failed to create assignment on server.");
    }
  };

  // Submit Grading Score
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionId) return;

    try {
      await api.gradeAssignment({
        submissionId: activeSubmissionId,
        score: Number(gradingScore),
        feedback: gradingFeedback
      });

      // Log and notify student
      const storeData = AppStore.get();
      const sub = storeData.submissions.find(s => s.id === activeSubmissionId);
      if (sub) {
        const chal = storeData.assignments.find(a => a.id === sub.assignmentId);
        const maxScore = chal?.maxScore || 100;
        AppStore.log(currentUser.id, "grade_assignment", sub.id, `Graded score ${gradingScore} with feedback: ${gradingFeedback}`);
        AppStore.notify(sub.studentId, "success", `Bài làm của bạn cho bài tập "${chal?.title || "Không tên"}" đã được chấm điểm! Điểm số: ${gradingScore}/${maxScore}. Nhận xét: ${gradingFeedback}`);
      }

      setActiveSubmissionId(null);
      setGradingFeedback("");
      await onRefreshData();
      triggerToast("Đã cập nhật điểm số và nhận xét thành công!");
    } catch (err: any) {
      console.error("Failed to grade assignment on server:", err);
      triggerToast(`Lỗi chấm điểm: ${err.message || "Không thể kết nối tới máy chủ."}`);
    }
  };

  // Export Gradebook CSV
  const handleExportCSVGradebook = () => {
    const storeData = AppStore.get();
    let csvContent = "data:text/csv;charset=utf-8,Student Name,Email,Course,Assignment,Score Obtained,Max Possible Score\n";

    const mySubmissions = storeData.submissions.filter(sub => {
      const assignment = storeData.assignments.find(a => a.id === sub.assignmentId);
      return assignment && myCourseIds.includes(assignment.courseId);
    });

    mySubmissions.forEach(sub => {
      const student = storeData.users.find(u => u.id === sub.studentId);
      const assignment = storeData.assignments.find(a => a.id === sub.assignmentId);
      const course = storeData.courses.find(c => c.id === assignment?.courseId);

      const parts = [
        `"${student?.name || "Không xác định"}"`,
        `"${student?.email || "Không xác định"}"`,
        `"${course?.title || "Không xác định"}"`,
        `"${assignment?.title || "Không xác định"}"`,
        `"${sub.score ?? "Chưa chấm"}"`,
        `"${assignment?.maxScore || 100}"`
      ];
      csvContent += parts.join(",") + "\n";
    });

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `e16_lms_gradebook_export.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Gradebook CSV compilation exported for local download.");
  };

  // Retrieve matching subsets for Course details explorer
  const activeCourse = store.courses.find(c => c.id === selectedCourseId);
  const lessons = store.lessons.filter(l => l.courseId === selectedCourseId).sort((a,b) => a.order - b.order);
  const courseQuizzes = store.quizzes.filter(q => q.courseId === selectedCourseId);
  const courseAssignments = store.assignments.filter(a => a.courseId === selectedCourseId);

  // Retrieve Grading lists
  const myAssignments = store.assignments.filter(a => myCourseIds.includes(a.courseId));
  const myAssignmentIds = myAssignments.map(a => a.id);
  const studentSubmissionsRaw = store.submissions.filter(sub => myAssignmentIds.includes(sub.assignmentId));

  const teacherPanelProps = {
    activeSubTab, setActiveSubTab, selectedCourseId, setSelectedCourseId, selectedQuizId, setSelectedQuizId,
    showCourseModal, setShowCourseModal, courseModalMode, courseTitle, setCourseTitle, courseDesc, setCourseDesc,
    courseCategory, setCourseCategory, courseThumb, setCourseThumb, coursePrice, setCoursePrice, courseLevel, setCourseLevel, courseTags, setCourseTags,
    showLessonModal, setShowLessonModal, lessonTitle, setLessonTitle, lessonContent, setLessonContent, lessonVideo, setLessonVideo, lessonDuration, setLessonDuration,
    showQuizModal, setShowQuizModal, quizTitle, setQuizTitle, quizPassing, setQuizPassing, quizLimit, setQuizLimit, quizAttempts, setQuizAttempts,
    showQuestionModal, setShowQuestionModal, qText, setQText, qType, setQType, qOptions, setQOptions, qCorrect, setQCorrect,
    showAssignModal, setShowAssignModal, assignTitle, setAssignTitle, assignDesc, setAssignDesc, assignDeadline, setAssignDeadline, assignMaxScore, setAssignMaxScore,
    activeSubmissionId, setActiveSubmissionId, gradingScore, setGradingScore, gradingFeedback, setGradingFeedback,
    store, currentUser, myCourses, myCourseIds, handleOpenCreateCourse, handleOpenEditCourse, handleSaveCourse,
    handleSubmitCourseForApproval, handleAddLessonSubmit, handleAddQuizSubmit, handleAddQuestionSubmit, handleAddAssignmentSubmit,
    handleGradeSubmission, handleExportCSVGradebook, activeCourse, lessons, courseQuizzes, courseAssignments, myAssignments, studentSubmissionsRaw
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert bottom right */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16a34a] text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
          {toastMessage}
        </div>
      )}

      {/* Header section spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 uppercase">
            Góc Nghiệp vụ Giảng viên
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Bàn làm việc & Chấm điểm Học thuật</h2>
          <p className="text-sm text-white/60">Tải lên giáo án bài giảng mới, thiết lập đề thi đánh giá tự động, quản lý điểm và tương tác trực quan với học viên.</p>
        </div>

        <button
          onClick={handleOpenCreateCourse}
          className="px-4 py-2 text-xs font-bold text-indigo-950 bg-white hover:bg-white/95 rounded-xl flex items-center gap-1.5 transition duration-150 cursor-pointer self-start"
        >
          <FolderPlus className="h-4 w-4" /> Khởi tạo Khóa học Mới
        </button>
      </div>

      {/* Main tab control buttons */}
      <div className="flex border-b border-white/10 bg-white/5 rounded-2xl p-1 gap-1">
        <button
          onClick={() => { setActiveSubTab("courses"); setSelectedCourseId(null); }}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "courses" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Chương trình Đào tạo
        </button>
        <button
          onClick={() => setActiveSubTab("quizzes")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "quizzes" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Đề thi & Đánh giá
        </button>
        <button
          onClick={() => setActiveSubTab("assignments")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "assignments" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Bài tập & Chấm điểm
        </button>
        <button
          onClick={() => setActiveSubTab("gradebook")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "gradebook" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Sổ điểm Tổng hợp
        </button>
        <button
          onClick={() => setActiveSubTab("analytics")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "analytics" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Báo cáo Hiệu suất
        </button>
      </div>

      {/* Active Panel View Canvas */}
      <div className="relative bg-white/5 border border-white/10 rounded-3xl p-6">

        <CourseBuilder {...teacherPanelProps} />
        <QuizBuilder {...teacherPanelProps} />
        <AssignmentGrader {...teacherPanelProps} />
        <GradebookTable {...teacherPanelProps} />
        <TeacherAnalytics {...teacherPanelProps} />


      </div>
    </div>
  );
}
