import React from "react";
import { BookOpen, HelpCircle, FileText, Plus, Eye, Edit, Check, Award, Settings, Download, Tv, Trash, ChevronRight, TrendingUp, BarChart, Users, Clock, Search, MessageSquare, X, PlusCircle, FolderPlus } from "lucide-react";
import ModalPortal from "../ModalPortal";

interface ComponentProps {
  [key: string]: any;
}

export default function GradebookTable(props: ComponentProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [courseDetailId, setCourseDetailId] = React.useState<string | null>(null);

  // Sorting state for student gradebook matrix table
  const [gradebookSortField, setGradebookSortField] = React.useState<string>("studentName");
  const [gradebookSortOrder, setGradebookSortOrder] = React.useState<"asc" | "desc">("asc");

  const handleGradebookSort = (field: string) => {
    if (gradebookSortField === field) {
      setGradebookSortOrder(gradebookSortOrder === "asc" ? "desc" : "asc");
    } else {
      setGradebookSortField(field);
      setGradebookSortOrder("asc");
    }
  };
  const {
    activeSubTab,
    setActiveSubTab,
    selectedCourseId,
    setSelectedCourseId,
    selectedQuizId,
    setSelectedQuizId,
    showCourseModal,
    setShowCourseModal,
    courseModalMode,
    courseTitle,
    setCourseTitle,
    courseDesc,
    setCourseDesc,
    courseCategory,
    setCourseCategory,
    courseThumb,
    setCourseThumb,
    coursePrice,
    setCoursePrice,
    courseLevel,
    setCourseLevel,
    courseTags,
    setCourseTags,
    showLessonModal,
    setShowLessonModal,
    lessonTitle,
    setLessonTitle,
    lessonContent,
    setLessonContent,
    lessonVideo,
    setLessonVideo,
    lessonDuration,
    setLessonDuration,
    showQuizModal,
    setShowQuizModal,
    quizTitle,
    setQuizTitle,
    quizPassing,
    setQuizPassing,
    quizLimit,
    setQuizLimit,
    quizAttempts,
    setQuizAttempts,
    showQuestionModal,
    setShowQuestionModal,
    qText,
    setQText,
    qType,
    setQType,
    qOptions,
    setQOptions,
    qCorrect,
    setQCorrect,
    showAssignModal,
    setShowAssignModal,
    assignTitle,
    setAssignTitle,
    assignDesc,
    setAssignDesc,
    assignDeadline,
    setAssignDeadline,
    assignMaxScore,
    setAssignMaxScore,
    activeSubmissionId,
    setActiveSubmissionId,
    gradingScore,
    setGradingScore,
    gradingFeedback,
    setGradingFeedback,
    store,
    currentUser,
    myCourses,
    myCourseIds,
    handleOpenCreateCourse,
    handleOpenEditCourse,
    handleSaveCourse,
    handleSubmitCourseForApproval,
    handleAddLessonSubmit,
    handleAddQuizSubmit,
    handleAddQuestionSubmit,
    handleAddAssignmentSubmit,
    handleGradeSubmission,
    handleExportCSVGradebook,
    activeCourse,
    lessons,
    courseQuizzes,
    courseAssignments,
    myAssignments,
    studentSubmissionsRaw
  } = props;

  const enrolledStudents = store.enrollments.filter((e: any) => myCourseIds.includes(e.courseId));
  const filteredStudents = enrolledStudents.filter((enroll: any) => {
    const studentUser = store.users.find((u: any) => u.id === enroll.studentId);
    const courseObj = store.courses.find((c: any) => c.id === enroll.courseId);
    if (!studentUser) return false;
    return !searchTerm ||
      studentUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (courseObj?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedStudents = [...filteredStudents].sort((a: any, b: any) => {
    if (!gradebookSortField) return 0;
    let valA: any = "";
    let valB: any = "";

    const studentA = store.users.find((u: any) => u.id === a.studentId);
    const studentB = store.users.find((u: any) => u.id === b.studentId);
    const courseA = store.courses.find((c: any) => c.id === a.courseId);
    const courseB = store.courses.find((c: any) => c.id === b.courseId);

    if (gradebookSortField === "studentName") {
      valA = studentA?.name || "";
      valB = studentB?.name || "";
    } else if (gradebookSortField === "courseTitle") {
      valA = courseA?.title || "";
      valB = courseB?.title || "";
    } else if (gradebookSortField === "progress") {
      const completedA = store.lessonProgress.filter((p: any) => p.enrollmentId === a.id && p.completed).length;
      const totalA = store.lessons.filter((l: any) => l.courseId === a.courseId).length;
      const completedB = store.lessonProgress.filter((p: any) => p.enrollmentId === b.id && p.completed).length;
      const totalB = store.lessons.filter((l: any) => l.courseId === b.courseId).length;

      valA = totalA ? completedA / totalA : 0;
      valB = totalB ? completedB / totalB : 0;
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return gradebookSortOrder === "asc"
        ? valA.localeCompare(valB, "vi", { sensitivity: "base" })
        : valB.localeCompare(valA, "vi", { sensitivity: "base" });
    }
    return gradebookSortOrder === "asc" ? valA - valB : valB - valA;
  });

  return (
    <>
        {/* Tab 4: Student gradebook matrix table & CSV Export */}
        {activeSubTab === "gradebook" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-display font-semibold text-white">Sổ điểm Tổng hợp & Kiểm định Tiến trình</h4>
                <p className="text-xs text-white/40">Thống kê tiến độ xem bài giảng và điểm thi trung bình của học viên đăng ký.</p>
              </div>

              <button
                onClick={handleExportCSVGradebook}
                disabled={studentSubmissionsRaw.length === 0}
                className="px-4 py-2 text-xs font-bold text-indigo-950 bg-white hover:bg-white/95 rounded-xl disabled:bg-white/20 disabled:text-white/40 flex items-center gap-1.5 transition duration-150 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Xuất bảng điểm CSV
              </button>
            </div>

            <div className="flex gap-3 bg-white/3 border border-white/5 p-3 rounded-xl text-xs">
              <input
                type="text"
                placeholder="Tìm kiếm học viên theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-2.5 py-1.5 bg-black/25 text-white placeholder-white/30 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80 font-sans">
                <thead className="bg-white/5 border-b border-white/10 text-white uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-4 font-semibold cursor-pointer select-none hover:text-white transition" onClick={() => handleGradebookSort("studentName")}>
                      Tên Học sinh {gradebookSortField === "studentName" ? (gradebookSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 font-semibold cursor-pointer select-none hover:text-white transition" onClick={() => handleGradebookSort("courseTitle")}>
                      Khóa học đăng ký {gradebookSortField === "courseTitle" ? (gradebookSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 font-semibold cursor-pointer select-none hover:text-white transition" onClick={() => handleGradebookSort("progress")}>
                      Tiến độ bài học {gradebookSortField === "progress" ? (gradebookSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 font-semibold text-right flex-shrink-0">Tóm tắt trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedStudents.map((enroll, i) => {
                    const studentUser = store.users.find((u: any) => u.id === enroll.studentId);
                    const courseObj = store.courses.find((c: any) => c.id === enroll.courseId);
                    const completedLessons = store.lessonProgress.filter((p: any) => p.enrollmentId === enroll.id && p.completed).length;
                    const totalLessons = store.lessons.filter((l: any) => l.courseId === enroll.courseId).length;
 
                    return (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium text-white">
                          <div>{studentUser?.name || "Không xác định"}</div>
                          <div className="text-[10px] text-white/40 font-mono">{studentUser?.email || "Không xác định"}</div>
                        </td>
                        <td className="p-4 text-white/70 font-sans text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white/80 max-w-[150px] truncate">{courseObj?.title || "Không xác định"}</span>
                            {courseObj && (
                              <button
                                onClick={() => setCourseDetailId(courseObj.id)}
                                className="px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded text-[9px] font-bold transition flex items-center gap-0.5 cursor-pointer font-sans"
                              >
                                Xem 👁️
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-white/40 font-mono uppercase">{courseObj?.category}</div>
                        </td>
                        <td className="p-4 text-xs font-mono">
                          Đã hoàn thành {completedLessons}/{totalLessons} bài học
                        </td>
                        <td className="p-4 text-right text-[11px] text-indigo-300 font-medium">
                          Học viên đang hoạt động
                        </td>
                      </tr>
                    );
                  })}

                  {sortedStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-white/40 italic">
                        {enrolledStudents.length === 0 ? "Chưa có học sinh đăng ký các khóa học này." : "Không tìm thấy học sinh nào phù hợp."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Premium glassmorphic Course Details consultation modal */}
      {courseDetailId && (() => {
        const course = store.courses.find((c: any) => c.id === courseDetailId);
        if (!course) return null;
        const teacher = store.users.find((u: any) => u.id === course.teacherId) || { name: "Chưa phân công" };
        const lessons = store.lessons.filter((l: any) => l.courseId === course.id).sort((a: any, b: any) => a.order - b.order);
        const quizzes = store.quizzes.filter((q: any) => q.courseId === course.id);
        const assignments = store.assignments.filter((a: any) => a.courseId === course.id);
        const formatVND = (num: number) => {
          return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
        };
        return (
          <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-6 md:pt-10 overflow-y-auto text-white">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative my-8 animate-in zoom-in-95 duration-150 text-white font-sans max-h-[85vh] overflow-y-auto flex flex-col justify-between">
              <div className="space-y-5 text-left">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                      {course.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{course.title}</h3>
                    <p className="text-xs text-white/40 mt-1">Giảng viên: <strong className="text-indigo-200">{teacher.name}</strong></p>
                  </div>
                  <button 
                    onClick={() => setCourseDetailId(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 cursor-pointer font-sans text-white bg-transparent border-none"
                  >
                    <span className="text-lg font-bold">✕</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-white/2 p-4 rounded-xl border border-white/5 font-sans">
                  <div>
                    <span className="text-white/45 block">Học phí:</span>
                    <strong className="text-sm font-mono text-emerald-400 font-black">{course.price ? formatVND(course.price) : "Miễn phí"}</strong>
                  </div>
                  <div>
                    <span className="text-white/45 block">Cấp trình độ:</span>
                    <strong className="text-indigo-300 capitalize">{course.level || "Cơ bản"}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-white/45 font-bold uppercase block">Mô tả khóa đào tạo:</span>
                  <p className="text-xs text-white/70 leading-relaxed bg-black/15 p-3 rounded-lg border border-white/5 font-sans">{course.description}</p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[11px] text-white/45 font-bold uppercase flex items-center gap-1 font-sans">
                    Khung chương trình ({lessons.length} bài học, {quizzes.length} bài thi, {assignments.length} tự luận)
                  </span>
                  
                  {lessons.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-sans">
                      {lessons.map((lesson: any, idx: number) => (
                        <div key={lesson.id} className="p-2.5 bg-white/3 border border-white/5 rounded-lg flex justify-between items-center text-xs">
                          <span className="font-semibold text-white/90">Bài {idx + 1}: {lesson.title}</span>
                          <span className="text-[10px] text-white/40 font-mono">{lesson.duration || "15 phút"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/35 italic font-sans">Chưa tải giáo trình bài giảng cho lớp học này.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-5 flex justify-end">
                <button
                  onClick={() => setCourseDetailId(null)}
                  className="px-4 py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-100 transition text-xs cursor-pointer font-sans"
                >
                  Đóng thông tin
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}
    </>
  );
}
