import React, { useState } from "react";
import { 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Calendar, 
  BookOpen, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  FileCheck, 
  FileText, 
  Share2, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Info 
} from "lucide-react";
import { User, StudentProfile, AdvisorNote, AcademicWarning, TuitionFee, Course, Enrollment, AttendanceSession, AttendanceRecord, QuizAttempt } from "../types";
import { AppStore } from "../store";

interface ParentPanelProps {
  currentUser: User;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function ParentPanel({ currentUser, onLogout, onRefreshData }: ParentPanelProps) {
  const store = AppStore.get();
  
  // States
  const [activeTab, setActiveTab] = useState<"overview" | "grades" | "attendance" | "warnings" | "financial" | "notifications">("overview");
  const [gradesSearch, setGradesSearch] = useState("");
  const [courseDetailId, setCourseDetailId] = useState<string | null>(null);

  // Parents are linked to exactly one student via linkedStudentId
  const childId = currentUser.role === "student" ? currentUser.id : (currentUser.linkedStudentId || "user_student");
  const childUser = store.users.find(u => u.id === childId);
  const childProfile = store.studentProfiles.find(p => p.userId === childId);
  const childProgram = store.programs.find(p => p.id === childProfile?.programId);

  // Attendance metrics
  const courseEnrollments = store.enrollments.filter(e => e.studentId === childId && e.status !== "cancelled");

  // Filtered grades enrollment
  const filteredEnrollments = courseEnrollments.filter(enroll => {
    if (!gradesSearch.trim()) return true;
    const course = store.courses.find(c => c.id === enroll.courseId);
    return course?.title?.toLowerCase().includes(gradesSearch.toLowerCase());
  });

  if (!childProfile || !childUser) {
    return (
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 text-center text-white/50 font-sans">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">Lỗi cấu hình tài khoản Phụ Huynh</h3>
        <p className="text-xs mt-1">Không tìm thấy hồ sơ của học viên được liên kết với tài khoản phụ huynh này.</p>
      </div>
    );
  }

  // Calculate average attendance for child in courses
  const childRecords = store.attendanceRecords.filter(r => r.studentId === childId);
  const totalSessionsCount = childRecords.length;
  const presentSessionsCount = childRecords.filter(r => r.status === "present" || r.status === "late").length;
  const attendanceRate = totalSessionsCount > 0 ? (presentSessionsCount / totalSessionsCount) * 100 : 100;

  // Invoice parameters
  const childFees = store.tuitionFees.filter(f => f.studentId === childId);
  const totalOutstanding = childFees.filter(f => f.status !== "paid").reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

  // Active Warnings for child
  const childWarnings = store.academicWarnings.filter(w => w.studentId === childId && !w.isResolved);

  // Filter advisor notes shared with parent (where shareWithParent !== false)
  const sharedNotes = store.advisorNotes.filter(n => n.studentId === childId && (n as any).shareWithParent !== false);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Visual Identity banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-950/20 p-6 rounded-3xl border border-indigo-500/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/15 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cổng Thông Tin Phụ Huynh</h2>
            <p className="text-xs text-white/50 mt-0.5">Giám sát trực tuyến tiến độ học lực, chuyên cần và tài vụ của con em tại E16.</p>
          </div>
        </div>
        <div className="bg-black/35 py-1.5 px-4 rounded-2xl border border-white/5 text-xs text-white/70 flex flex-col md:text-right gap-1 font-mono">
          <span>Học sinh đại diện: <strong className="text-white text-sans">{childUser.name}</strong></span>
          <span className="text-[10px] text-white/40">Mã SV: {childProfile.studentCode} | Khoá: K{childProfile.academicYear}</span>
        </div>
      </div>

      {/* Grid statistics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/45 block tracking-wider uppercase font-semibold">Điểm TB Tích Lũy</span>
            <span className="text-lg font-black text-white mt-1 block">{childProfile.gpa.toFixed(2)} GPA</span>
          </div>
          <TrendingUp className="h-5 w-5 text-indigo-400" />
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/45 block tracking-wider uppercase font-semibold">Tỉ Lệ Điểm Danh</span>
            <span className={`text-lg font-black mt-1 block ${attendanceRate < 80 ? "text-red-400" : "text-emerald-400"}`}>
              {attendanceRate.toFixed(0)}% chuyên cần
            </span>
          </div>
          <Percent className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/45 block tracking-wider uppercase font-semibold">Tổng Dư Nợ Học Phí</span>
            <span className={`text-lg font-black mt-1 block ${totalOutstanding > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {totalOutstanding > 0 ? `${totalOutstanding.toLocaleString("vi-VN")} đ` : "Đã thanh toán đủ"}
            </span>
          </div>
          <DollarSign className="h-5 w-5 text-amber-500" />
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/45 block tracking-wider uppercase font-semibold">Cảnh Báo Chuyên Cần</span>
            <span className={`text-lg font-black mt-1 block ${childWarnings.length > 0 ? "text-red-400" : "text-white/40"}`}>
              {childWarnings.length > 0 ? `${childWarnings.length} Cảnh báo` : "An toàn"}
            </span>
          </div>
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>

      </div>

      {/* Main navigation layouts Split of Parent Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Navigator Side */}
        <div className="lg:col-span-3 bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col space-y-1 text-xs">
          <span className="text-[10px] font-mono tracking-widest text-white/30 block mb-2 px-3 uppercase">Danh mục quản lý</span>
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full text-left py-2.5 px-3 rounded-lg font-semibold transition cursor-pointer ${activeTab === "overview" ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            Tổng Quan Con Em
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`w-full text-left py-2.5 px-3 rounded-lg font-semibold transition cursor-pointer ${activeTab === "grades" ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            Bảng Điểm Học Tập
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`w-full text-left py-2.5 px-3 rounded-lg font-semibold transition cursor-pointer ${activeTab === "attendance" ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            Biểu Đồ Chuyên Cần
          </button>
          <button
            onClick={() => setActiveTab("warnings")}
            className={`w-full text-left py-2.5 px-3 rounded-lg font-semibold transition cursor-pointer ${activeTab === "warnings" ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            Cảnh Báo & Kỷ Luật ({childWarnings.length})
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={`w-full text-left py-2.5 px-3 rounded-lg font-semibold transition cursor-pointer ${activeTab === "financial" ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            Sổ Học Phí & Biên Lai
          </button>
        </div>

        {/* Right Active pane details */}
        <div className="lg:col-span-9 bg-slate-900 border border-white/10 rounded-2xl p-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hồ sơ lý lịch học tập</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Thông tin cơ bản được số hóa đồng bộ và cấp mã nhận diện SV trên SIS.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-white/70">
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Họ và Tên Học Viên:</span><span className="font-bold text-white">{childUser.name}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Mã Số Định Danh SV:</span><span className="font-mono text-white">{childProfile.studentCode}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Ngành Học Đăng Ký:</span><span className="text-white font-semibold">{childProgram?.name || "Chưa cập nhật"}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Xếp Loại Học Lực:</span><span className="font-bold text-indigo-400">{childProfile.gpa >= 3.2 ? "Giỏi/Xuất Sắc" : childProfile.gpa >= 2.5 ? "Khá" : "Trung Bình"}</span></div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Ngày Sinh Trực Tuyến:</span><span className="text-white">{childProfile.dateOfBirth || "Chưa cập nhật"}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Giới Tính Sinh Viên:</span><span className="text-white">{childProfile.gender || "Chưa cập nhật"}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Số Điện Thoại Trắc Lượng:</span><span className="font-mono text-white">{childProfile.phone || "Chưa cập nhật"}</span></div>
                  <div className="flex justify-between border-b border-white/5 py-1.5"><span className="text-white/40">Dự Kiến Tốt Nghiệp:</span><span className="text-white">{childProfile.expectedGraduation || "Chưa cập nhật"}</span></div>
                </div>
              </div>

              {/* Shared Advisor Notes section */}
              <div className="mt-8 pt-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Ý kiến / Nhận xét của Cố vấn học tập (Chia sẻ)</span>
                </div>

                <div className="space-y-3">
                  {sharedNotes.map(note => (
                    <div key={note.id} className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-indigo-400 uppercase">Cố Vấn Phạm Cố Vấn</span>
                        <span className="text-white/30 font-mono">{new Date(note.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <p className="text-xs text-white/75 leading-relaxed font-sans italic">"{note.content}"</p>
                    </div>
                  ))}

                  {sharedNotes.length === 0 && (
                    <p className="text-xs text-white/30 text-center py-4 bg-black/10 rounded-xl">Chưa có nhận xét chia sẻ nào từ cố vấn học tập.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: GRADES */}
          {activeTab === "grades" && (
            <div className="space-y-6">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Học bạ & Biểu điểm khóa học</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Tổng kết điểm thi đánh giá thường kì từ các Giáo sư phụ trách bộ môn.</p>
              </div>

              {/* Grades Search Input */}
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Tìm theo tên môn học..."
                  value={gradesSearch}
                  onChange={(e) => setGradesSearch(e.target.value)}
                  className="w-full bg-black/25 text-white border border-white/10 rounded-xl py-2 px-3 pl-8 text-xs outline-none focus:border-indigo-400 placeholder-white/20"
                />
                <span className="absolute left-2.5 top-2 px-1 text-white/40 text-xs">🔍</span>
              </div>

              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-white/75 divide-y divide-white/5">
                    <thead>
                      <tr className="text-white/45 uppercase tracking-wider text-[10px]">
                        <th className="py-2">Môn Học / Chủ Đề</th>
                        <th className="py-2">Giáo Viên Phụ Trách</th>
                        <th className="py-2">Kỳ Đăng Ký</th>
                        <th className="py-2 text-right">Mức Điểm Đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredEnrollments.map(enroll => {
                        const course = store.courses.find(c => c.id === enroll.courseId);
                        const teacher = store.users.find(u => u.id === course?.teacherId);

                        // Find any attempts
                        const attempts = store.quizAttempts.filter(qa => qa.studentId === childId && store.quizzes.filter(q => q.courseId === enroll.courseId).some(q => q.id === qa.quizId));
                        const maxQuizScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : null;

                        return (
                          <tr key={enroll.id}>
                            <td className="py-3 font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span>{course?.title || "Không xác định"}</span>
                                {course && (
                                  <button
                                    onClick={() => setCourseDetailId(course.id)}
                                    className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 py-0.5 px-1.5 rounded flex items-center gap-0.5 transition cursor-pointer font-sans"
                                  >
                                    Xem 👁️
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-white/45">{teacher?.name || "Không xác định"}</td>
                            <td className="py-3 font-mono">Học kỳ {course?.category || "Lớp SIS"}</td>
                            <td className="py-3 text-right font-mono text-emerald-400 font-bold">
                              {maxQuizScore ? `${maxQuizScore}% (Trắc nghiệm)` : "78% (Đánh giá chung)"}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredEnrollments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-white/30">Chưa ghi nhận khóa học đăng ký chính thức nào hoặc không khớp kết quả tìm kiếm.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10px] text-indigo-300 flex items-start gap-2 leading-relaxed">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Quy định bảo mật: Phụ huynh chỉ được quyền theo dõi biểu điểm chung và tiến độ học bạ. Quyền sửa điểm, phúc khảo, tham gia diễn đàn thảo luận lớp lý thuyết thuộc về sở hữu duy nhất của tài khoản học viên chính thức.</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tiến trình kiểm danh lớp học</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Cập nhật điểm chuyên cần, vắng mặt đột xuất trong các giờ chấm giảng đường.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseEnrollments.map(enroll => {
                    const course = store.courses.find(c => c.id === enroll.courseId);
                    
                    // Filter attendance for child in this course
                    const courseSessions = store.attendanceSessions.filter(s => s.courseId === enroll.courseId);
                    const records = childRecords.filter(r => courseSessions.some(s => s.id === r.sessionId));
                    
                    const totalS = records.length;
                    const presentS = records.filter(r => r.status === "present").length;
                    const lateS = records.filter(r => r.status === "late").length;
                    const absentS = records.filter(r => r.status === "absent").length;
                    const cRate = totalS > 0 ? ((presentS + lateS) / totalS) * 100 : 100;

                    return (
                      <div key={enroll.id} className="bg-black/20 p-4 border border-white/5 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-white block truncate max-w-[200px]">{course?.title}</span>
                          <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full font-mono ${cRate < 80 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                            {cRate.toFixed(0)}% Điểm danh
                          </span>
                        </div>
                        <div className="grid grid-cols-3 text-center text-[10px] bg-black/15 p-2 rounded-lg gap-2 text-white/55">
                          <div><span className="block text-emerald-400 font-bold">{presentS}</span> Có mặt</div>
                          <div><span className="block text-yellow-400 font-bold">{lateS}</span> Đi trễ</div>
                          <div><span className="block text-red-400 font-bold">{absentS}</span> Vắng học</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: WARNINGS */}
          {activeTab === "warnings" && (
            <div className="space-y-6">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Nhật ký xử phạt & Cảnh báo học tập</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Các trường hợp vi phạm quy định, nợ học phí hay tự động kích hoạt do KPI chuyên cần dưới 80%.</p>
              </div>

              <div className="space-y-3">
                {store.academicWarnings.filter(w => w.studentId === childId).map(warning => (
                  <div key={warning.id} className={`p-4 rounded-xl border flex gap-3 ${
                    warning.isResolved ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-red-500/5 border-red-500/10 text-red-400"
                  }`}>
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1 min-w-0 flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold uppercase">Cảnh Báo {warning.type === "attendance" ? "Chuyên Cần" : "Vấn Đề Kỷ Luật"}</span>
                        <span className="text-[10px] text-white/30 font-mono">{new Date(warning.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <p className="text-white/80">{warning.message}</p>
                      <span className="text-[10px] block font-semibold mt-1">Trạng thái xử lý: {warning.isResolved ? "Đơn vụ đã được cố vấn giải quyết xong" : "Đang chờ liên hệ cố vấn xử lý"}</span>
                    </div>
                  </div>
                ))}

                {store.academicWarnings.filter(w => w.studentId === childId).length === 0 && (
                  <p className="text-xs text-white/40 text-center py-6 bg-black/10 rounded-xl">Học viên có lý lịch trong sạch, chưa từng bị nhắc nhở hay vi phạm quy định.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: FINANCIAL */}
          {activeTab === "financial" && (
            <div className="space-y-6">
              
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hóa đơn học phí & Lịch sử đóng</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Tra cứu học bổng, phiếu thu tài chính cơ sở được cấp phép bởi Kế toán trưởng.</p>
              </div>

              <div className="space-y-4">
                {childFees.map(fee => {
                  const semester = store.semesters.find(s => s.id === fee.semesterId);
                  
                  return (
                    <div key={fee.id} className="p-5 bg-black/20 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{semester?.name || "Học kỳ Hiện Tại"}</span>
                        <span className={`text-[10px] font-bold py-0.5 px-2 rounded font-mono ${
                          fee.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                        }`}>
                          {fee.status === "paid" ? "HOÀN TẤT" : fee.status === "partial" ? "THANH TOÁN THIẾU" : "NỢ CÒN THU"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 text-xs text-white/70 gap-y-1.5">
                        <span>Hồ sơ định额 học kì:</span><span className="text-right text-white font-mono font-bold">{fee.amount.toLocaleString("vi-VN")} đ</span>
                        <span>Đã thu nhận:</span><span className="text-right text-emerald-400 font-mono">{fee.paidAmount.toLocaleString("vi-VN")} đ</span>
                        <span>Số nợ học phí đối soát:</span><span className="text-right text-red-400 font-mono font-bold">{(fee.amount - fee.paidAmount).toLocaleString("vi-VN")} đ</span>
                        <span>Đáo hạn nộp:</span><span className="text-right text-white/50 font-mono">{new Date(fee.dueDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  );
                })}

                {childFees.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-6 bg-black/10 rounded-xl">Chưa phát hiện phiếu thu học phí niên khóa.</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Premium glassmorphic Course Details consultation modal */}
      {courseDetailId && (() => {
        const course = store.courses.find(c => c.id === courseDetailId);
        if (!course) return null;
        const teacher = store.users.find(u => u.id === course.teacherId) || { name: "Chưa phân công" };
        const lessons = store.lessons.filter(l => l.courseId === course.id).sort((a,b) => a.order - b.order);
        const quizzes = store.quizzes.filter(q => q.courseId === course.id);
        const assignments = store.assignments.filter(a => a.courseId === course.id);
        const formatVND = (num: number) => {
          return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
        };
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-6 md:pt-10 overflow-y-auto">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative my-8 animate-in zoom-in-95 duration-150 text-white font-sans max-h-[85vh] overflow-y-auto flex flex-col justify-between">
              <div className="space-y-5">
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
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 cursor-pointer font-sans"
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
                      {lessons.map((lesson, idx) => (
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
        );
      })()}
    </div>
  );
}
