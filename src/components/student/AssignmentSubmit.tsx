import React, { useRef, useState } from "react";
import { BookOpen, GraduationCap, CheckCircle, Bookmark, Award, Send, Clock, Play, Check, Lock, User, Search, ChevronRight, ArrowRight, HelpCircle, FileCheck, AlertCircle, X, FileText, CreditCard, Phone, Calendar, Home, Shield, Activity, DollarSign, Printer, FileSpreadsheet, Cpu, BadgeAlert } from "lucide-react";
import { AppStore } from "../../store";

interface ComponentProps {
  [key: string]: any;
}

export default function AssignmentSubmit(props: ComponentProps) {
  const {
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
  } = props;

  // Local file state for the submission modal
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionFile(e.target.files?.[0] || null);
  };

  const handleSubmitWithFile = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = submissionCodeText.trim().length > 0;
    const hasFile = submissionFile !== null;
    if (!hasText && !hasFile) {
      triggerToast("Vui lòng nhập nội dung bài làm hoặc đính kèm tệp.");
      return;
    }
    // Build combined content including file reference
    let finalContent = submissionCodeText.trim();
    if (hasFile) {
      finalContent += (finalContent ? "\n\n" : "") + `[Tệp đính kèm: ${submissionFile!.name} (${(submissionFile!.size / 1024).toFixed(1)} KB)]`;
    }
    // Temporarily override submissionCodeText via a synthetic event trick
    // by calling the handler with the composed content
    const syntheticContent = finalContent;
    setSubmissionCodeText(syntheticContent);
    setSubmissionFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Defer to next tick so state update is applied before submit
    setTimeout(() => {
      handleSendAssignmentSubmit(e);
    }, 0);
  };

  return (
    <>
        {/* Tab 3: Assignments list & Submissions panels */}
        {activeSubTab === "assignments" && (
          <div className="space-y-6">
            <h4 className="text-base font-display font-semibold text-white">Danh sách Thách thức & Bài tập thực hành</h4>

            <div className="space-y-4">
              {store.assignments.filter(a => myEnrolledCourseIds.includes(a.courseId)).map(a => {
                const sub = store.submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id);
                const courseTitle = store.courses.find(c => c.id === a.courseId)?.title || "Không xác định";
                const isDeadlineExpired = new Date(a.deadline).getTime() < Date.now();

                return (
                  <div key={a.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-white/20 transition duration-150">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase">{courseTitle}</span>
                          <span className="text-[10px] font-mono text-white/40">Hạn nộp: {new Date(a.deadline).toLocaleDateString()}</span>
                        </div>

                        <h5 className="text-sm font-bold text-white pr-2 truncate">{a.title}</h5>
                        <p className="text-xs text-white/60 leading-relaxed max-w-2xl font-sans break-words">{a.description}</p>

                        {sub && (
                          <div className="pt-2 bg-black/20 p-3 rounded-xl border border-white/5 space-y-1.5 max-w-2xl">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold block">Nội dung bài làm đã nộp</span>
                            
                            {/* Chống tràn chữ: Dùng whitespace-pre-wrap & break-words */}
                            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5 max-h-40 overflow-y-auto pr-1">
                              <p className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">{sub.content}</p>
                            </div>
                            
                            {sub.score !== undefined ? (
                              <div className="pt-1.5 border-t border-white/5 text-xs text-white flex items-center gap-3">
                                <span>Điểm số: <strong className="text-emerald-400">{sub.score}/{a.maxScore}</strong></span>
                                {sub.feedback && <span className="text-white/40 font-sans italic">" {sub.feedback} "</span>}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-300 font-bold block pt-1 font-mono">Trạng thái: Đang chấm điểm...</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 self-start md:self-auto">
                        {!sub ? (
                          <button
                            onClick={() => {
                              if (isDeadlineExpired) {
                                triggerToast("Đã quá hạn nộp bài tập này!");
                                return;
                              }
                              setSubmittingAssignmentId(a.id);
                              setSubmissionCodeText("");
                            }}
                            disabled={isDeadlineExpired}
                            className="p-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl disabled:bg-white/10 disabled:text-white/40 transition cursor-pointer"
                          >
                            Nộp bài làm
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (isDeadlineExpired) {
                                triggerToast("Đã quá hạn nộp bài tập này!");
                                return;
                              }
                              setSubmittingAssignmentId(a.id);
                              setSubmissionCodeText(sub.content);
                            }}
                            className="p-1.5 px-3 bg-white/5 hover:bg-white/10 text-xs border border-white/10 text-white/80 rounded-xl transition cursor-pointer"
                          >
                            Cập nhật bài nộp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {store.assignments.filter(a => myEnrolledCourseIds.includes(a.courseId)).length === 0 && (
                <div className="text-center py-16 text-white/40 bg-black/10 rounded-2xl border border-dashed border-white/5 text-xs">
                  Hiện chưa có bài tập tự luận hay thách thức thực hành nào được giao cho khóa học này.
                </div>
              )}
            </div>
          </div>
        )}

      {/* ASSIGNMENT ATTACHMENT MODAL SUBMISSION */}
      {submittingAssignmentId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6.5 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setSubmittingAssignmentId(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3">
              <FileText className="h-5 w-5 text-indigo-400" /> Nộp sản phẩm & Bài làm bài tập tự luận
            </h3>

            <p className="text-xs text-white/50 leading-relaxed mb-4">
              Vui lòng soạn thảo hoặc dán mã nguồn, câu trả lời, nhận xét phân tích hoặc liên kết sản phẩm của bạn vào khung bên dưới. Sau khi hoàn thành, giảng viên sẽ chấm điểm và để lại nhận xét góp ý.
            </p>

            <form onSubmit={handleSubmitWithFile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Nội dung bài làm (văn bản / mã nguồn)</label>
                <textarea
                  placeholder="Nhập mã nguồn HTML, tóm tắt giải pháp hay nội dung trả lời câu hỏi bài tập tự luận..."
                  value={submissionCodeText}
                  onChange={(e) => setSubmissionCodeText(e.target.value)}
                  className="w-full px-3.5 py-3 bg-black/30 text-white font-mono placeholder-white/20 h-36 max-h-48 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 text-xs mt-2"
                />
              </div>

              {/* File attachment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/70">Hoặc đính kèm tệp</label>
                <label className={`mt-1.5 flex items-center gap-3 w-full px-4 py-3 border border-dashed rounded-xl cursor-pointer transition text-xs ${submissionFile ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-300" : "border-white/15 bg-white/3 text-white/40 hover:border-white/30 hover:text-white/60"}`}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {submissionFile ? submissionFile.name : "Chọn tệp đính kèm (PDF, DOCX, ZIP, ảnh...)"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.zip,.rar,.png,.jpg,.jpeg,.txt,.py,.js,.html,.css,.java,.cpp,.c"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {submissionFile && (
                  <button
                    type="button"
                    onClick={() => { setSubmissionFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> Xóa tệp đính kèm
                  </button>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setSubmittingAssignmentId(null); setSubmissionFile(null); }}
                  className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                >
                  Xác nhận Nộp bài
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hướng dẫn chuyển khoản học phí Modal */}
    </>
  );
}
