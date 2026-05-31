import React, { useRef, useState } from "react";
import { BookOpen, GraduationCap, CheckCircle, Bookmark, Award, Send, Clock, Play, Check, Lock, User, Search, ChevronRight, ArrowRight, HelpCircle, FileCheck, AlertCircle, X, FileText, CreditCard, Phone, Calendar, Home, Shield, Activity, DollarSign, Printer, FileSpreadsheet, Cpu, BadgeAlert } from "lucide-react";
import { AppStore } from "../../store";
import ModalPortal from "../ModalPortal";

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
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionFile(e.target.files?.[0] || null);
  };

  const handleSubmitWithFile = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = submissionCodeText.trim().length > 0;
    const hasFile = submissionFile !== null;
    if (!hasText && !hasFile && !existingAttachment) {
      triggerToast("Vui lòng nhập nội dung bài làm hoặc đính kèm tệp.");
      return;
    }
    // Build combined content including file reference
    let finalContent = submissionCodeText.trim().replace(/\s*\[Tệp đính kèm:[^\]]+\]/g, "").trim();
    if (hasFile) {
      finalContent += (finalContent ? "\n\n" : "") + `[Tệp đính kèm: ${submissionFile!.name} (${(submissionFile!.size / 1024).toFixed(1)} KB)]`;
    } else if (existingAttachment) {
      finalContent += (finalContent ? "\n\n" : "") + `[Tệp đính kèm: ${existingAttachment}]`;
    }
    
    setSubmissionFile(null);
    setExistingAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSubmittingAssignment(true);
    Promise.resolve(handleSendAssignmentSubmit(e, finalContent)).finally(() => setIsSubmittingAssignment(false));
  };

  return (
    <>
        {/* Tab 3: Assignments list & Submissions panels */}
        {activeSubTab === "assignments" && (
          <div className="space-y-6">
            <h4 className="text-base font-display font-semibold text-white">Bài tập chưa hoàn thành của các khóa học</h4>

            <div className="space-y-4">
              {(() => {
                const uncompletedAssignments = store.assignments.filter(a => {
                  if (!myEnrolledCourseIds.includes(a.courseId)) return false;
                  const sub = store.submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id);
                  return !sub;
                });

                if (uncompletedAssignments.length === 0) {
                  return (
                    <div className="text-center py-16 text-white/40 bg-black/10 rounded-3xl border border-dashed border-white/10 text-xs flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="h-10 w-10 text-emerald-400 mb-1" />
                      <p className="font-semibold text-white">Tuyệt vời! Bạn đã hoàn thành tất cả bài tập.</p>
                      <p className="text-[11px] text-white/40">Không có bài tập chưa hoàn thành nào tại thời điểm này.</p>
                    </div>
                  );
                }

                return uncompletedAssignments.map(a => {
                  const courseTitle = store.courses.find(c => c.id === a.courseId)?.title || "Không xác định";
                  const isDeadlineExpired = new Date(a.deadline).getTime() < Date.now();

                  return (
                    <div key={a.id} className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 p-5 rounded-2xl hover:border-white/20 transition-all duration-200 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 py-0.5 px-2.5 rounded-full border border-indigo-500/20 uppercase">{courseTitle}</span>
                            <span className="text-[10px] font-mono text-white/40">Hạn nộp: {new Date(a.deadline).toLocaleDateString("vi-VN")}</span>
                          </div>

                          <h5 className="text-sm font-bold text-white pr-2 leading-snug break-words">{a.title}</h5>
                          <p className="text-xs text-white/60 leading-relaxed max-w-2xl font-sans break-words">{a.description}</p>
                        </div>

                        <div className="flex-shrink-0 self-start md:self-auto">
                          <button
                            onClick={() => {
                              if (isDeadlineExpired) {
                                triggerToast("Đã quá hạn nộp bài tập này!");
                                return;
                              }
                              setSubmittingAssignmentId(a.id);
                              setSubmissionCodeText("");
                              setExistingAttachment(null);
                            }}
                            disabled={isDeadlineExpired}
                            className="p-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition cursor-pointer shadow-lg shadow-indigo-600/10"
                          >
                            Nộp bài làm
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

      {/* ASSIGNMENT ATTACHMENT MODAL SUBMISSION */}
      {submittingAssignmentId && (
        <ModalPortal>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-6 md:pt-10 overflow-y-auto">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6.5 w-full max-w-lg shadow-2xl relative mb-10">
            <button
              onClick={() => setSubmittingAssignmentId(null)}
              disabled={isSubmittingAssignment}
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
                <label className={`mt-1.5 flex items-center gap-3 w-full px-4 py-3 border border-dashed rounded-xl cursor-pointer transition text-xs ${submissionFile ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-300" : existingAttachment ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" : "border-white/15 bg-white/3 text-white/40 hover:border-white/30 hover:text-white/60"}`}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {submissionFile ? submissionFile.name : existingAttachment ? `Giữ tệp cũ: ${existingAttachment}` : "Chọn tệp đính kèm (PDF, DOCX, ZIP, ảnh...)"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.zip,.rar,.png,.jpg,.jpeg,.txt,.py,.js,.html,.css,.java,.cpp,.c"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {submissionFile ? (
                  <button
                    type="button"
                    onClick={() => { setSubmissionFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> Xóa tệp đính kèm mới
                  </button>
                ) : existingAttachment ? (
                  <button
                    type="button"
                    onClick={() => setExistingAttachment(null)}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> Gỡ bỏ tệp cũ
                  </button>
                ) : null}
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setSubmittingAssignmentId(null); setSubmissionFile(null); }}
                  disabled={isSubmittingAssignment}
                  className="px-4 py-2 bg-transparent text-white/60 hover:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssignment}
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSubmittingAssignment ? "Đang gửi..." : "Xác nhận nộp bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Hướng dẫn chuyển khoản học phí Modal */}
    </>
  );
}
