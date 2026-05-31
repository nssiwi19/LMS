import React from "react";
import { BookOpen, GraduationCap, CheckCircle, Bookmark, Award, Send, Clock, Play, Check, Lock, User, Search, ChevronRight, ArrowRight, HelpCircle, FileCheck, AlertCircle, X, FileText, CreditCard, Phone, Calendar, Home, Shield, Activity, DollarSign, Printer, FileSpreadsheet, Cpu, BadgeAlert } from "lucide-react";
import { AppStore } from "../../store";

interface ComponentProps {
  [key: string]: any;
}

export default function MyLearningWorkspace(props: ComponentProps) {
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

  // Local state for active assignment detail and accordion sessions
  const [activeAssignmentId, setActiveAssignmentId] = React.useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = React.useState<Record<number, boolean>>({ 1: true });

  // Reset local states when user exits or enters a different course
  React.useEffect(() => {
    setActiveAssignmentId(null);
    setExpandedSessions({ 1: true });
  }, [learningCourseId]);

  // Construct structured study sessions by grouping lessons and assignments dynamically
  const getCourseSessions = () => {
    const courseLessons = currentLearningLessons || [];
    const courseAssignments = store.assignments.filter((a: any) => a.courseId === learningCourseId) || [];
    
    const numSessions = Math.max(courseLessons.length, 1);
    return Array.from({ length: numSessions }, (_, idx) => {
      const sessionNum = idx + 1;
      // Lesson index matches the session index
      const lessonsInSession = courseLessons.filter((_, lIdx) => lIdx === idx);
      
      // Distribute assignments cleanly:
      // If only 1 assignment, assign it to the last session.
      // If multiple, distribute them using modulo arithmetic.
      const assignmentsInSession = courseAssignments.filter((_, aIdx) => {
        if (courseAssignments.length === 1) {
          return sessionNum === numSessions;
        }
        return (aIdx % numSessions) === idx;
      });
      
      return {
        number: sessionNum,
        title: `Buổi học ${sessionNum}`,
        lessons: lessonsInSession,
        assignments: assignmentsInSession
      };
    });
  };

  const courseSessions = learningCourseId ? getCourseSessions() : [];

  return (
    <>
        {/* Tab 2: Registered Courses checklist (My Learning) */}
        {activeSubTab === "learning" && !learningCourseId && (
          <div className="space-y-6">
            <h4 className="text-base font-display font-semibold text-white">Khóa học Đào tạo của tôi</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myEnrollments.map(enroll => {
                const course = store.courses.find(c => c.id === enroll.courseId);
                if (!course) return null;
                const totalLessonsCount = store.lessons.filter(l => l.courseId === course.id).length;
                const completedProgress = store.lessonProgress.filter(p => p.enrollmentId === enroll.id && p.completed).length;
                const percentage = totalLessonsCount ? Math.round((completedProgress / totalLessonsCount) * 100) : 0;

                return (
                  <div key={enroll.id} className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-xl group">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[10px] font-mono text-indigo-300 uppercase bg-indigo-500/10 py-1 px-2.5 rounded-full border border-indigo-500/20 font-bold">
                          {course.category}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-bold border ${
                          enroll.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          enroll.status === "pending_payment" ? "bg-amber-500/10 text-amber-300 border-amber-500/20 font-bold" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {enroll.status === "pending_payment" ? "Chờ duyệt phí" : enroll.status === "active" ? "Đang học" : "Đã hoàn thành"}
                        </span>
                      </div>

                      <h5 className="font-display font-bold text-white text-base leading-tight group-hover:text-indigo-200 transition-colors">{course.title}</h5>
                      
                      {/* Interactive Progress Tracking */}
                      {enroll.status !== "pending_payment" && (
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-[11px] text-white/50 font-mono">
                            <span>Tiến độ học tập</span>
                            <span>{completedProgress}/{totalLessonsCount} bài đã đạt ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-md shadow-indigo-500/50"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {enroll.status === "pending_payment" && (
                        <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-[11px] text-amber-300/80 leading-relaxed font-sans shadow-inner">
                          ℹ️ Giao dịch chuyển khoản học phí đang chờ đối soát sao kê. Bạn sẽ nhận được thông báo ngay khi Kế toán duyệt giao dịch.
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 mt-5 flex justify-between items-center text-xs">
                      {enroll.status === "pending_payment" ? (
                        <>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-400/80">Chờ kế toán</span>
                          <button
                            onClick={() => {
                              const foundTx = store.transactions.find(t => t.studentId === currentUser.id && t.courseId === course.id);
                              if (foundTx) setPaymentGuideTx(foundTx);
                            }}
                            className="p-1.5 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 rounded-xl transition-all duration-200 cursor-pointer text-[10px]"
                          >
                            Hướng dẫn thanh toán
                          </button>
                        </>
                      ) : (
                        <>
                          <span></span>
                          <button
                            onClick={() => { setLearningCourseId(course.id); setActiveLessonId(null); }}
                            className="p-2 px-4.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
                          >
                            Vào lớp học <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {myEnrollments.length === 0 && (
                <div className="col-span-full text-center py-16 bg-black/10 border border-dashed border-white/5 rounded-2xl text-xs text-white/40">
                  Bạn chưa đăng ký lớp học nào. Vui lòng vào mục "Khám phá khóa học" để học hoặc liên hệ trường hỗ trợ.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 Detail: Active Classroom interactive study desk */}
        {activeSubTab === "learning" && learningCourseId && currentLearningCourse && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setLearningCourseId(null)}
                  className="flex items-center gap-2 p-2.5 px-4 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl cursor-pointer transition-all duration-200 shrink-0"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span>Quay lại danh sách</span>
                </button>
                <div className="h-6 w-px bg-white/10 hidden sm:block shrink-0" />
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">LỚP HỌC TRỰC TUYẾN</span>
                  <h4 className="text-lg font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 truncate max-w-sm md:max-w-md mt-0.5">
                    {currentLearningCourse.title}
                  </h4>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sidebar: Grouped Study Sessions (Accordion List) -> Width: 4/12 (33%) to give plenty of space */}
              <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 h-fit shadow-xl">
                <span className="text-xs font-bold text-white uppercase tracking-wider block border-b border-white/5 pb-2.5">Nội dung học tập</span>
                
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {courseSessions.map((session) => {
                    const isExpanded = expandedSessions[session.number] ?? false;

                    return (
                      <div key={session.number} className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 shadow-md">
                        {/* Session Accordion Header Toggle */}
                        <button
                          onClick={() => setExpandedSessions(prev => ({ ...prev, [session.number]: !isExpanded }))}
                          className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${
                            isExpanded ? "from-indigo-950/40 to-indigo-900/10 border-l-4 border-indigo-500" : "from-white/5 to-white/[0.02]"
                          } hover:from-white/10 hover:to-white/5 text-xs font-bold text-white transition-all duration-300 cursor-pointer`}
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                            <span>{session.title}</span>
                          </span>
                          <ChevronRight className={`h-4 w-4 text-white/40 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                        </button>

                        {/* Session Content Body */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-4 bg-slate-900/40 border-t border-white/5">
                            
                            {/* Sub-section: Lessons of this study session */}
                            {session.lessons.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block px-1">Bài học lý thuyết</span>
                                {session.lessons.map((les) => {
                                  const progress = store.lessonProgress.find(
                                    p => p.enrollmentId === activeLearningEnrollment?.id && p.lessonId === les.id
                                  );
                                  const isCompleted = progress?.completed ?? false;
                                  const isSelected = activeLessonId === les.id && !activeAssignmentId;

                                  return (
                                    <div 
                                      key={les.id} 
                                      className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all duration-200 cursor-pointer ${
                                        isSelected 
                                          ? "bg-indigo-600/20 border-indigo-500/40 text-white font-semibold shadow-lg shadow-indigo-500/5" 
                                          : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5"
                                      }`}
                                      onClick={() => {
                                        setActiveLessonId(les.id);
                                        setActiveAssignmentId(null);
                                      }}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent duplicate clicking actions
                                          if (activeLearningEnrollment) {
                                            handleToggleLessonComplete(activeLearningEnrollment.id, les.id);
                                          }
                                        }}
                                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer mt-0.5 ${
                                          isCompleted 
                                            ? "bg-emerald-500 border-emerald-500 text-slate-900 shadow-md shadow-emerald-500/10" 
                                            : "border-white/20 hover:border-white/40 bg-white/5"
                                        }`}
                                      >
                                        {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                      </button>
                                      
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium leading-normal break-words">{les.title}</p>
                                        <span className="text-[9px] font-mono text-white/30 mt-1 block">{les.duration}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Sub-section: Assignments/Exercises of this study session */}
                            {session.assignments.length > 0 && (
                              <div className="space-y-2 pt-3 border-t border-white/5">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block px-1">Bài tập tự luận</span>
                                {session.assignments.map((assign) => {
                                  const sub = store.submissions.find(s => s.assignmentId === assign.id && s.studentId === currentUser.id);
                                  const isSelected = activeAssignmentId === assign.id && !activeLessonId;

                                  // Submission status configuration
                                  let statusBg = "bg-white/5 text-white/40 border-white/5";
                                  let statusText = "Chưa nộp";
                                  if (sub) {
                                    if (sub.score !== undefined) {
                                      statusBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                                      statusText = `${sub.score}/${assign.maxScore} đ`;
                                    } else {
                                      statusBg = "bg-amber-500/20 text-amber-300 border-amber-500/30";
                                      statusText = "Đang chấm";
                                    }
                                  }

                                  return (
                                    <div 
                                      key={assign.id} 
                                      className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all duration-200 cursor-pointer ${
                                        isSelected 
                                          ? "bg-indigo-600/20 border-indigo-500/40 text-white font-semibold shadow-lg shadow-indigo-500/5" 
                                          : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5"
                                      }`}
                                      onClick={() => {
                                        setActiveAssignmentId(assign.id);
                                        setActiveLessonId(null);
                                      }}
                                    >
                                      <FileText className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isSelected ? "text-indigo-400" : "text-white/30"}`} />
                                      
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <p className="font-medium leading-normal break-words">{assign.title}</p>
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                          <span className="text-[9px] font-mono text-white/30">Hạn: {new Date(assign.deadline).toLocaleDateString("vi-VN")}</span>
                                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold truncate shrink-0 ${statusBg}`}>
                                            {statusText}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Qualification Quiz Check trigger block */}
                {activeLearningEnrollment && (() => {
                  const checkQuiz = store.quizzes.find(q => q.courseId === learningCourseId);
                  const isAllSessionsRead = store.lessonProgress.filter(
                    p => p.enrollmentId === activeLearningEnrollment.id && p.completed
                  ).length === currentLearningLessons.length;

                  if (checkQuiz && isAllSessionsRead) {
                    return (
                      <div className="pt-2 border-t border-white/5 mt-4">
                        <button
                          onClick={() => handleStartQuiz(checkQuiz)}
                          className="w-full py-3 bg-[#16a34a] hover:bg-opacity-95 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
                        >
                          <Award className="h-4 w-4" /> Làm bài Đánh giá Cuối khóa
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Main Workspace Content Inspector -> Width: 8/12 (67%) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Condition 1: View Assignment detail & submission console */}
                {activeAssignmentId ? (() => {
                  const assignObj = store.assignments.find(a => a.id === activeAssignmentId);
                  if (!assignObj) return null;
                  
                  const sub = store.submissions.find(s => s.assignmentId === assignObj.id && s.studentId === currentUser.id);
                  const isDeadlineExpired = new Date(assignObj.deadline).getTime() < Date.now();

                  return (
                    <div className="bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                      {/* Decorative glow */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-5 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">BÀI TẬP TỰ LUẬN</span>
                          <h5 className="text-lg md:text-xl font-display font-extrabold text-white leading-tight flex items-center gap-2">
                            <FileText className="h-5.5 w-5.5 text-indigo-400 shrink-0" />
                            {assignObj.title}
                          </h5>
                        </div>
                        <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/20 shrink-0 self-start sm:self-auto font-semibold">
                          Hạn nộp: {new Date(assignObj.deadline).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest block">Yêu cầu & Hướng dẫn</span>
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 text-xs md:text-sm text-white/70 leading-relaxed font-sans whitespace-pre-line shadow-inner">
                          {assignObj.description}
                        </div>
                      </div>

                      {/* Display current submission content if already submitted */}
                      {sub && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">Bài làm đã nộp của bạn</span>
                          <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 max-h-60 overflow-y-auto font-mono text-xs text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                            {sub.content}
                          </div>
                          
                          {sub.score !== undefined ? (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs md:text-sm text-white flex flex-col gap-2 shadow-lg shadow-emerald-500/5">
                              <span className="font-bold flex items-center gap-2 text-emerald-400 text-sm">
                                <CheckCircle className="h-5 w-5 shrink-0" />
                                Điểm đánh giá học phần: {sub.score}/{assignObj.maxScore} đ
                              </span>
                              {sub.feedback && (
                                <p className="text-white/60 font-sans italic border-t border-white/5 pt-2 mt-1">
                                  Nhận xét của giảng viên: "{sub.feedback}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs font-medium text-amber-300 flex items-center gap-2 shadow-lg shadow-amber-500/5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                              <span>⏳ Trạng thái: Bài làm của bạn đang được giảng viên xem xét & chấm điểm.</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-4 border-t border-white/5 flex justify-end">
                        {!sub ? (
                          <button
                            onClick={() => {
                              if (isDeadlineExpired) {
                                triggerToast("Đã quá hạn nộp bài tập này!");
                                return;
                              }
                              setSubmittingAssignmentId(assignObj.id);
                              setSubmissionCodeText("");
                            }}
                            disabled={isDeadlineExpired}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 cursor-pointer"
                          >
                            Nộp bài tập làm
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (isDeadlineExpired) {
                                triggerToast("Đã quá hạn nộp bài tập này!");
                                return;
                              }
                              setSubmittingAssignmentId(assignObj.id);
                              // Strip file attachment brackets if editing existing
                              const match = sub.content.match(/\[Tệp đính kèm:\s*([^\]]+)\]/);
                              if (match) {
                                setSubmissionCodeText(sub.content.replace(/\s*\[Tệp đính kèm:[^\]]+\]/g, "").trim());
                              } else {
                                setSubmissionCodeText(sub.content);
                              }
                            }}
                            disabled={isDeadlineExpired}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            Cập nhật bài nộp mới
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })() : currentLessonContentObj ? (
                  
                  // Condition 2: View Lesson content (default display)
                  <div className="bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
                    
                    <div className="space-y-3">
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">BÀI HỌC CHI TIẾT</span>
                      <h5 className="text-xl md:text-2xl font-display font-extrabold text-white leading-tight">{currentLessonContentObj.title}</h5>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 pt-2 border-b border-white/5 pb-4">
                        <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-indigo-400" /> Hệ thống giáo dục E16</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-400" /> Thời lượng: {currentLessonContentObj.duration}</span>
                      </div>
                    </div>

                    <div className="text-sm text-white/80 leading-relaxed font-sans prose prose-invert max-w-none space-y-4 whitespace-pre-line bg-black/10 p-5 rounded-2xl border border-white/5 shadow-inner">
                      {currentLessonContentObj.content}
                    </div>

                    {currentLessonContentObj.videoUrl && (
                      <div className="space-y-3 pt-2">
                        <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block">Video bài giảng đi kèm</span>
                        <div className="aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative flex items-center justify-center group">
                          <video 
                            controls 
                            src={currentLessonContentObj.videoUrl} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  // Condition 3: Default Blank State Placeholder
                  <div className="text-center py-24 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col justify-center items-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
                    <BookOpen className="h-14 w-14 text-indigo-400/40 mb-4 animate-pulse" />
                    <h5 className="font-bold text-white text-base font-display">Chào mừng đến với lớp học trực tuyến!</h5>
                    <p className="text-xs text-white/50 max-w-sm mt-1.5 leading-relaxed">
                      Vui lòng nhấp chọn bất kỳ buổi học nào ở thanh bên trái, sau đó mở tài liệu bài học lý thuyết hoặc bài tập tự luận để bắt đầu quá trình nghiên cứu của bạn.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

    </>
  );
}
