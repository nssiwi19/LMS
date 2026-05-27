import React, { useState } from "react";
import { BookOpen, GraduationCap, CheckCircle, Bookmark, Award, Send, Clock, Play, Check, Lock, User, Search, ChevronRight, ArrowRight, HelpCircle, FileCheck, AlertCircle, X, FileText, CreditCard, Phone, Calendar, Home, Shield, Activity, DollarSign, Printer, FileSpreadsheet, Cpu, BadgeAlert } from "lucide-react";
import { AppStore } from "../../store";
import { api } from "../../api";

/** Format date string to dd/mm/yyyy. Never shows time. Returns '—' for empty. */
const fmtDate = (s?: string | null): string => {
  if (!s) return "—";
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = plain ? new Date(s + "T00:00:00") : new Date(s);
  if (isNaN(d.getTime())) return s || "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

interface ComponentProps {
  [key: string]: any;
}

export default function StudentAcademics(props: ComponentProps) {
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

  // Dynamic GPA and Credits calculation
  const enrollmentsByCourse: Record<string, any[]> = {};
  myEnrollments.forEach((enroll: any) => {
    if (!enrollmentsByCourse[enroll.courseId]) {
      enrollmentsByCourse[enroll.courseId] = [];
    }
    enrollmentsByCourse[enroll.courseId].push(enroll);
  });

  const uniqueCourseGrades = Object.entries(enrollmentsByCourse).map(([courseId, enrolls]) => {
    const course = store.courses.find((c: any) => c.id === courseId);
    if (!course) return null;

    let maxGradeNum = 0;
    let isCompleted = false;

    enrolls.forEach((enroll: any) => {
      if (enroll.status === "completed") {
        isCompleted = true;
      }
      const enrolledAssignments = store.assignments.filter((a: any) => a.courseId === courseId);
      const assignmentSubmissions = store.submissions.filter((s: any) => 
        s.studentId === currentUser.id && 
        enrolledAssignments.some((ea: any) => ea.id === s.assignmentId)
      );

      let finalGradeNum = 0;
      const earnedAttempts = assignmentSubmissions.filter((s: any) => s.score !== undefined);
      if (earnedAttempts.length > 0) {
        const sumScore = earnedAttempts.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
        const maxScore = earnedAttempts.reduce((sum: number, s: any) => {
          const eaObj = enrolledAssignments.find((ea: any) => ea.id === s.assignmentId);
          return sum + (eaObj ? eaObj.maxScore : 100);
        }, 0);
        finalGradeNum = Math.round((sumScore / (maxScore || 1)) * 100);
      } else {
        finalGradeNum = enroll.status === "completed" ? 85 : 0;
      }

      if (finalGradeNum > maxGradeNum) {
        maxGradeNum = finalGradeNum;
      }
    });

    let scale4Val = 0;
    let letterGrade = "F";
    if (maxGradeNum >= 85) { scale4Val = 4.0; letterGrade = "A"; }
    else if (maxGradeNum >= 75) { scale4Val = 3.0; letterGrade = "B"; }
    else if (maxGradeNum >= 60) { scale4Val = 2.0; letterGrade = "C"; }
    else if (maxGradeNum >= 50) { scale4Val = 1.0; letterGrade = "D"; }
    else { scale4Val = 0.0; letterGrade = "F"; }

    return {
      courseId,
      course,
      grade: maxGradeNum,
      scale4Val,
      letterGrade,
      isCompleted,
      credits: 3
    };
  }).filter(Boolean) as Array<{
    courseId: string;
    course: any;
    grade: number;
    scale4Val: number;
    letterGrade: string;
    isCompleted: boolean;
    credits: number;
  }>;

  const calculatedCredits = uniqueCourseGrades.reduce((sum, c) => {
    if (c.isCompleted || c.grade >= 50) {
      return sum + c.credits;
    }
    return sum;
  }, 0);

  const gradedCourses = uniqueCourseGrades.filter(c => c.isCompleted || c.grade > 0);
  const calculatedGpa = gradedCourses.length > 0 
    ? gradedCourses.reduce((sum, c) => sum + (c.scale4Val * c.credits), 0) / gradedCourses.reduce((sum, c) => sum + c.credits, 0)
    : 0.0;

  return (
    <>
        {activeSubTab === "profile" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h4 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                  <User className="h-5 w-5 text-indigo-400" /> Hồ sơ lý lịch Học sinh Sinh viên
                </h4>
                <p className="text-xs text-white/50">Mã định danh duy nhất của bạn: <span className="text-cyan-400 font-mono font-bold">{myProfile.studentCode}</span></p>
              </div>
              <button
                onClick={() => setShowProfileEditForm(!showProfileEditForm)}
                className="px-3.5 py-1.5 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                {showProfileEditForm ? "Bỏ qua điều chỉnh" : "Cập nhật hồ sơ"}
              </button>
            </div>

            {!showProfileEditForm ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual student card info */}
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-white/10 p-5 rounded-3xl relative overflow-hidden space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center font-bold text-lg text-indigo-300 font-mono">
                      {currentUser.name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-sm">{currentUser.name}</h5>
                      <span className="text-[10.5px] text-indigo-300 font-mono font-bold block">{myProfile.studentCode} • dự kiến tốt nghiệp: {fmtDate(myProfile.expectedGraduation)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <span className="text-white/40 block">Điện thoại</span>
                      <span className="font-bold text-white mt-0.5">{myProfile.phone || "Chưa bổ sung"}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Ngày sinh</span>
                      <span className="font-bold text-white mt-0.5">{fmtDate(myProfile.dateOfBirth)}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Giới tính</span>
                      <span className="font-bold text-white mt-0.5">{myProfile.gender || "Chưa thiết lập"}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Ngày nhập học</span>
                      <span className="font-bold text-white font-mono text-indigo-300 mt-0.5">{fmtDate(myProfile.enrollmentDate)}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 text-xs">
                    <span className="text-white/40 block">Địa chỉ thường trú</span>
                    <span className="font-bold text-white mt-0.5">{myProfile.address || "Chưa có địa chỉ cụ thể"}</span>
                  </div>
                </div>

                {/* Guardian info card */}
                <div className="bg-white/3 border border-white/5 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> Thông tin Cố vấn & Người bảo hộ
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-white/40 block">Người bảo hộ</span>
                        <span className="font-bold text-white mt-0.5">{myProfile.guardianName || "Chưa cập nhật"}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">Số điện thoại liên hệ</span>
                        <span className="font-bold text-white mt-0.5">{myProfile.guardianPhone || "Chưa cập nhật"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 text-xs bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                    <p className="text-[10.5px] leading-relaxed text-indigo-300">
                      ℹ️ Thông tin người bảo hộ vô cùng quan trọng dùng trong trường hợp khẩn cấp học phẩm hoặc cảnh cáo học tập từ Phòng Công tác Sinh viên (SVS).
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              // EDIT PROFILE FORM
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  // Validate phone
                  if (editPhone) {
                    const phoneClean = editPhone.replace(/\s/g, "");
                    if (!/^0[0-9]{9}$/.test(phoneClean)) {
                      triggerToast("❗ Số điện thoại không hợp lệ. Phải là 10 số, bắt đầu bằng 0 (VD: 0912345678).");
                      return;
                    }
                  }
                  // Validate birthdate required
                  if (!editBirth) {
                    triggerToast("❗ Ngày sinh là bắt buộc. Vui lòng chọn ngày sinh.");
                    return;
                  }
                  if (new Date(editBirth) > new Date()) {
                    triggerToast("❗ Ngày sinh không thể là ngày trong tương lai.");
                    return;
                  }
                  const storeData = AppStore.get();
                  
                  // Call backend API to persist in PostgreSQL database securely
                  api.updateStudentProfile({
                    phone: editPhone || undefined,
                    dateOfBirth: editBirth || undefined,
                    gender: editGender || undefined,
                    address: editAddress || undefined,
                    guardianName: editParent || undefined,
                    guardianPhone: editParentPhone || undefined
                  }).then(() => {
                    storeData.studentProfiles = (storeData.studentProfiles || []).map(p => {
                      if (p.userId === currentUser.id) {
                        AppStore.log(currentUser.id, "update_profile", p.studentCode, "Cập nhật hồ sơ thông tin trực tuyến.");
                        return {
                          ...p,
                          phone: editPhone,
                          dateOfBirth: editBirth,
                          gender: editGender,
                          address: editAddress,
                          guardianName: editParent,
                          guardianPhone: editParentPhone
                        };
                      }
                      return p;
                    });
                    
                    // Keep client state in sync
                    AppStore.save(storeData);
                    setShowProfileEditForm(false);
                    onRefreshData();
                    triggerToast("✅ Cập nhật hồ sơ lý lịch thành công!");
                  }).catch(err => {
                    console.error("Profile update failed:", err);
                    triggerToast("❗ Cập nhật hồ sơ thất bại: " + err.message);
                  });
                }}
                className="bg-white/3 border border-white/5 rounded-3xl p-5 md:p-6 text-xs space-y-4"
              >
                {/* Required field notice */}
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl">
                  <span className="text-red-400 font-bold">*</span>
                  <span>Trường có dấu sao đỏ là bắt buộc nhập</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 block font-bold">
                      Số điện thoại cá nhân
                      <span className="text-white/35 text-[10px] font-normal ml-1">(10 số)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="VD: 0912345678"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/40 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 block font-bold">
                      Ngày sinh <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={editBirth}
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setEditBirth(e.target.value)}
                      className={`w-full px-3 py-2 bg-black/25 text-white border rounded-xl focus:outline-none focus:border-indigo-500/40 transition ${
                        !editBirth ? "border-red-500/40" : "border-white/10"
                      }`}
                    />
                    {!editBirth && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> Bắt buộc nhập
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 block font-bold">Giới tính</label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/40 transition"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 block font-bold">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ của bạn..."
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl"
                  />
                </div>

                <div className="border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 block font-bold">Tên người bảo hộ (Bố/Mẹ)</label>
                    <input
                      type="text"
                      placeholder="Họ tên bố mẹ bảo lãnh"
                      value={editParent}
                      onChange={(e) => setEditParent(e.target.value)}
                      className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 block font-bold">Điện thoại liên hệ bảo hộ</label>
                    <input
                      type="text"
                      placeholder="SĐT người bảo lãnh"
                      value={editParentPhone}
                      onChange={(e) => setEditParentPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileEditForm(false)}
                    className="px-4 py-2 bg-transparent text-white/50 hover:text-white cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    Lưu trữ hồ sơ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab SIS 2: Educational Progress Record and GPA credit calculations */}
        {activeSubTab === "academics_record" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h4 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                <Bookmark className="h-5 w-5 text-indigo-400" /> Kết quả Học tập niên khóa
              </h4>
              <p className="text-xs text-white/50">Cơ chế quản điểm 4.0 và phân chia tiến trình theo Tín chỉ đợt học phần.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center">
                <span className="text-[10px] text-white/40 block uppercase font-bold">Điểm GPA Tích lũy</span>
                <span className="text-3xl font-mono font-black text-amber-400 mt-1 block">{calculatedGpa.toFixed(2)}</span>
                <span className="text-[10px] text-white/30 font-serif italic mt-0.5 block">Hệ số 4.0 chuẩn hóa</span>
              </div>
              <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center">
                <span className="text-[10px] text-white/40 block uppercase font-bold">Tích lũy Tín chỉ</span>
                <span className="text-3xl font-mono font-black text-indigo-300 mt-1 block">{calculatedCredits} Tín</span>
                <span className="text-[10px] text-white/30 italic mt-0.5 block">Tối thiểu tốt nghiệp: 120 Tín</span>
              </div>
              <div className="bg-white/3 border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-wide">Trạng thái Sinh viện</span>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase rounded-lg mt-1.5">
                  {myProfile.status}
                </span>
              </div>
            </div>

            {/* GPA calculations formulas rules box */}
            <div className="bg-indigo-950/20 border border-indigo-500/10 p-4.5 rounded-2xl text-xs space-y-1.5 text-indigo-300 leading-relaxed font-sans">
              <h5 className="font-bold flex items-center gap-1"><Cpu className="h-4 w-4" /> Công thức cấu thành Điểm trung bình GPA</h5>
              <p>Công thức áp dụng hệ điểm 4: A=4.0; B=3.0; C=2.0; D=1.0; F=0.0. Điểm môn học phần:</p>
              <code className="block p-2 bg-slate-900 rounded text-center text-cyan-400 font-mono font-bold font-black text-[11px] select-all">
                GPA = Sum(GradePoint × Tín chỉ) / Sum(Tổng số Tín chỉ có điểm)
              </code>
            </div>

            {/* Curriculum checklist details */}
            <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block border-b border-white/5 pb-2">Danh sách lớp đào tạo đang học</span>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase text-white/45">
                    <th className="py-2">Học phần Môn học</th>
                    <th className="py-2 text-center">Tín chỉ</th>
                    <th className="py-2">Tên lớp đào tạo</th>
                    <th className="py-2 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/2 text-xs text-white/85">
                  {myEnrollments.map(enroll => {
                    const course = store.courses.find(c => c.id === enroll.courseId);
                    return (
                      <tr key={enroll.id}>
                        <td className="py-2.5 font-bold text-white">{course ? course.title : "Không xác định"}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-indigo-300">3 Tín</td>
                        <td className="py-2.5 text-white/50">{course ? course.category : "Không xác định"}</td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          {enroll.status === "completed" ? "Đã xong" : "Đang học"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab SIS 3: Attendance details summaries with alerts alerts */}
        {activeSubTab === "student_attendance" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h4 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                <Activity className="h-5 w-5 text-indigo-400" /> Báo cáo chuyên học & Giờ điểm danh
              </h4>
              <p className="text-xs text-white/50">Quy chuẩn chuyên cần nghiêm thắt, vắng quá 20% (dưới mốc 80%) sẽ bị đình chỉ tư cách dự thi kết môn học kỳ.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEnrollments.map(enroll => {
                const course = store.courses.find(c => c.id === enroll.courseId);
                if (!course) return null;

                const sessions = (store.attendanceSessions || []).filter(s => s.courseId === course.id);
                const sessionsCount = sessions.length;
                
                const myRecords = (store.attendanceRecords || []).filter(r => 
                  r.studentId === currentUser.id &&
                  sessions.some(s => s.id === r.sessionId)
                );

                const countPresent = myRecords.filter(r => r.status === "present" || r.status === "late" || r.status === "excused").length;
                const percentage = sessionsCount > 0 ? Math.round((countPresent / sessionsCount) * 100) : 100;

                return (
                  <div key={enroll.id} className="bg-white/4 border border-white/5 rounded-2xl p-4.5 space-y-3">
                    <div className="flex justify-between items-start leading-tight">
                      <h5 className="font-bold text-white text-xs max-w-[70%] truncate">{course.title}</h5>
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        percentage >= 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500 animate-pulse"
                      }`}>
                        {percentage}%
                      </span>
                    </div>

                    <div className="text-xs text-white/50 flex justify-between font-mono">
                      <span>Đi học đầy đủ: {countPresent}/{sessionsCount} buổi tổng</span>
                      <span>Vắng: {sessionsCount - countPresent} buổi</span>
                    </div>

                    {/* Progress tracking display bar */}
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${percentage >= 80 ? "bg-emerald-400" : "bg-red-500"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {percentage < 80 && (
                      <div className="text-[10px] text-red-400 bg-red-400/5 p-2 rounded-xl border border-red-500/10 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> Cảnh cáo chuyên cần: Bạn có nguy cơ không đủ tư cách dự thi môn này do vắng vượt giới hạn!
                      </div>
                    )}
                  </div>
                );
              })}
              {myEnrollments.length === 0 && (
                <div className="col-span-2 text-center text-white/40 py-12">Không tìm thấy kế hoạch dữ liệu chuyên cần học phần.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab SIS 4: Tuition manager and bills receivables payment histories */}
        {activeSubTab === "student_tuition" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-3">
              <h4 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                <DollarSign className="h-5 w-5 text-indigo-400" /> Bản kê khai học phí và nộp trực tuyến
              </h4>
              <p className="text-xs text-white/50">Hệ hạch học phí, thanh toán biên thu trực tiếp kết toán.</p>
            </div>

            {/* Tuition fee list */}
            <div className="space-y-4">
              {(store.tuitionFees || []).filter(f => f.studentId === currentUser.id).map(fee => {
                const remaining = fee.amount - fee.paidAmount;
                const isOverdue = new Date(fee.dueDate) < new Date() && fee.status !== "paid";

                return (
                  <div key={fee.id} className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black">
                          Học Kỳ: {fee.semesterId === "sem_spring25" ? "Spring 2025" : fee.semesterId}
                        </span>
                        <h5 className="font-bold text-white text-xs mt-1">Học phí đợt tuyển sinh và hoạt động lý thuyết học viện</h5>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono self-start sm:self-auto ${
                        fee.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-red-500/10 text-red-500 border border-red-500/15"
                      }`}>
                        {fee.status === "paid" ? "Đã quy hóa đơn" : "Đang nợ phí"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-white/40 block">Tổng hóa đơn học phí</span>
                        <span className="font-bold text-white mt-0.5 text-sm">{fee.amount.toLocaleString()} VND</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">Đã thanh toán hóa đơn</span>
                        <span className="font-bold text-emerald-400 mt-0.5 text-sm">{fee.paidAmount.toLocaleString()} VND</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">Còn lại phải nộp</span>
                        <span className={`font-bold mt-0.5 text-sm ${remaining > 0 ? "text-red-400" : "text-white/60"}`}>{remaining.toLocaleString()} VND</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">Hạn đóng quy định</span>
                        <span className="font-bold text-indigo-300 mt-0.5">{fmtDate(fee.dueDate)}</span>
                      </div>
                    </div>

                    {isOverdue && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] leading-relaxed flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 animate-bounce" />
                        <span>Cảnh cáo: Tài khoản của bạn đã quá thời hạn đóng nợ học phí ({fee.dueDate}). Vui lòng hoàn tất giao dịch để duy trì tư cách dự thi học viện.</span>
                      </div>
                    )}

                    {/* QR Code trigger if unpaid remains */}
                    {fee.status !== "paid" && (
                      <div className="flex gap-4 items-center bg-black/25 p-4 rounded-xl border border-white/5 flex-col md:flex-row text-xs">
                        <div className="flex-1 space-y-1.5 text-xs text-white/70">
                          <p className="font-bold text-white font-sans text-xs">Cổng chuyển khoản nộp trực tuyến an toàn:</p>
                          <p className="leading-relaxed font-sans text-[11.5px]">Quét mã VietQR nộp trực tuyến dưới đây, kế toán sẽ đối soát và cập nhật tình trạng phê duyệt học viện tự động.</p>
                          <button
                            onClick={async () => {
                              try {
                                await api.payTuition({ feeId: fee.id, paidAmount: remaining });
                                triggerToast("✅ Hệ thống đã ghi nhận yêu cầu chuyển khoản và tự động phê duyệt hóa đơn học phí!");
                                onRefreshData();
                              } catch (err: any) {
                                console.error(err);
                                triggerToast("❗ Giao dịch thất bại: " + err.message);
                              }
                            }}
                            className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1 text-[11px] w-fit"
                          >
                            Tôi đã chuyển khoản (Giả lập test)
                          </button>
                        </div>
                        <div className="flex-shrink-0 p-3 bg-white rounded-xl border border-white/10 w-28 h-28 flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                              `MB Bank 099162438104 CONG TY E16 VIET NAM memo HOCPHI ${fee.studentId} remaining ${remaining}`
                            )}`}
                            alt="VietQR MB Bank E16"
                            className="w-24 h-24"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {(store.tuitionFees || []).filter(f => f.studentId === currentUser.id).length === 0 && (
                <div className="text-center py-12 text-white/40">Chưa ghi nhận bất kỳ chứng từ nợ học vị nào quy định.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab SIS 5: Official educational transcripts printable format requests */}
        {activeSubTab === "student_transcript" && (
          <div className="space-y-6 font-sans">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h4 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-400" /> Bảng điểm & Học bạ Học thuật (Official Transcript)
                </h4>
                <p className="text-xs text-white/50">Học bạ chính thức được chứng nhận dấu đỏ số hóa của E16.</p>
              </div>
              <button
                onClick={() => setShowPrintTranscript(true)}
                className="px-4 py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1 text-xs"
              >
                <Printer className="h-4 w-4" /> In Học Bạ Dấu Đỏ
              </button>
            </div>

            {/* Transcript Table and cumulative scores calculations */}
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
                <span className="font-mono text-cyan-400 font-bold">MÃ PROFILE: {myProfile.studentCode}</span>
                <span className="font-mono text-[11px] text-white/40">Thống kê điểm học sinh</span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase text-[10px]">
                      <th className="py-2.5">Tên môn học giảng dạy</th>
                      <th className="py-2.5 text-center">Tín chỉ</th>
                      <th className="py-2.5 text-center">Điểm số tự luận (100)</th>
                      <th className="py-2.5 text-center">Hệ số GPA (4.0)</th>
                      <th className="py-2.5 text-right">Học bạ xếp loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-white/85">
                    {uniqueCourseGrades.map(g => (
                      <tr key={g.courseId}>
                        <td className="py-3 font-bold text-white">{g.course.title}</td>
                        <td className="py-3 text-center font-mono font-bold text-indigo-300">{g.credits} Tín</td>
                        <td className="py-3 text-center font-mono font-bold text-white/70">{g.grade}</td>
                        <td className="py-3 text-center font-mono font-bold text-amber-400">{g.scale4Val.toFixed(1)}</td>
                        <td className="py-3 text-right font-black font-mono">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] ${
                            g.letterGrade === "A" ? "bg-emerald-500/10 text-emerald-400" :
                            g.letterGrade === "B" ? "bg-blue-500/10 text-blue-400" :
                            g.letterGrade === "C" ? "bg-cyan-500/10 text-cyan-400" :
                            g.letterGrade === "D" ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            Xếp loại {g.letterGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-white/50">
                <span>Tổng số tín chỉ tích lũy: <strong className="text-white">{calculatedCredits} Tín</strong></span>
                <span>GPA Trung bình Tích Lũy cuối đợt: <strong className="text-amber-400 text-sm">{calculatedGpa.toFixed(2)}</strong></span>
              </div>
            </div>

            <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 text-xs text-indigo-300 leading-relaxed font-sans">
              <p className="font-bold flex items-center gap-1"><HelpCircle className="h-4 w-4" /> Bản học bạ điện tử (E-Transcript):</p>
              <p className="mt-1 text-[11px]">Bản điểm điện tử này có giá trị xác nhận tương đương để tiếp đăng học lên các bậc học cao hơn của khối ngành liên thông quốc gia. Bất kỳ sự giả mạo dữ liệu can thiệp nào cũng đều bị lập biên của ban điều hành kiểm soát đào tạo.</p>
            </div>
          </div>
        )}
      {showPrintTranscript && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto rounded-3xl">
          <div className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none print:rounded-none">
            <button 
              onClick={() => setShowPrintTranscript(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer print:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Standard letterhead of academic institute */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4">
              <h3 className="text-sm font-serif font-black uppercase tracking-widest text-indigo-900">BỘ GIÁO DỤC VÀ ĐÀO TẠO • HỆ THỐNG PHÁT TRIỂN E16</h3>
              <h2 className="text-lg font-serif font-black uppercase tracking-tight text-slate-900">HỌC BẠ CHÍNH THỨC - BẢNG ĐIỂM HỌC TẬP</h2>
              <div className="text-[10px] text-slate-500 tracking-wider">Xác thực hệ thống điện tử khóa MB099162438104</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-serif italic text-slate-800">
              <div>
                <span className="block font-bold">Họ và tên Học sinh: {currentUser.name}</span>
                <span className="block">Mã số định danh: {myProfile.studentCode}</span>
                <span className="block">Khoa chuyên môn: Công nghệ Phần mềm</span>
              </div>
              <div className="text-right">
                <span className="block font-bold">Ngày nhập học: {fmtDate(myProfile.enrollmentDate)}</span>
                <span className="block">Ngày in học bạ: {new Date().toLocaleDateString()}</span>
                <span className="block">Trạng thái: Hoạt động chính thức</span>
              </div>
            </div>

            {/* Detailed tabular statistics */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mt-4 text-xs">
              <table className="w-full text-left border-collapse text-xs font-serif">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Học vị môn học đề cương</th>
                    <th className="py-2.5 px-3 text-center">Tín chỉ</th>
                    <th className="py-2.5 px-3 text-center">Điểm thi thử (100)</th>
                    <th className="py-2.5 px-3 text-center">Hệ số GPA (4.0)</th>
                    <th className="py-2.5 px-3 text-right">Xếp Loại học bạ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {uniqueCourseGrades.map((g, i) => (
                    <tr key={i} className="text-slate-950">
                      <td className="py-2.5 px-3 font-semibold">{g.course.title}</td>
                      <td className="py-2.5 px-3 text-center">{g.credits} Tín</td>
                      <td className="py-2.5 px-3 text-center">{g.grade}</td>
                      <td className="py-2.5 px-3 text-center">{g.scale4Val.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">Xếp loại {g.letterGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-300 pt-4 font-serif text-xs">
              <span>Tổng số Tín chỉ Tích lũy: <strong>{calculatedCredits} Tín chỉ</strong></span>
              <span>Điểm trung bình GPA chung: <strong className="text-slate-900 text-sm font-mono font-black">{calculatedGpa.toFixed(2)}</strong></span>
            </div>

            {/* Simulated seal and signature stamp */}
            <div className="flex justify-between items-center pt-8 text-xs font-serif">
              <div className="text-center space-y-1 select-none">
                <span className="block font-bold">MỘC XÁC THỰC ĐIỆN TỬ</span>
                <div className="w-16 h-16 rounded-full border-4 border-double border-red-500/80 flex items-center justify-center text-red-500 font-serif font-black text-[9px] rotate-12 mx-auto uppercase">
                   ĐÃ ĐÓNG DẤU E16
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <span className="block italic text-slate-500">Hà Nội, ngày cấp chứng tích</span>
                <span className="block font-bold">HỘI ĐỒNG TUYỂN SINH PHÒNG HỌC VỤ</span>
                <span className="block pt-8 font-sans font-black text-slate-400">E15 VIỆT NAM ĐÃ KÝ</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 text-xs print:hidden">
              <button
                type="button"
                onClick={() => setShowPrintTranscript(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Đóng học bạ
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Printer className="h-4.5 w-4.5" /> In Ngay Bây Giờ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
