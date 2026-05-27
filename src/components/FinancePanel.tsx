import React, { useState } from "react";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Download, 
  Search, 
  ArrowUpRight, 
  FileText,
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { User, Transaction, Course } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";
import { useApiStore } from "../hooks/apiHooks";
import TuitionManager from "./TuitionManager";

interface FinancePanelProps {
  currentUser: User;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function FinancePanel({ currentUser, onLogout, onRefreshData }: FinancePanelProps) {
  const { store, isLoading, isError } = useApiStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transactions" | "salaries" | "tuition">("transactions");

  // Dynamic salary computation for teachers
  const teachers = store ? store.users.filter(u => u.role === "teacher") : [];
  const teacherSalaries = teachers.map(t => {
    const tCourses = store.courses.filter(c => c.teacherId === t.id);
    const totalBase = tCourses.length * 3000000; // 3M VND per course base
    let totalCommission = 0;
    let totalStudents = 0;
    const totalValue = tCourses.reduce((sum, c) => sum + (c.price || 0), 0);

    tCourses.forEach(c => {
      const studentsCount = store.enrollments.filter(e => e.courseId === c.id && e.status === "active").length;
      totalStudents += studentsCount;
      totalCommission += (c.price || 0) * studentsCount * 0.15; // 15% commission
    });

    return {
      teacher: t,
      coursesCount: tCourses.length,
      totalStudents,
      totalValue,
      baseSalary: totalBase,
      commission: totalCommission,
      totalSalary: totalBase + totalCommission
    };
  });



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = (tx: Transaction) => {
    const freshStore = AppStore.get();
    const targetTx = freshStore.transactions.find(t => t.id === tx.id);
    if (!targetTx) return;

    if (targetTx.status !== "pending") {
      showToast("Giao dịch này đã được xử lý từ trước.");
      return;
    }

    // 1. Update Transaction status
    targetTx.status = "approved";
    targetTx.processedAt = new Date().toISOString();
    targetTx.processedBy = currentUser.id;
    targetTx.notes = "Đã khớp sao kê tài khoản ngân hàng và kích hoạt học viên.";

    // 2. Either find existing enrollment or create a new active one
    let enrollment = freshStore.enrollments.find(e => e.studentId === tx.studentId && e.courseId === tx.courseId);
    if (enrollment) {
      enrollment.status = "active";
    } else {
      enrollment = {
        id: generateId("enroll"),
        studentId: tx.studentId,
        courseId: tx.courseId,
        status: "active",
        enrolledAt: new Date().toISOString()
      };
      freshStore.enrollments.push(enrollment);
    }

    AppStore.save(freshStore);
    AppStore.log(currentUser.id, "approve_payment", tx.id, `Phê duyệt học phí khóa học: ${tx.courseId} cho học viên: ${tx.studentId}`);
    AppStore.notify(tx.studentId, "success", `Học phí khóa học "${freshStore.courses.find(c => c.id === tx.courseId)?.title}" đã được duyệt. Hãy vào học ngay!`);
    
    showToast("Phê duyệt và kích hoạt quyền học thành công!");
    onRefreshData();
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxId) return;

    const freshStore = AppStore.get();
    const targetTx = freshStore.transactions.find(t => t.id === rejectingTxId);
    if (!targetTx) return;

    targetTx.status = "rejected";
    targetTx.processedAt = new Date().toISOString();
    targetTx.processedBy = currentUser.id;
    targetTx.notes = rejectionNotes.trim() || "Giao dịch không khớp sao kê hoặc bị huỷ bởi người chuyển.";

    // Update Enrollment to pending_payment or cancel if exists
    const enrollment = freshStore.enrollments.find(e => e.studentId === targetTx.studentId && e.courseId === targetTx.courseId);
    if (enrollment) {
      enrollment.status = "pending_payment";
    }

    AppStore.save(freshStore);
    AppStore.log(currentUser.id, "reject_payment", targetTx.id, `Từ chối học phí khóa học: ${targetTx.courseId}. Lý do: ${targetTx.notes}`);
    AppStore.notify(targetTx.studentId, "warning", `Yêu cầu thanh toán của bạn cho khóa học đã bị từ chối. Lý do: ${targetTx.notes}`);

    setRejectingTxId(null);
    setRejectionNotes("");
    showToast("Từ chối giao dịch thành công.");
    onRefreshData();
  };

  // Calculations for dashboard
  const approvedTxList = store.transactions.filter(t => t.status === "approved");
  const totalRevenue = approvedTxList.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = store.transactions.filter(t => t.status === "pending").length;
  
  // Courses with active revenue
  const courseIdsWithRevenue = new Set(approvedTxList.map(t => t.courseId));
  const coursesWithRevenueCount = courseIdsWithRevenue.size;

  // Filter Transactions
  const filteredTransactions = store.transactions.filter(t => {
    const student = store.users.find(u => u.id === t.studentId);
    const course = store.courses.find(c => c.id === t.courseId);
    
    const studentName = student?.name || "";
    const studentEmail = student?.email || "";
    const courseTitle = course?.title || "";

    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;

    const txDate = new Date(t.createdAt);
    const matchesStart = !startDate || txDate >= new Date(startDate + "T00:00:00");
    const matchesEnd = !endDate || txDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Export financial report to CSV
  const handleExportCSV = () => {
    let csvContent = "Mã giao dịch,Học viên,Email học viên,Số tiền (VND),Khóa học,Trạng thái,Phương thức,Ngày đăng ký,Ngày duyệt,Người duyệt,Ghi chú thực tế\n";
    filteredTransactions.forEach(t => {
      const student = store.users.find(u => u.id === t.studentId);
      const studentName = student?.name || "Không xác định";
      const studentEmail = student?.email || "Không xác định";
      const courseTitle = store.courses.find(c => c.id === t.courseId)?.title || "Không xác định";
      const approverName = store.users.find(u => u.id === t.processedBy)?.name || "Không xác định";
      
      let statusViet = "Chờ đối soát";
      if (t.status === "approved") statusViet = "Đã phê duyệt";
      if (t.status === "rejected") statusViet = "Bị từ chối";

      csvContent += `"${t.id}","${studentName}","${studentEmail}","${t.amount}","${courseTitle}","${statusViet}","${t.paymentMethod}","${t.createdAt}","${t.processedAt || ""}","${approverName}","${t.notes || ""}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bao_cao_tai_chinh_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống báo cáo CSV!");
  };

  // Format currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  return (
    <div className="space-y-8 text-white/90">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16a34a] text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">
            Phân hệ Kế toán tài chính
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Xin chào, {currentUser.name} 💰</h2>
          <p className="text-sm text-white/60">Đối soát chuyển khoản ngân hàng, kích hoạt khóa học và kết xuất báo cáo tài chính.</p>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Tổng doanh thu thực tế</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{formatVND(totalRevenue)}</span>
            <span className="text-[10px] text-white/30 font-mono">Đã khớp đối soát ngân hàng</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Chờ đối soát thanh toán</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{pendingCount} yêu cầu</span>
            <span className="text-[10px] text-white/30 font-mono">Cần phê duyệt quyền học</span>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Khóa học có doanh thu</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">{coursesWithRevenueCount} khóa học</span>
            <span className="text-[10px] text-white/30 font-mono">Có dữ liệu thanh toán thực</span>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Giao dịch đã phê duyệt</span>
            <span className="text-xl font-bold text-emerald-300 mt-1 block">{approvedTxList.length} giao dịch</span>
            <span className="text-[10px] text-white/30 font-mono">Đã kích hoạt khóa thành công</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-xl flex items-center justify-center">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tab Switching Segmented Control */}
      <div className="flex border-b border-white/10 pb-px mb-6 text-xs bg-white/3 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex-1 py-3 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "transactions"
              ? "bg-white/10 text-white border border-white/10 font-bold shadow-lg"
              : "text-white/50 hover:text-white"
          }`}
        >
          Đối soát & Giao dịch
        </button>
        <button
          onClick={() => setActiveTab("salaries")}
          className={`flex-1 py-3 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "salaries"
              ? "bg-white/10 text-white border border-white/10 font-bold shadow-lg"
              : "text-white/50 hover:text-white"
          }`}
        >
          Bảng lương Giảng viên
        </button>
        <button
          onClick={() => setActiveTab("tuition")}
          className={`flex-1 py-3 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "tuition"
              ? "bg-white/10 text-white border border-white/10 font-bold shadow-lg"
              : "text-white/50 hover:text-white"
          }`}
        >
          Quản lý Học phí & Công nợ
        </button>
      </div>

      {activeTab === "transactions" && (
        <>
          {/* Main workspace workspace */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h4 className="text-base font-display font-semibold text-white">Đối soát Thanh toán & Sổ thu chi</h4>
                <p className="text-xs text-white/50">Phêu duyệt chuyển khoản của học viên để kích hoạt quyền tham gia khóa học tức thời.</p>
              </div>

              {/* Sổ thu chi Filters and Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Tìm mã, học viên, khóa học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 text-xs bg-black/25 text-white placeholder-white/40 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 w-56"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="p-2 py-1.5 text-xs bg-slate-900 border border-white/10 text-white/80 rounded-xl focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ đối soát</option>
                  <option value="approved">Đã phê duyệt</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
            </div>

            {/* Date Range & CSV Export */}
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-white/40 font-mono uppercase tracking-wider block font-bold">Lọc ngày thu chi:</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-white/40" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-1.5 bg-black/30 border border-white/10 rounded-lg focus:outline-none text-white font-mono text-xs cursor-pointer"
                  />
                  <span className="text-white/40">đến</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-1.5 bg-black/30 border border-white/10 rounded-lg focus:outline-none text-white font-mono text-xs cursor-pointer"
                  />
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                      className="p-1 px-2 hover:bg-white/10 text-white/50 hover:text-white rounded-lg cursor-pointer"
                    >
                      Xoá lọc ngày
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition text-white shadow shadow-emerald-700/50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Xuất báo cáo tài chính (CSV)
              </button>
            </div>

            {/* Transactions list */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/50 uppercase font-mono tracking-wider font-bold">
                    <th className="p-4">Mã giao dịch</th>
                    <th className="p-4">Học viên</th>
                    <th className="p-4">Khóa học</th>
                    <th className="p-4">Học phí (VND)</th>
                    <th className="p-4">Phương thức</th>
                    <th className="p-4">Thời gian</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map(tx => {
                    const studentUser = store.users.find(u => u.id === tx.studentId);
                    const courseObj = store.courses.find(c => c.id === tx.courseId);

                    return (
                      <tr key={tx.id} className="hover:bg-white/5 transition duration-150">
                        <td className="p-4 font-mono font-bold text-white/75">{tx.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-white">{studentUser?.name || "Không xác định"}</div>
                          <div className="text-[10px] text-white/40 font-mono">{studentUser?.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white/80 max-w-xs truncate">{courseObj?.title || "Không xác định"}</div>
                          <div className="text-[10px] text-white/40 font-mono uppercase">{courseObj?.category}</div>
                        </td>
                        <td className="p-4 font-semibold text-emerald-400 font-mono text-sm">
                          {formatVND(tx.amount)}
                        </td>
                        <td className="p-4 text-white/60">{tx.paymentMethod}</td>
                        <td className="p-4 text-white/40 font-mono">{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                        <td className="p-4">
                          {tx.status === "pending" && (
                            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold text-[9px] uppercase tracking-wider font-mono">
                              Chờ đối soát
                            </span>
                          )}
                          {tx.status === "approved" && (
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-[9px] uppercase tracking-wider font-mono">
                              Đã Duyệt
                            </span>
                          )}
                          {tx.status === "rejected" && (
                            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-bold text-[9px] uppercase tracking-wider font-mono">
                              Bị Từ Chối
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {tx.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApprove(tx)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] uppercase transition cursor-pointer shadow"
                              >
                                Phê duyệt
                              </button>
                              <button
                                onClick={() => setRejectingTxId(tx.id)}
                                className="px-2.5 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-lg text-[10px] uppercase border border-red-500/20 transition cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-white/30 font-mono italic max-w-[170px] ml-auto">
                              Đã xử lý bởi {store.users.find(u => u.id === tx.processedBy)?.name} lúc {tx.processedAt && new Date(tx.processedAt).toLocaleDateString("vi-VN")}
                              {tx.notes && <span className="block text-[9px] truncate" title={tx.notes}>({tx.notes})</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-white/45">
                        Không tìm thấy dữ liệu thu chi giao dịch khớp điều kiện lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rejecting Transaction Modal dialog box */}
          {rejectingTxId && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h4 className="text-sm font-bold text-red-400 font-display">Từ chối giao dịch học phí</h4>
                  <button 
                    onClick={() => { setRejectingTxId(null); setRejectionNotes(""); }} 
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <XCircle className="h-4 w-4 text-white/50" />
                  </button>
                </div>

                <form onSubmit={handleRejectSubmit} className="space-y-4">
                  <div className="space-y-1 text-xs">
                    <label className="text-white/70 block">Lý do từ chối (Gửi thông báo học viên)</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ví dụ: Số tiền chuyển khoản chưa đủ, hoặc nội dung chuyển khoản sai cú pháp..."
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      className="w-full p-2.5 bg-black/25 border border-white/10 text-white rounded-xl focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => { setRejectingTxId(null); setRejectionNotes(""); }}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl"
                    >
                      Huỷ bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow"
                    >
                      Xác nhận Từ chối
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "salaries" && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h4 className="text-base font-display font-semibold text-white">Bảng tính lương Giảng viên</h4>
            <p className="text-xs text-white/50">Lương tự động dựa trên số khóa học phụ trách (3.000.000 VND/khóa) và hoa hồng tuyển sinh (15% học phí của khóa).</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/50 uppercase font-mono tracking-wider font-bold">
                  <th className="p-4">Giảng viên</th>
                  <th className="p-4 text-center">Số khóa học</th>
                  <th className="p-4 text-center">Tổng học viên</th>
                  <th className="p-4 text-right">Lương cơ bản</th>
                  <th className="p-4 text-right">Hoa hồng tuyển sinh</th>
                  <th className="p-4 text-right text-emerald-400">Tổng Thực Nhận</th>
                  <th className="p-4 text-right">Hành động chi trả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teacherSalaries.map(ts => (
                  <tr key={ts.teacher.id} className="hover:bg-white/5 transition">
                    <td className="p-4 font-bold text-white">
                      <div>{ts.teacher.name}</div>
                      <div className="text-[10px] text-white/40 font-mono">{ts.teacher.email}</div>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-sky-300">{ts.coursesCount} khóa</td>
                    <td className="p-4 text-center font-mono text-white/60">{ts.totalStudents} học viên active</td>
                    <td className="p-4 text-right font-mono text-white/70">{formatVND(ts.baseSalary)}</td>
                    <td className="p-4 text-right font-mono text-white/70">{formatVND(ts.commission)}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">{formatVND(ts.totalSalary)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => showToast(`✅ Thanh toán thành công ${formatVND(ts.totalSalary)} cho giảng viên ${ts.teacher.name}!`)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] uppercase transition cursor-pointer shadow"
                      >
                        Thanh toán
                      </button>
                    </td>
                  </tr>
                ))}
                {teacherSalaries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-white/40">
                      Chưa ghi nhận thông tin giảng viên nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tuition" && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h4 className="text-base font-display font-semibold text-white">Quản lý Học phí, Công nợ & Thu hồi công nợ</h4>
            <p className="text-xs text-white/50">Lập học phí đồng loạt cho học kỳ, rà soát nợ xấu quá hạn và ghi thu trực tiếp.</p>
          </div>
          <TuitionManager
            store={store}
            currentUser={currentUser}
            onRefreshData={onRefreshData}
            triggerToast={showToast}
          />
        </div>
      )}

      {/* Business constraints guidance */}
      <div className="bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-2xl p-4 flex gap-3 text-xs">
        <AlertCircle className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 font-sans">
          <span className="font-bold text-white block">Quy tắc nghiệp vụ Kế toán</span>
          <p className="text-white/60 leading-relaxed">
            Mọi thao tác phê duyệt sẽ kích hoạt ngay quyền học tương ứng của học viên. Hệ thống ghi nhật ký hành động (audit log) vào bộ lưu trữ vĩnh viễn và gửi thông báo hệ thống tức thời đến học viên. Sổ thu chi chi tiết sẽ lưu dấu người phê duyệt của từng giao dịch để quản trị viên có thể đối soát chéo bất kỳ lúc nào.
          </p>
        </div>
      </div>
    </div>
  );
}
