import React, { useState } from "react";
import {
  UserPlus,
  Search,
  Key,
  Info,
  CheckCircle,
  Compass,
  ShieldAlert,
  Bell,
  User,
  Lock,
  Phone,
  Mail,
  RefreshCw,
  BookOpen,
  Clock,
  Award,
  X
} from "lucide-react";
import { User as UserType, Course } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";
import { hashPassword } from "../authHash";
import { api } from "../api";
import { useApiStore } from "../hooks/apiHooks";

interface ReceptionPanelProps {
  currentUser: UserType;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function ReceptionPanel({ currentUser, onLogout, onRefreshData }: ReceptionPanelProps) {
  const { store, isLoading, isError } = useApiStore();

  // Tab states
  const [activeTab, setActiveTab] = useState<"search" | "register" | "courses">("search");

  // Student registration states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("studente16"); // default password per BRD or auto-generated

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Curriculum consultation modal state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs text-indigo-300 font-mono tracking-widest uppercase">Đang tải dữ liệu tiếp tân...</span>
      </div>
    );
  }

  if (isError || !store) {
    return <div className="text-red-500 p-8 text-center font-sans">Không thể kết nối tải thông tin dữ liệu tiếp tân.</div>;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!regName.trim() || !cleanEmail) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    if (regPassword.length < 8) {
      showToast("Mật khẩu của học viên phải dài tối thiểu 8 ký tự.");
      return;
    }

    try {
      await api.createUser({
        email: cleanEmail,
        password: regPassword,
        name: regName.trim(),
        role: "student",
        phone: regPhone.trim() || undefined
      });

      showToast("Đã tạo tài khoản học viên thành công!");

      // Reset fields
      setRegName("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("studente16");
      onRefreshData();
      setActiveTab("search");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi đăng ký tài khoản học viên!");
    }
  };

  const handleResetPassword = async (studentId: string) => {
    try {
      const res = await api.resetPassword(studentId) as { message?: string };
      showToast(res.message || "Mật khẩu đã được đặt lại thành công về mặc định: studente16!");
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi đặt lại mật khẩu học viên!");
    }
  };

  // Search through all students
  const filteredStudents = store.users.filter(u => {
    if (u.role !== "student") return false;
    const cleanQuery = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(cleanQuery) ||
           u.email.toLowerCase().includes(cleanQuery) ||
           (u.phone && u.phone.includes(cleanQuery));
  });

  const selectedCourse = selectedCourseId ? store.courses.find(c => c.id === selectedCourseId) : null;
  const selectedLessons = selectedCourseId ? store.lessons.filter(l => l.courseId === selectedCourseId).sort((a, b) => a.order - b.order) : [];
  const selectedQuizzes = selectedCourseId ? store.quizzes.filter(q => q.courseId === selectedCourseId) : [];

  return (
    <div className="relative space-y-8 text-white/90">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2563eb] text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 uppercase">
            Phân hệ Tiếp tân & Tư vấn tuyển sinh
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Xin chào, {currentUser.name} 🛎️</h2>
          <p className="text-sm text-white/60">Tạo tài khoản học viên offline, tra cứu lộ trình học, hỗ trợ đặt lại mật khẩu lớp học.</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/10 bg-white/5 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeTab === "search" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            <Search className="h-4 w-4" /> Tra cứu học viên
          </div>
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeTab === "register" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            <UserPlus className="h-4 w-4" /> Đăng ký tài khoản học viên
          </div>
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeTab === "courses" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            <Compass className="h-4 w-4" /> Chương trình khóa học tư vấn
          </div>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        {/* Tab 1: Tra cứu học viên */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h4 className="text-base font-display font-semibold text-white">Tra cứu Hồ sơ Học viên</h4>
                <p className="text-xs text-white/50">Tìm kiếm nhanh thông tin trạng thái, lộ trình học và hỗ trợ đặt lại mật khẩu nhanh chóng.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Nhập tên, email hoặc số điện thoại..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs bg-black/25 text-white placeholder-white/40 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 w-72"
                />
              </div>
            </div>

            {/* Students list */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/50 uppercase font-mono tracking-wider font-bold">
                    <th className="p-4">Học viên</th>
                    <th className="p-4">Số điện thoại</th>
                    <th className="p-4">Ngày đăng ký</th>
                    <th className="p-4">Khóa học đang học</th>
                    <th className="p-4">Trạng thái hệ thống</th>
                    <th className="p-4 text-right">Hỗ trợ khẩn cấp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map(student => {
                    const studentEnrollments = store.enrollments.filter(e => e.studentId === student.id);

                    return (
                      <tr key={student.id} className="hover:bg-white/5 transition duration-150">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold font-mono text-indigo-400">
                              {student.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white">{student.name}</div>
                              <div className="text-[10px] text-white/40 font-mono">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-white/60">
                          {student.phone || <span className="text-white/20 italic">Chưa cập nhật</span>}
                        </td>
                        <td className="p-4 text-white/40 font-mono">
                          {new Date(student.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="p-4">
                          {studentEnrollments.length > 0 ? (
                            <div className="space-y-1">
                              {studentEnrollments.map(e => {
                                const course = store.courses.find(c => c.id === e.courseId);
                                return (
                                  <span key={e.id} className="inline-block mr-1 my-0.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[9px]">
                                    {course?.title || "Khóa học"}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/30 italic">Chưa đăng ký khóa nào</span>
                          )}
                        </td>
                        <td className="p-4">
                          {student.isActive ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-[9px] uppercase tracking-wider font-mono">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-bold text-[9px] uppercase tracking-wider font-mono">
                              Ngưng kích hoạt
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleResetPassword(student.id)}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-semibold rounded-lg text-[10px] uppercase border border-amber-500/20 transition cursor-pointer"
                          >
                            Reset Mật khẩu
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-white/45">
                        Không tìm thấy học viên nào phù hợp với từ khóa tra cứu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Đăng ký học viên mới */}
        {activeTab === "register" && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-2 border-b border-white/5 pb-4">
              <h4 className="text-lg font-display font-bold text-white">Đăng ký tài khoản học viên mới</h4>
              <p className="text-xs text-white/55">Sử dụng form này để ghi nhận thông tin học viên nhập học trực tiếp tại quầy hoặc đăng ký qua điện thoại.</p>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">Họ và tên học viên <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lê Văn Sơn"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/25 h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">Địa chỉ Email liên hệ <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="Ví dụ: vanson@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/25 h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987654321"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/25 h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">Mật khẩu ban đầu (Mặc định)</label>
                <input
                  type="text"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mật khẩu truy cập"
                  className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 h-10 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg tracking-wider"
              >
                Tạo tài khoản học viên (Kích hoạt ngay)
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Xem danh sách khóa học đang mở để tư vấn */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">Chương trình Danh mục Khóa đào tạo</h4>
              <p className="text-xs text-white/50">Cung cấp các thông tin thiết yếu bao gồm: giảng viên, học bổng học phí để trả lời khách hàng/học viên khi tư vấn.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {store.courses.filter(c => c.status === "published").map(course => {
                const enrollmentCount = store.enrollments.filter(e => e.courseId === course.id).length;
                const teacherObj = store.users.find(u => u.id === course.teacherId);
                const formatFee = (p?: number) => p ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p) : "Miễn phí";

                return (
                  <div key={course.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition duration-300">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-indigo-300">
                          {course.category}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                          {formatFee(course.price)}
                        </span>
                      </div>

                      <h5 className="font-display font-bold text-white text-sm line-clamp-1">{course.title}</h5>
                      <p className="text-xs text-white/60 line-clamp-3 leading-relaxed font-sans">{course.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 gap-2">
                      <div className="flex flex-col">
                        <span>GV: <strong className="text-white/85">{teacherObj?.name || "Giảng viên E16"}</strong></span>
                        <span>Sĩ số: <strong className="text-indigo-300">{enrollmentCount} học viên</strong></span>
                      </div>
                      <button
                        onClick={() => setSelectedCourseId(course.id)}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-transparent rounded-lg font-semibold transition cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Curriculum detailed consultation modal */}
      {selectedCourseId && selectedCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-6 md:pt-10 overflow-y-auto">
          <div className="bg-slate-900 border border-white/15 w-full max-w-4xl rounded-3xl p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-150 text-white max-h-[90vh] overflow-y-auto font-sans flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {selectedCourse.category}
                  </span>
                  <h3 className="text-xl font-display font-bold text-white mt-2">{selectedCourse.title}</h3>
                  <p className="text-xs text-indigo-400 mt-1">Giảng viên phụ trách: {store.users.find(u => u.id === selectedCourse.teacherId)?.name || "Giảng viên E16"}</p>
                </div>
                <button
                  onClick={() => setSelectedCourseId(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded-lg border border-white/10 cursor-pointer transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    Nội dung chương trình đào tạo ({selectedLessons.length} bài học)
                  </h4>

                  {selectedLessons.length > 0 ? (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                      {selectedLessons.map((lesson, idx) => (
                        <div key={lesson.id} className="p-4 bg-white/5 border border-white/5 hover:border-indigo-500/25 rounded-2xl transition duration-150">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-mono font-bold text-indigo-300">Bài {idx + 1}</span>
                            <span className="text-[10px] font-mono text-white/40 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {lesson.duration}
                            </span>
                          </div>
                          <h5 className="font-semibold text-xs text-white mt-1">{lesson.title}</h5>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{lesson.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-white/5 rounded-2xl text-white/40 text-xs italic">
                      Chưa cập nhật nội dung bài học cho khóa học này.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-400" />
                    Bài kiểm tra & đánh giá ({selectedQuizzes.length})
                  </h4>

                  {selectedQuizzes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedQuizzes.map(quiz => {
                        const questionCount = store.questions.filter(q => q.quizId === quiz.id).length;
                        return (
                          <div key={quiz.id} className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <h5 className="font-semibold text-xs text-emerald-400">{quiz.title}</h5>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono text-white/60">
                              <div>Thời gian: <strong>{quiz.timeLimit} phút</strong></div>
                              <div>Đạt tối thiểu: <strong>{quiz.passingScore}%</strong></div>
                              <div>Lượt thi tối đa: <strong>{quiz.maxAttempts} lần</strong></div>
                              <div>Số câu hỏi: <strong>{questionCount} câu</strong></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-emerald-500/5 rounded-2xl text-emerald-400/40 text-xs italic">
                      Không có bài kiểm tra trắc nghiệm cho khóa học này.
                    </div>
                  )}

                  <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-2 mt-4">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 block font-bold">Mô tả chương trình</span>
                    <p className="text-[11px] text-white/70 leading-relaxed font-sans">{selectedCourse.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
              <button
                onClick={() => setSelectedCourseId(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Đóng tư vấn chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Constraints note */}
      <div className="bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-2xl p-4 flex gap-3 text-xs">
        <ShieldAlert className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 font-sans">
          <span className="font-bold text-white block">Quyền hạn an toàn của Lễ Tân</span>
          <p className="text-white/60 leading-relaxed">
            Phân vai Lễ Tân chỉ bao gồm các nghiệp vụ tiếp nhận thông tin khách hàng, tư vấn danh viện tuyển sinh offline, đăng ký thông tin người dùng mới (Student) và reset mật khẩu khẩn cấp. Mọi hành động ghi dữ liệu của bạn đều ghi nhật ký (activities logger) trực tiếp để Ban Giám Đốc giám sát chất lượng vận hành. Bạn không có quyền can thiệp vào điểm số học tập, cấu hình thanh toán hoặc tài chính trực thu.
          </p>
        </div>
      </div>
    </div>
  );
}
