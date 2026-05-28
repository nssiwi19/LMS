import React, { useState } from "react";
import { BookOpen, HelpCircle, FileText, Plus, Eye, Edit, Check, Award, Settings, Download, Tv, Trash, ChevronRight, TrendingUp, BarChart, Users, Clock, Search, MessageSquare, X, PlusCircle, FolderPlus } from "lucide-react";
import { AppStore } from "../../store";
import { generateId } from "../../utils";
import { Question } from "../../types";
import { api } from "../../api";

interface ComponentProps {
  [key: string]: any;
}

export default function QuizBuilder(props: ComponentProps) {
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<"quiz" | "essay">("quiz");
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
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
    studentSubmissionsRaw,
    onRefreshData,
    triggerToast
  } = props;

  const handleStartEditQuestion = (qst: Question) => {
    setEditingQuestionId(qst.id);
    setQText(qst.text);
    setQType(qst.type);
    setQOptions(qst.options.length > 0 ? [...qst.options] : ["", "", ""]);
    setQCorrect(qst.correctAnswer);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = async (qstId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi không?")) return;
    try {
      await api.deleteQuestion(qstId);
      const storeData = AppStore.get();
      storeData.questions = storeData.questions.filter(q => q.id !== qstId);
      AppStore.save(storeData);
      onRefreshData();
      triggerToast("Đã xóa câu hỏi thành công.");
    } catch (err: any) {
      console.error("Failed to delete question:", err);
      triggerToast(`Lỗi xóa câu hỏi: ${err.message || "Không thể kết nối máy chủ."}`);
    }
  };

  const handleQuestionFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;
    if (!qText.trim()) {
      triggerToast("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const storeData = AppStore.get();
    const cleanedOptions = qType !== "text" ? qOptions.filter((o: string) => o.trim() !== "") : [];

    try {
      if (editingQuestionId) {
        // Edit mode on Backend
        const updatedQuestion = await api.updateQuestion(editingQuestionId, {
          text: qText,
          type: qType,
          options: cleanedOptions,
          correctAnswer: qCorrect
        });

        storeData.questions = storeData.questions.map(q => {
          if (q.id === editingQuestionId) {
            return {
              ...q,
              text: qText,
              type: qType,
              options: cleanedOptions,
              correctAnswer: qCorrect
            };
          }
          return q;
        });
        AppStore.log(currentUser.id, "edit_quiz_question", qText, `Edited question ID: ${editingQuestionId} inside quiz: ${selectedQuizId}`);
        triggerToast("Đã cập nhật câu hỏi thành công.");
      } else {
        // Create mode on Backend
        const newQuestion = await api.addQuestion(selectedQuizId, {
          text: qText,
          type: qType,
          options: cleanedOptions,
          correctAnswer: qCorrect
        });

        storeData.questions.push(newQuestion as any);
        AppStore.log(currentUser.id, "add_quiz_question", qText, `Added question mapping inside quiz ID: ${selectedQuizId}`);
        triggerToast("Đã thêm câu hỏi mới thành công.");
      }

      setQText("");
      setQOptions(["", "", ""]);
      setQCorrect("0");
      setEditingQuestionId(null);
      setShowQuestionModal(false);
      onRefreshData();
      return;
    } catch (err: any) {
      console.error("Failed to save question:", err);
      triggerToast(`Lỗi lưu câu hỏi: ${err.message || "Không thể kết nối máy chủ."}`);
    }
  };

  return (
    <>
        {/* Tab 2: Quiz Management & Question Mapping panels */}
        {activeSubTab === "quizzes" && (
          <div className="space-y-6">
            <h4 className="text-base font-display font-semibold text-white mb-2">Phòng Quản lý Đề thi & Đánh giá Học thuật</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Segmented control & Lists */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
                {/* Segmented Toggle Tabs */}
                <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 gap-1">
                  <button
                    type="button"
                    onClick={() => setAssessmentType("quiz")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer text-center ${
                      assessmentType === "quiz"
                        ? "bg-white/10 text-white border border-white/10"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    Đề trắc nghiệm
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentType("essay")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer text-center ${
                      assessmentType === "essay"
                        ? "bg-white/10 text-white border border-white/10"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    Đề tự luận
                  </button>
                </div>

                <span className="text-xs font-semibold text-white uppercase tracking-wider block border-b border-white/10 pb-2">
                  {assessmentType === "quiz" ? "Đề trắc nghiệm đang hoạt động" : "Đề tự luận đang hoạt động"}
                </span>
                
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {assessmentType === "quiz" ? (
                    store.quizzes.filter(q => myCourseIds.includes(q.courseId)).map(q => {
                      const courseName = store.courses.find(c => c.id === q.courseId)?.title || "Khóa học ẩn danh";
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setSelectedQuizId(q.id)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs transition duration-150 relative block cursor-pointer ${
                            selectedQuizId === q.id 
                              ? "bg-white/15 border-white/20 text-white" 
                              : "bg-black/10 border-white/5 text-white/60 hover:text-white"
                          }`}
                        >
                          <h6 className="font-bold font-display leading-snug truncate max-w-[200px]">{q.title}</h6>
                          <span className="text-[10px] text-white/40 mt-1 block truncate font-mono">{courseName}</span>
                        </button>
                      );
                    })
                  ) : (
                    store.assignments.filter(a => myCourseIds.includes(a.courseId)).map(a => {
                      const courseName = store.courses.find(c => c.id === a.courseId)?.title || "Khóa học ẩn danh";
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedEssayId(a.id)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs transition duration-150 relative block cursor-pointer ${
                            selectedEssayId === a.id 
                              ? "bg-white/15 border-white/20 text-white" 
                              : "bg-black/10 border-white/5 text-white/60 hover:text-white"
                          }`}
                        >
                          <h6 className="font-bold font-display leading-snug truncate max-w-[200px]">{a.title}</h6>
                          <span className="text-[10px] text-white/40 mt-1 block truncate font-mono">{courseName}</span>
                        </button>
                      );
                    })
                  )}

                  {assessmentType === "quiz" && store.quizzes.filter(q => myCourseIds.includes(q.courseId)).length === 0 && (
                    <p className="text-xs text-white/40 text-center py-4">Chưa có đề thi trắc nghiệm nào.</p>
                  )}
                  {assessmentType === "essay" && store.assignments.filter(a => myCourseIds.includes(a.courseId)).length === 0 && (
                    <p className="text-xs text-white/40 text-center py-4">Chưa có đề thi tự luận nào.</p>
                  )}
                </div>

                {/* Create Buttons */}
                {assessmentType === "quiz" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (myCourses.length === 0) {
                        triggerToast("Bạn cần có khóa học được duyệt để thiết lập đề thi.");
                        return;
                      }
                      setSelectedCourseId(myCourses[0].id);
                      setQuizTitle("");
                      setShowQuizModal(true);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition text-xs"
                  >
                    <PlusCircle className="h-4 w-4" /> Khởi tạo Đề trắc nghiệm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (myCourses.length === 0) {
                        triggerToast("Bạn cần có khóa học được duyệt để giao bài tập.");
                        return;
                      }
                      setSelectedCourseId(myCourses[0].id);
                      setAssignTitle("");
                      setAssignDesc("");
                      setAssignDeadline("");
                      setShowAssignModal(true);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition text-xs"
                  >
                    <PlusCircle className="h-4 w-4" /> Khởi tạo Đề tự luận
                  </button>
                )}
              </div>

              {/* Right Side Column */}
              <div className="lg:col-span-2 space-y-4">
                {assessmentType === "quiz" ? (
                  selectedQuizId ? (
                    <>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <h5 className="text-sm font-bold text-white">Cấu hình câu hỏi đề thi trắc nghiệm</h5>
                          <p className="text-[11px] text-white/40">Mã đề thi: <span className="font-mono">{selectedQuizId}</span></p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => { setEditingQuestionId(null); setQText(""); setQOptions(["", "", ""]); setQCorrect("0"); setShowQuestionModal(true); }}
                          className="p-1 px-2.5 bg-[#2563eb] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="h-4 w-4 inline" /> Thêm Câu hỏi
                        </button>
                      </div>

                      <div className="space-y-3.5 pt-2 max-h-[600px] overflow-y-auto pr-1">
                        {store.questions.filter(qst => qst.quizId === selectedQuizId).map((qst, n) => (
                          <div key={qst.id} className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3 relative">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-xs font-bold text-white flex-1 pr-14">{n+1}. {qst.text}</span>
                              <span className="text-[10px] uppercase tracking-wider font-mono text-indigo-300 bg-white/5 py-0.5 px-2 rounded-full border border-white/10 text-right">
                                {qst.type === "single" ? "Một đáp án" : qst.type === "multiple" ? "Nhiều đáp án" : "Tự điền từ"}
                              </span>
                            </div>

                            {/* Edit / Delete Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                              <button
                                type="button"
                                onClick={() => handleStartEditQuestion(qst)}
                                className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                                title="Chỉnh sửa câu hỏi"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qst.id)}
                                className="p-1 text-red-400/60 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                                title="Xóa câu hỏi"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {qst.options.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                {qst.options.map((opt, idx) => (
                                  <div key={idx} className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                                    qst.correctAnswer.split(",").includes(String(idx)) 
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                      : "bg-black/20 border-white/5 text-white/50"
                                  }`}>
                                    <span className="font-bold text-[10px]">{idx + 1}.</span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {qst.type === "text" && (
                              <div className="text-[11px] text-emerald-400 font-mono pl-4">
                                Đáp án chính xác để đối soát tự động: <span className="bg-black/35 px-1.5 py-0.5 rounded border border-white/5">{qst.correctAnswer}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {store.questions.filter(qst => qst.quizId === selectedQuizId).length === 0 && (
                          <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/15">
                            <p className="text-xs text-white/40">Chưa có câu hỏi hay tiêu chí đánh giá nào được thiết lập.</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20 bg-black/10 rounded-2xl border border-dashed border-white/5 flex flex-col justify-center items-center">
                      <HelpCircle className="h-8 w-8 text-white/30 mb-2" />
                      <p className="text-xs text-white/50 font-sans">Chọn một đề thi trắc nghiệm từ danh sách bên trái để khám phá và quản lý các câu hỏi tương ứng.</p>
                    </div>
                  )
                ) : (
                  selectedEssayId ? (
                    (() => {
                      const essay = store.assignments.find(a => a.id === selectedEssayId);
                      const submissions = store.submissions.filter(s => s.assignmentId === selectedEssayId);
                      return (
                        <div className="space-y-6">
                          <div className="border-b border-white/10 pb-4">
                            <h5 className="text-base font-bold text-white mb-1">{essay?.title}</h5>
                            <p className="text-xs text-indigo-300 font-mono">Mã đề tự luận: <span className="text-white/60">{selectedEssayId}</span></p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                              <span className="text-[10px] text-white/40 uppercase block font-mono">Hạn nộp bài</span>
                              <span className="text-sm font-bold text-indigo-200">{essay ? new Date(essay.deadline).toLocaleDateString() : ""}</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                              <span className="text-[10px] text-white/40 uppercase block font-mono">Thang điểm tối đa</span>
                              <span className="text-sm font-bold text-emerald-400">{essay?.maxScore || 100} điểm</span>
                            </div>
                          </div>

                          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                            <span className="text-xs font-semibold text-white block uppercase font-mono tracking-wider">Yêu cầu thi tự luận</span>
                            <p className="text-xs text-white/70 leading-relaxed font-sans whitespace-pre-wrap break-words">{essay?.description}</p>
                          </div>

                          <div className="space-y-3">
                            <span className="text-xs font-semibold text-white block uppercase font-mono tracking-wider">Danh sách học viên đã nộp bài ({submissions.length})</span>
                            <div className="bg-black/25 border border-white/10 rounded-2xl overflow-hidden text-xs text-white/80">
                              <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 font-mono text-[10px] uppercase tracking-wider p-3">
                                <span>Học viên</span>
                                <span>Ngày nộp</span>
                                <span className="text-right">Điểm số</span>
                              </div>
                              <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                                {submissions.map(sub => {
                                  const student = store.users.find(u => u.id === sub.studentId);
                                  return (
                                    <div key={sub.id} className="grid grid-cols-3 p-3 items-center">
                                      <span className="font-semibold text-white">{student?.name || "Học viên ẩn danh"}</span>
                                      <span className="text-white/50">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                      <span className="text-right font-bold font-mono">
                                        {sub.score !== undefined ? (
                                          <span className="text-emerald-400">{sub.score}/{essay?.maxScore || 100}</span>
                                        ) : (
                                          <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px]">Chờ chấm</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                                {submissions.length === 0 && (
                                  <div className="p-4 text-center text-white/40 text-xs">
                                    Chưa có học viên nào nộp bài tự luận cho đề thi này.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-20 bg-black/10 rounded-2xl border border-dashed border-white/5 flex flex-col justify-center items-center">
                      <HelpCircle className="h-8 w-8 text-white/30 mb-2" />
                      <p className="text-xs text-white/50 font-sans">Chọn một đề thi tự luận từ danh sách bên trái để khám phá thông tin chi tiết và danh sách bài nộp.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

      {/* MODAL 3: CREATE QUIZ FORM */}
      {showQuizModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setShowQuizModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3">
              <Award className="h-5 w-5 text-indigo-400" /> Thiết lập Đề thi trắc nghiệm Khóa học
            </h3>

            <form onSubmit={handleAddQuizSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Tiêu đề Đề thi</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bài đánh giá năng lực cuối khóa"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Điểm đạt %</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={quizPassing}
                    onChange={(e) => setQuizPassing(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Thời gian (Phút)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={quizLimit}
                    onChange={(e) => setQuizLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Số lượt làm bài</label>
                  <input
                     type="number"
                     required
                     min={1}
                     max={10}
                     value={quizAttempts}
                     onChange={(e) => setQuizAttempts(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                >
                  Thiết lập Đề thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD QUESTION FORM */}
      {showQuestionModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button 
              type="button"
              onClick={() => { setShowQuestionModal(false); setEditingQuestionId(null); }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3">
              <PlusCircle className="h-5 w-5 text-indigo-400" /> {editingQuestionId ? "Chỉnh sửa câu hỏi trắc nghiệm" : "Tạo câu hỏi trắc nghiệm mới"}
            </h3>

            <form onSubmit={handleQuestionFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Nội dung câu hỏi</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đâu là cú pháp đúng để khai báo một biến trong TypeScript?"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Loại câu hỏi</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  >
                    <option value="single">Một đáp án đúng (Single Choice)</option>
                    <option value="multiple">Nhiều đáp án đúng (Multiple Choice)</option>
                    <option value="text">Tự điền từ thích hợp (Free text)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70">Chỉ số đáp án đúng / Từ khóa đáp án</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0 (Đáp án 1) hoặc 'bảo mật, kế thừa' cho dạng điền từ"
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {qType !== "text" && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-white/70 block">Cung cấp các lựa chọn đáp án (Tối đa 3 lựa chọn)</span>
                  {qOptions.map((opt, id) => (
                    <div key={id} className="flex items-center gap-2">
                      <span className="font-mono text-white/40">Lựa chọn {id + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`Nội dung lựa chọn đáp án #${id + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...qOptions];
                          nextOpts[id] = e.target.value;
                          setQOptions(nextOpts);
                        }}
                        className="flex-1 px-3 py-1.5 bg-black/20 text-white border border-white/10 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowQuestionModal(false); setEditingQuestionId(null); }}
                  className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                >
                  {editingQuestionId ? "Cập nhật câu hỏi" : "Thêm Câu hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
