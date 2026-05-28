import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Check, 
  X, 
  Activity, 
  Award, 
  SlidersHorizontal, 
  Download, 
  Info, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Database
} from "lucide-react";
import { LMSDataStore, AcademicWarning, User, StudentProfile } from "../types";
import { AppStore } from "../store";
import { api } from "../api";

interface WarningAndReportsProps {
  store: LMSDataStore;
  currentUser: User;
  onRefreshData: () => void;
  triggerToast: (msg: string) => void;
  onSelectStudentProfile: (userId: string) => void; // allow linking directly to Student Detail in student registry!
  defaultTab?: "warnings" | "reports";
}

export default function WarningAndReports({ 
  store, 
  currentUser, 
  onRefreshData, 
  triggerToast,
  onSelectStudentProfile,
  defaultTab = "warnings"
}: WarningAndReportsProps) {
  const [activeTab, setActiveTab] = useState<"warnings" | "reports">(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [filterWarningType, setFilterWarningType] = useState("all");

  // Create warning modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedWarningType, setSelectedWarningType] = useState<"low_gpa" | "low_attendance" | "unpaid_fee" | "exam_ban" | "overdue_assignment">("low_gpa");
  const [warningMessage, setWarningMessage] = useState("");

  const studentUsers = store.users.filter(u => u.role === "student");

  const handleCreateWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !warningMessage.trim()) {
      triggerToast("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    try {
      await api.createWarning({
        studentId: selectedStudentId,
        type: selectedWarningType,
        message: warningMessage.trim()
      });
      triggerToast("Đã gửi cảnh báo học tập thành công!");
      setIsCreateModalOpen(false);
      onRefreshData();
    } catch (err: any) {
      triggerToast(err.message || "Lỗi khi gửi cảnh báo học tập.");
    }
  };

  const warnings = store.academicWarnings || [];
  const students = store.studentProfiles || [];
  const users = store.users || [];
  const programs = store.programs || [];
  const enrollments = store.enrollments || [];
  const tuitionFees = store.tuitionFees || [];
  const courses = store.courses || [];
  const attendanceSessions = store.attendanceSessions || [];
  const attendanceRecords = store.attendanceRecords || [];

  // Compute Warnings list
  const formattedWarnings = warnings.map(w => {
    const studentProf = students.find(s => s.userId === w.studentId);
    const linkedUser = users.find(u => u.id === w.studentId);
    return {
      ...w,
      studentName: linkedUser ? linkedUser.name : "Không xác định",
      studentCode: studentProf ? studentProf.studentCode : "SV-UNLINKED"
    };
  }).filter(w => {
    const matchesType = filterWarningType === "all" || 
      w.type === filterWarningType ||
      (filterWarningType === "low_gpa" && w.type === "low-gpa") ||
      (filterWarningType === "low_attendance" && w.type === "attendance") ||
      (filterWarningType === "unpaid_fee" && w.type === "unpaid-fee") ||
      (filterWarningType === "overdue_assignment" && w.type === "overdue-assignment");
    return matchesType;
  });

  // Resolve warning
  const handleResolveWarning = async (id: string) => {
    try {
      await api.resolveWarning(id);
      await onRefreshData();
      triggerToast("Cảnh báo học tập đã được đánh dấu giải quyết khắc phục.");
    } catch (err: any) {
      triggerToast(err.message || "Lỗi khi giải quyết cảnh báo học tập.");
    }
  };

  // --- STATISTICS COMPUTATIONS FOR REPORTS ---

  // 1. Enrollment stats per program
  const programEnrollments = programs.map(p => {
    const studentCount = students.filter(st => st.programId === p.id && st.status === "active").length;
    return {
      name: p.name,
      code: p.code,
      count: studentCount
    };
  });

  // 2. GPA Distribution histogram data
  // Groups: <2.0 (Yếu/Kém), 2.0-2.5 (Trung bình), 2.5-3.0 (Khá), 3.0-3.5 (Tốt), 3.5-4.0 (Xuất sắc)
  const gpaBins = [
    { label: "< 2.0", count: 0, color: "#f87171" },
    { label: "2.0 – 2.5", count: 0, color: "#fbbf24" },
    { label: "2.5 – 3.0", count: 0, color: "#60a5fa" },
    { label: "3.0 – 3.5", count: 0, color: "#34d399" },
    { label: "3.5 – 4.0", count: 0, color: "#a78bfa" }
  ];

  students.forEach(st => {
    const val = st.gpa || 0;
    if (val < 2.0) gpaBins[0].count++;
    else if (val >= 2.0 && val < 2.5) gpaBins[1].count++;
    else if (val >= 2.5 && val < 3.0) gpaBins[2].count++;
    else if (val >= 3.0 && val < 3.5) gpaBins[3].count++;
    else if (val >= 3.5 && val <= 4.0) gpaBins[4].count++;
  });

  // Normalise bar height for chart rendering
  const maxBinCount = Math.max(...gpaBins.map(b => b.count), 1);

  // 3. Attendance compliance scan
  const nonComplianceAttendance: { studentId: string; name: string; courseName: string; percentage: number }[] = [];
  courses.forEach(c => {
    const courseSessions = attendanceSessions.filter(s => s.courseId === c.id);
    if (courseSessions.length === 0) return;

    const courseEnroll = enrollments.filter(e => e.courseId === c.id && e.status !== "cancelled");
    courseEnroll.forEach(enroll => {
      const records = attendanceRecords.filter(r => 
        r.studentId === enroll.studentId && 
        courseSessions.some(cs => cs.id === r.sessionId)
      );

      const presentCount = records.filter(r => r.status === "present" || r.status === "late" || r.status === "excused").length;
      const pct = Math.round((presentCount / courseSessions.length) * 100);
      if (pct < 80) {
        const studentUser = users.find(u => u.id === enroll.studentId);
        nonComplianceAttendance.push({
          studentId: enroll.studentId,
          name: studentUser ? studentUser.name : "Người học",
          courseName: c.title,
          percentage: pct
        });
      }
    });
  });

  // 4. Collection rate aggregate
  const uniqueSemesterIds = Array.from(new Set(tuitionFees.map(f => f.semesterId)));
  const semesterBills = uniqueSemesterIds.map(semId => {
    const semRows = tuitionFees.filter(f => f.semesterId === semId);
    const billed = semRows.reduce((a, b) => a + b.amount, 0);
    const collected = semRows.reduce((a, b) => a + b.paidAmount, 0);
    return {
      semesterId: semId,
      billed,
      collected,
      rate: billed > 0 ? Math.round((collected / billed) * 100) : 0
    };
  });

  // Export metadata as CSV
  const handleExportReportsCSV = () => {
    let csvContent = "\ufeff"; // BOM for excel
    csvContent += "Chỉ số,Chỉ báo thống kê,Giá trị định lượng\n";
    csvContent += `Tổng số tài khoản học sinh,${students.length},học viên sổ sách\n`;
    csvContent += `Lượng cảnh cáo học vụ đang treo,${warnings.filter(w => !w.isResolved).length},sinh viên báo động\n`;
    
    // Add gpa bins
    gpaBins.forEach(bin => {
      csvContent += `Phân lượng phổ điểm GPA [${bin.label}],${bin.count},sinh viên\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `bao_cao_tong_quan_sis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Đã xuất bản tệp CSV báo cáo tổng kiểm.");
  };

  return (
    <div className="relative space-y-6">
      {/* Create Warning Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto p-4 pt-6 md:pt-10 border border-white/10 backdrop-blur-xl animate-fade-in flex flex-col">
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Gửi Cảnh báo Học thuật Mới
                </h3>
                <p className="text-xs text-white/50 mt-1">Cảnh báo sẽ được lưu vào hệ thống và hiển thị trực tiếp trên trang chủ của học sinh và phụ huynh.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded-lg border border-white/10 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarningSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 block">Chọn Học sinh nhận cảnh báo <span className="text-red-400">*</span></label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 h-10"
                    required
                  >
                    <option value="" disabled className="bg-slate-900">-- Chọn học sinh --</option>
                    {studentUsers.map(st => (
                      <option key={st.id} value={st.id} className="bg-slate-900">
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 block">Loại Cảnh báo <span className="text-red-400">*</span></label>
                  <select
                    value={selectedWarningType}
                    onChange={(e) => setSelectedWarningType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 h-10"
                    required
                  >
                    <option value="low_gpa" className="bg-slate-900">GPA Thấp (Dưới 2.0)</option>
                    <option value="low_attendance" className="bg-slate-900">Nghỉ chuyên cần nhiều</option>
                    <option value="unpaid_fee" className="bg-slate-900">Trễ nợ học phí</option>
                    <option value="exam_ban" className="bg-slate-900">Đình chỉ thi học kỳ</option>
                    <option value="overdue_assignment" className="bg-slate-900">Trễ hạn nộp bài tập</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 block">Nội dung chi tiết cảnh báo và hướng dẫn xử lý <span className="text-red-400">*</span></label>
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="Ví dụ: GPA học kỳ hiện tại là 1.85, dưới mức tối thiểu 2.0. Vui lòng liên hệ Văn phòng Học vụ trước ngày 15/06 để đăng ký học cải thiện..."
                  className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/20 min-h-[120px] font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg tracking-wider"
                >
                  Gửi Cảnh báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Selector tab bars */}
      <div className="flex border-b border-white/10 pb-2 gap-4">
        <button
          onClick={() => setActiveTab("warnings")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "warnings" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <ShieldAlert className="inline-block h-3.5 w-3.5 mr-1.5 text-red-400" /> Bảng Cảnh báo Học tập
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "reports" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <Activity className="inline-block h-3.5 w-3.5 mr-1.5 text-cyan-400" /> Báo cáo & Phổ điểm GPA
        </button>
      </div>

      {activeTab === "warnings" && (
        <div className="space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/3 border border-white/5 p-4 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-white/40" />
              <select
                value={filterWarningType}
                onChange={(e) => setFilterWarningType(e.target.value)}
                className="px-2.5 py-1.5 bg-black/25 text-white/85 border border-white/10 rounded-xl"
              >
                <option value="all" className="bg-slate-900">Mọi Cảnh báo</option>
                <option value="low_gpa" className="bg-slate-900">GPA Thấp (Dưới 2.0)</option>
                <option value="low_attendance" className="bg-slate-900">Nghỉ chuyên cần nhiều</option>
                <option value="unpaid_fee" className="bg-slate-900">Trễ nợ học phí</option>
                <option value="overdue_assignment" className="bg-slate-900">Trễ deadline bài tập</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-[10.5px] text-white/40">Thống kê thấy {formattedWarnings.length} lệnh cảnh báo phù hợp.</span>
              <button
                onClick={() => {
                  if (studentUsers.length > 0) {
                    setSelectedStudentId(studentUsers[0].id);
                  }
                  setSelectedWarningType("low_gpa");
                  setWarningMessage("");
                  setIsCreateModalOpen(true);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition duration-150 cursor-pointer shadow shadow-red-700/50"
              >
                + Gửi cảnh báo mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formattedWarnings.map(w => (
              <div 
                key={w.id} 
                className={`p-4 border rounded-2xl relative overflow-hidden flex flex-col justify-between transition ${
                  w.isResolved 
                    ? "bg-emerald-500/5 hover:border-emerald-500/20 border-emerald-500/10 text-white/70" 
                    : "bg-red-500/5 hover:border-red-500/20 border-red-500/10 text-white"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span 
                      onClick={() => onSelectStudentProfile(w.studentId)}
                      className="font-mono font-bold text-cyan-400 hover:underline cursor-pointer text-xs"
                    >
                      {w.studentCode} -- {w.studentName}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                      {w.type === "low_gpa" || w.type === "low-gpa" ? "GPA kém" :
                       w.type === "low_attendance" || w.type === "attendance" ? "Chuyên cần vắng" :
                       w.type === "unpaid_fee" || w.type === "unpaid-fee" ? "Học phí trễ" : "Trễ deadline"}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed pt-1.5 text-white/80">{w.message}</p>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 mt-4 pt-3 text-xs">
                  <span className="text-[10px] text-white/40">{w.createdAt.slice(0, 10)}</span>
                  
                  {w.isResolved ? (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="h-4 w-4" /> Đã Khắc phục triệt để
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveWarning(w.id)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-indigo-950 font-bold rounded-lg transition text-[10.5px] cursor-pointer"
                    >
                      Khắc phục xử lý
                    </button>
                  )}
                </div>
              </div>
            ))}
            {formattedWarnings.length === 0 && (
              <div className="col-span-2 py-16 text-center text-white/30 text-xs">
                 Hiện hữu chưa có học sinh nào bị dán học cảnh báo phù hợp phân loại đang lập.
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Col 1: beautiful responsive SVG GPA distribution histogram */}
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1 pb-1">
              <Award className="h-4 w-4 text-amber-400" /> Biểu đồ phổ điểm GPA toàn trường (Histograms)
            </h4>

            {/* Custom responsive SVG Histogram */}
            <div className="py-2">
              <svg viewBox="0 0 350 160" className="w-full h-44 overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="40" y1="20" x2="330" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <line x1="40" y1="70" x2="330" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <line x1="40" y1="120" x2="330" y2="120" stroke="rgba(255,255,255,0.1)" />

                {gpaBins.map((bin, i) => {
                  const x = 50 + i * 55;
                  const ratio = bin.count / maxBinCount;
                  const barHeight = ratio * 100;
                  const y = 120 - barHeight;

                  return (
                    <g key={i}>
                      {/* Bar columns */}
                      <rect 
                        x={x} 
                        y={y} 
                        width="34" 
                        height={barHeight} 
                        fill={bin.color} 
                        rx="3" 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                      {/* Number tag top of columns */}
                      <text x={x + 17} y={y - 5} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {bin.count}
                      </text>
                      {/* Sub-labels bottom of axis */}
                      <text x={x + 17} y={134} fill="rgba(255,255,255,0.5)" fontSize="8.5" textAnchor="middle">
                        {bin.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <p className="text-[10px] text-white/40 leading-relaxed text-center">
              Khảo phổ điểm gieo tỉ phân phối (A, B, C, D, F) từ cơ sở lớp dữ liệu sinh viên trong trường học phần.
            </p>
          </div>

          {/* Col 2: Program Enrollments statistics list */}
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-cyan-400" /> Thống kê sinh số active theo hệ Ngành đào tạo
            </h4>

            <div className="divide-y divide-white/5 pt-1 text-xs text-white/90">
              {programEnrollments.map((prog, i) => (
                <div key={i} className="py-2.5 flex justify-between items-center leading-normal">
                  <div>
                    <span className="font-bold text-white font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 px-1.5 py-0.2 rounded text-[9px] mr-2">
                      {prog.code}
                    </span>
                    <span className="font-bold text-white font-sans text-xs">{prog.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-white">{prog.count} Học viên</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 3: Uncompliant attendance warning sheet summary */}
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-3 md:col-span-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-red-400" /> Báo cáo chuyên cần báo động đỏ (Dưới 80%)
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {nonComplianceAttendance.map((compliance, i) => (
                <div key={i} className="p-2.5 bg-red-500/5 rounded-xl border border-red-500/10 flex justify-between items-center text-[11px]">
                  <div>
                    <div className="font-bold text-red-400">{compliance.name}</div>
                    <div className="text-[10px] text-white/40">{compliance.courseName}</div>
                  </div>
                  <span className="font-mono font-bold text-red-400 animate-pulse">{compliance.percentage}%</span>
                </div>
              ))}
              {nonComplianceAttendance.length === 0 && (
                <div className="text-center py-8 text-white/30 text-[11px]">Tuyệt vời! Toàn bộ sinh viên đều đáp ứng chỉ số chuyên cần chuyên môn.</div>
              )}
            </div>
          </div>

          {/* Col 4: Semester Tuition Collection percentage ratios */}
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-3 md:col-span-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Info className="h-4 w-4 text-cyan-400" /> Hiệu suất và Thu hồi Học phí theo đợt Học Kỳ
            </h4>

            <div className="divide-y divide-white/5 text-xs text-white/90">
              {semesterBills.map((bill, i) => (
                <div key={i} className="py-2.5 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="capitalize">{bill.semesterId === "sem_spring25" ? "Spring 2025" : bill.semesterId}</span>
                    <span className="text-emerald-400 font-bold">{bill.rate}% nộp quỹ</span>
                  </div>
                  
                  <div className="flex justify-between text-[11px] text-white/45 font-mono">
                    <span>Tổng hóa đơn: {bill.billed.toLocaleString()} VND</span>
                    <span>Thực nộp: {bill.collected.toLocaleString()} VND</span>
                  </div>
                </div>
              ))}
              {semesterBills.length === 0 && (
                <div className="text-center py-8 text-white/30">Chưa sinh dữ liệu báo kỳ hóa đơn thanh toán nào.</div>
              )}
            </div>

            <button
              onClick={handleExportReportsCSV}
              className="w-full py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition font-bold text-xs cursor-pointer flex items-center justify-center gap-1 mt-4"
            >
              <Download className="h-4 w-4" /> Xuất Báo cáo CSV Tổng hợp
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
