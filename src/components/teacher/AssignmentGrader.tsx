import React from "react";
import { BookOpen, HelpCircle, FileText, Plus, Eye, Edit, Check, Award, Settings, Download, Tv, Trash, ChevronRight, TrendingUp, BarChart, Users, Clock, Search, MessageSquare, X, PlusCircle, FolderPlus } from "lucide-react";

interface ComponentProps {
  [key: string]: any;
}

export default function AssignmentGrader(props: ComponentProps) {
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

  return (
    <>
        {/* Tab 3: Assignments list & Student submissions grading cockpit */}
        {activeSubTab === "assignments" && (
          <div className="space-y-6">
            <h4 className="text-base font-display font-semibold text-white">Bảng Chấm điểm Bài tự luận của Học viên</h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-white/5 border-b border-white/10 text-white uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-4 font-semibold">Tên Học viên</th>
                    <th className="p-4 font-semibold">Bài tập Thử thách</th>
                    <th className="p-4 font-semibold">Ngày nộp</th>
                    <th className="p-4 font-semibold">Điểm số đạt được</th>
                    <th className="p-4 font-semibold text-right">Hành động Chấm điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {studentSubmissionsRaw.map(sub => {
                    const student = store.users.find(u => u.id === sub.studentId);
                    const challenge = store.assignments.find(a => a.id === sub.assignmentId);
                    
                    return (
                      <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium text-white">{student?.name || "Học viên ẩn danh"}</td>
                        <td className="p-4 font-bold text-indigo-200">{challenge?.title || "Không xác định"}</td>
                        <td className="p-4 text-white/50">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          {sub.score !== undefined ? (
                            <span className="text-emerald-400 font-bold font-mono">
                              {sub.score}/{challenge?.maxScore || 100}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Chưa chấm điểm
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setActiveSubmissionId(sub.id);
                              setGradingScore(sub.score ?? challenge?.maxScore ?? 100);
                              setGradingFeedback(sub.feedback ?? "");
                            }}
                            className="p-1 px-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white border border-white/15 rounded-lg cursor-pointer transition"
                          >
                            {sub.score !== undefined ? "Cập nhật Điểm" : "Chấm điểm & Nhận xét"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {studentSubmissionsRaw.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-white/40">
                        Hiện chưa có học viên nào nộp bài tự luận cho các bài tập được giao.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* MODAL 5: CREATE ASSIGNMENT FORM */}
      {showAssignModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowAssignModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3">
              <FileText className="h-5 w-5 text-indigo-400" /> Tạo Thử thách Bài tự luận Khóa học
            </h3>

            <form onSubmit={handleAddAssignmentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Tiêu đề Thử thách bài tập</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thiết lập Express Routing Controller"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Hạn chót Hoàn thành</label>
                  <input
                    type="date"
                    required
                    value={assignDeadline}
                    onChange={(e) => setAssignDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Điểm tối đa</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={assignMaxScore}
                    onChange={(e) => setAssignMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Mô tả / Yêu cầu chi tiết</label>
                <textarea
                  required
                  placeholder="Dán các định dạng file hoặc yêu cầu nộp sản phẩm..."
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white h-24 max-h-32 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                >
                  Kích hoạt Thử thách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EVALUATE & GRADE FORM */}
      {activeSubmissionId && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setActiveSubmissionId(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3">
              <Award className="h-5 w-5 text-indigo-400" /> Chấm điểm & Nhận xét Sản phẩm
            </h3>

            {(() => {
              const sub = store.submissions.find(s => s.id === activeSubmissionId);
              const chal = store.assignments.find(a => a.id === sub?.assignmentId);
              const stud = store.users.find(u => u.id === sub?.studentId);
              return (
                <form onSubmit={handleGradeSubmission} className="space-y-4 text-xs">
                  <div className="bg-black/25 rounded-xl p-3 border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 block uppercase">Nội dung bài làm ({stud?.name})</span>
                    <p className="text-white/80 leading-relaxed font-mono whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
                      {sub?.content}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70">Nhập Điểm số (Tối đa: {chal?.maxScore || 100})</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={chal?.maxScore || 100}
                      value={gradingScore}
                      onChange={(e) => setGradingScore(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/70">Góp ý & Nhận xét của Giảng viên</label>
                    <textarea
                      required
                      placeholder="Ví dụ: Ý tưởng tốt, cách trình bày rõ ràng, cần tối ưu thêm mã nguồn."
                      value={gradingFeedback}
                      onChange={(e) => setGradingFeedback(e.target.value)}
                      className="w-full px-3 py-2 bg-black/20 text-white h-20 max-h-32 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubmissionId(null)}
                      className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                    >
                      Hoàn tất Chấm điểm
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

    </>
  );
}
