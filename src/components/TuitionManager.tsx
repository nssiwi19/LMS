import React, { useState } from "react";
import { 
  DollarSign, 
  BookOpen, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Tag, 
  Clock, 
  CheckCircle,
  PiggyBank
} from "lucide-react";
import { LMSDataStore, TuitionFee, User, AcademicWarning } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";

interface TuitionManagerProps {
  store: LMSDataStore;
  currentUser: User;
  onRefreshData: () => void;
  triggerToast: (msg: string) => void;
}

export default function TuitionManager({ store, currentUser, onRefreshData, triggerToast }: TuitionManagerProps) {
  const [selectedSemesterId, setSelectedSemesterId] = useState("sem_spring25");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Record payment fields
  const [activePaymentFeeId, setActivePaymentFeeId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState("");

  const students = store.studentProfiles || [];
  const systemSemesters = store.semesters || [];
  const activeSemester = systemSemesters.find(s => s.id === selectedSemesterId);
  const tuitionRows = store.tuitionFees || [];

  // Computed data based on filters
  const formattedFees = tuitionRows.map(fee => {
    const pProfile = students.find(s => s.userId === fee.studentId);
    const usr = store.users.find(u => u.id === fee.studentId) || { name: "Người học" };
    return {
      ...fee,
      studentName: usr.name,
      studentCode: pProfile ? pProfile.studentCode : "SV-UNLINKED",
      isOverdue: new Date(fee.dueDate) < new Date() && fee.status !== "paid"
    };
  }).filter(fee => {
    const matchesSemester = fee.semesterId === selectedSemesterId;
    const matchesStatus = filterStatus === "all" || fee.status === filterStatus;
    const matchesOverdue = !filterOverdueOnly || fee.isOverdue;
    const matchesSearch = !searchQuery.trim() || 
      fee.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSemester && matchesStatus && matchesOverdue && matchesSearch;
  });

  // Calculate Aggregates for current semester
  const semesterFees = tuitionRows.filter(f => f.semesterId === selectedSemesterId);
  const totalBilled = semesterFees.reduce((sum, f) => sum + f.amount, 0);
  const totalCollected = semesterFees.reduce((sum, f) => sum + f.paidAmount, 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Bulk issue tuition fees
  const handleBulkIssueTuition = () => {
    if (!selectedSemesterId) {
      triggerToast("Vui lòng chọn học kỳ để áp dụng biểu phí.");
      return;
    }

    const storeData = AppStore.get();
    const activeProfiles = storeData.studentProfiles.filter(p => p.status === "active");
    if (activeProfiles.length === 0) {
      triggerToast("Không có sinh viên đang hoạt động trong niên học khóa để lập học phí.");
      return;
    }

    let createdCount = 0;
    activeProfiles.forEach(prof => {
      // Check duplicated fee
      const exists = storeData.tuitionFees.some(f => f.studentId === prof.userId && f.semesterId === selectedSemesterId);
      if (!exists) {
        const feeItem: TuitionFee = {
          id: generateId("tf"),
          studentId: prof.userId,
          semesterId: selectedSemesterId,
          amount: 15000000, // 15M standard tuition
          dueDate: "2025-03-31", // Spring deadline
          status: "unpaid",
          paidAmount: 0
        };
        storeData.tuitionFees.push(feeItem);
        
        // Notify student of new bill
        AppStore.notify(prof.userId, "info", `Thông báo nộp học phí: Đợt học phí Học kỳ ${selectedSemesterId === "sem_spring25" ? "Spring 2025" : selectedSemesterId} đã được xuất bản (Số tiền 15.000.000 VND).`);
        createdCount++;
      }
    });

    if (createdCount > 0) {
      AppStore.log(currentUser.id, "bulk_issue_tuition", selectedSemesterId, `Lập hóa đơn nợ học phí cho ${createdCount} sinh viên.`);
      AppStore.save(storeData);
      onRefreshData();
      triggerToast(`Đã đồng loạt thông báo nợ phí cho ${createdCount} sinh viên.`);
    } else {
      triggerToast("Học phí đã được xuất bản đầy đủ trước đó cho hệ sinh viên khóa này.");
    }
  };

  // Record direct payment transaction
  const handleOpenPaymentModal = (fee: any) => {
    setActivePaymentFeeId(fee.id);
    setPaymentAmount(fee.amount - fee.paidAmount); // default remaining amount
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentFeeId) return;
    if (paymentAmount < 0) {
      triggerToast("Số tiền thanh toán không được âm.");
      return;
    }

    const storeData = AppStore.get();
    const feeIndex = storeData.tuitionFees.findIndex(f => f.id === activePaymentFeeId);
    if (feeIndex === -1) return;

    const fee = storeData.tuitionFees[feeIndex];
    const totalNewPaid = fee.paidAmount + Number(paymentAmount);
    
    if (totalNewPaid > fee.amount) {
      triggerToast(`Vượt hạn mức! Số học phí nợ tối đa là ${(fee.amount - fee.paidAmount).toLocaleString()} VND.`);
      return;
    }

    fee.paidAmount = totalNewPaid;
    fee.paidAt = new Date().toISOString();
    fee.receiptCode = `RECEIPT-${Date.now().toString().slice(-6)}`;
    
    if (totalNewPaid >= fee.amount) {
      fee.status = "paid";
    } else {
      fee.status = "partial";
    }

    AppStore.log(currentUser.id, "record_payment", fee.studentId, `Thu học phí: nộp thêm ${paymentAmount.toLocaleString()} VND. Mã biên lai: ${fee.receiptCode}`);
    AppStore.notify(fee.studentId, "success", `Biên lai thu học phí: Hệ thống đã ghi nhận khoản nộp ${paymentAmount.toLocaleString()} VND từ cán bộ kế toán. Mã: ${fee.receiptCode}.`);
    
    // Auto sync warning resolution if paid off
    if (fee.status === "paid") {
      storeData.academicWarnings = storeData.academicWarnings.map(aw => {
        if (aw.studentId === fee.studentId && (aw.type === "unpaid_fee" || aw.type === "unpaid-fee")) {
          return { ...aw, isResolved: true, resolvedBy: currentUser.id, resolvedAt: new Date().toISOString() };
        }
        return aw;
      });
      storeData.studentProfiles = storeData.studentProfiles.map(p => {
        if (p.userId === fee.studentId) {
          return { ...p, feeHold: false };
        }
        return p;
      });
    }

    AppStore.save(storeData);
    setActivePaymentFeeId(null);
    onRefreshData();
    triggerToast("Ghi nhận bút toán thanh toán học vị thành công.");
  };

  // Scan overdue and apply warnings
  const handleScanOverdueWarnings = () => {
    const storeData = AppStore.get();
    let warnCount = 0;

    storeData.tuitionFees.forEach(fee => {
      const isOverdue = new Date(fee.dueDate) < new Date() && fee.status !== "paid";
      if (isOverdue) {
        // Issue unpaid_fee Warning if not exist
        const exists = storeData.academicWarnings.some(w => 
          w.studentId === fee.studentId && 
          (w.type === "unpaid_fee" || w.type === "unpaid-fee") && 
          !w.isResolved
        );

        if (!exists) {
          const warn: AcademicWarning = {
            id: generateId("warn"),
            studentId: fee.studentId,
            type: "unpaid_fee",
            message: `Hệ hỏa hạn nộp học phí học kỳ này quá thời hạn quy định (${fee.dueDate}). Vui lòng hoàn tất học phí để bảo lưu điều kiện thi cử cuối khóa.`,
            isResolved: false,
            createdAt: new Date().toISOString()
          };
          storeData.academicWarnings.push(warn);
          
          // Notify student
          AppStore.notify(fee.studentId, "danger", `Cảnh báo học phí trễ hạn: Đã quá hạn đu chỉ định đóng học phí đợt này. Yêu cầu nộp gấp để không ảnh hưởng học tập.`);
          warnCount++;
        }
      }
    });

    if (warnCount > 0) {
      AppStore.save(storeData);
      onRefreshData();
      triggerToast(`Đã rà soát và gửi cảnh báo nợ xấu quá hạn cho ${warnCount} sinh viên.`);
    } else {
      triggerToast("Không phát hiện thêm trường hợp trễ đóng học phí quá số mốc quy định.");
    }
  };

  const currentPaymentRow = tuitionRows.find(f => f.id === activePaymentFeeId);
  const currentPaymentStudent = currentPaymentRow ? store.users.find(u => u.id === currentPaymentRow.studentId) : null;

  return (
    <div className="space-y-6">
      
      {/* Visual collected statistics dashboard SVGs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric panels cards */}
        <div className="md:col-span-1 bg-white/4 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-white/50 uppercase tracking-widest font-black flex items-center gap-1">
              <PiggyBank className="h-4 w-4 text-emerald-400" /> Tỷ lệ thu học đợt này
            </div>
            <h3 className="text-3xl font-display font-black text-white mt-1.5">{collectionRate}%</h3>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${collectionRate}%` }}></div>
          </div>
        </div>

        <div className="md:col-span-1 bg-white/4 border border-white/5 p-4 rounded-2xl">
          <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-cyan-400" /> Tổng học phí phát hành
          </div>
          <h3 className="text-xl font-mono font-black text-white mt-1.5">{totalBilled.toLocaleString()} <span className="text-[10px] text-white/40">VND</span></h3>
          <p className="text-[9.5px] text-white/40 mt-1">Dựa trên niên học kỳ đang lọc</p>
        </div>

        <div className="md:col-span-1 bg-white/4 border border-white/5 p-4 rounded-2xl">
          <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> Thực tế đã thu hồi
          </div>
          <h3 className="text-xl font-mono font-black text-emerald-400 mt-1.5">{totalCollected.toLocaleString()} <span className="text-[10px] text-emerald-400/40">VND</span></h3>
          <p className="text-[9.5px] text-emerald-400/60 mt-1">Giao dịch đã khớp sau biên sao</p>
        </div>

        {/* Visual responsive SVG collected bar graph */}
        <div className="md:col-span-1 bg-white/4 border border-white/10 p-3 rounded-2xl flex items-center justify-center">
          <div className="w-full text-center space-y-2">
            <div className="text-[10px] text-white/60 font-semibold tracking-wider uppercase">Thực tế Billed vs Collected</div>
            <svg viewBox="0 0 160 50" className="w-full h-8 overflow-visible">
              {/* Total Billed Bar */}
              <rect x="10" y="5" width="140" height="12" rx="3" fill="rgba(255,255,255,0.06)" />
              <rect x="10" y="5" width="140" height="12" rx="3" fill="#2563eb" className="transition-all duration-300" />
              <text x="13" y="14" fill="#ffffff" fontSize="7" fontWeight="bold">Billed</text>
              
              {/* Collected Progress Bar */}
              <rect x="10" y="25" width="140" height="12" rx="3" fill="rgba(255,255,255,0.06)" />
              <rect x="10" y="25" width={140 * (collectionRate/100)} height="12" rx="3" fill="#10b981" />
              <text x="13" y="34" fill="#ffffff" fontSize="7" fontWeight="bold">Collected ({collectionRate}%)</text>
            </svg>
          </div>
        </div>

      </div>

      {/* Main filter bars */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/3 border border-white/5 p-4 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-white/50 block">Tìm kiếm học sinh</span>
            <input
              type="text"
              placeholder="Nhập tên hoặc mã SV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 bg-black/25 text-white placeholder-white/30 border border-white/10 rounded-lg focus:outline-none w-44"
            />
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-white/50 block">Chọn Kỳ Học</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="px-2 py-1 bg-black/25 text-white/80 border border-white/10 rounded-lg focus:outline-none"
            >
              <option value="sem_spring25" className="bg-slate-900">Spring 2025</option>
              <option value="sem_fall24" className="bg-slate-900">Fall 2024</option>
            </select>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-white/50 block">Trạng Thái Thu</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 bg-black/25 text-white/80 border border-white/10 rounded-lg"
            >
              <option value="all" className="bg-slate-900">Mọi Trạng Thái</option>
              <option value="paid" className="bg-slate-900">Đã nộp đủ</option>
              <option value="unpaid" className="bg-slate-900">Cơ bản chưa đóng</option>
              <option value="partial" className="bg-slate-900">Đóng một phần</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 pt-3 select-none cursor-pointer">
            <input
              type="checkbox"
              id="overdue-only"
              checked={filterOverdueOnly}
              onChange={(e) => setFilterOverdueOnly(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="overdue-only" className="text-white/70">Môn nợ quá hạn nộp</label>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex gap-2">
          <button
            onClick={handleScanOverdueWarnings}
            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 border border-red-500/20 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer font-bold"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Quét nợ quá hạn
          </button>
          <button
            onClick={handleBulkIssueTuition}
            className="px-4 py-1.5 bg-white text-indigo-950 rounded-xl hover:bg-slate-100 transition cursor-pointer font-bold text-xs"
          >
            Phát nợ học phí hàng loạt
          </button>
        </div>
      </div>

      {/* Tuition Roster Records list */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-[10px] font-bold uppercase bg-white/2">
                <th className="py-2 px-3">Mã SV</th>
                <th className="py-2 px-3">Học sinh Sinh viên</th>
                <th className="py-2 px-3">Học Kỳ Billed</th>
                <th className="py-2 px-3 text-right">Tổng Định Phí</th>
                <th className="py-2 px-3 text-right text-emerald-400">Đã Trả</th>
                <th className="py-2 px-3 text-right">Hạn Định</th>
                <th className="py-2 px-3 text-center">Tình Trạng</th>
                <th className="py-2 px-4 text-right">Bút toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/95 text-xs font-medium">
              {formattedFees.map(fee => (
                <tr key={fee.id} className="hover:bg-white/3 transition">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">{fee.studentCode}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{fee.studentName}</div>
                  </td>
                  <td className="py-3 px-3 text-white/60 capitalize font-bold text-[11px]">
                    {fee.semesterId === "sem_spring25" ? "Spring 2025" : fee.semesterId}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">{fee.amount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">{fee.paidAmount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono text-white/50">{fee.dueDate}</td>
                  <td className="py-3 px-3 text-center">
                    {fee.status === "paid" && (
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded text-[9.5px] font-bold">Paid</span>
                    )}
                    {fee.status === "partial" && (
                      <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 px-2 py-0.5 rounded text-[9.5px] font-bold">Thanh toán một phần</span>
                    )}
                    {fee.status === "unpaid" && (
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${fee.isOverdue ? "bg-red-500/15 text-red-500 border-red-500/15 animate-pulse" : "bg-white/5 text-white/50 border-transparent"}`}>
                        {fee.isOverdue ? "Quá hạn nộp" : "Chưa đóng phí"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {fee.status !== "paid" ? (
                      <button
                        onClick={() => handleOpenPaymentModal(fee)}
                        className="px-2 py-1 bg-white text-indigo-950 font-black rounded-lg hover:bg-slate-50 transition cursor-pointer text-[10px]"
                      >
                        Ghi thu
                      </button>
                    ) : (
                      <span className="text-white/40 text-[10px] font-serif italic text-[11px]">Đã lập biên lai</span>
                    )}
                  </td>
                </tr>
              ))}
              {formattedFees.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/30 text-xs">Chưa ghi nhận chứng chỉ học phí phù hợp điều kiện lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT TRANSACTION DIALOG MODAL */}
      {activePaymentFeeId && currentPaymentRow && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActivePaymentFeeId(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3 uppercase tracking-wider">
              <DollarSign className="h-5 w-5 text-indigo-400" /> Bút toán thu ngân học trực tiếp
            </h3>

            <div className="space-y-4 text-xs pt-1">
              <div>
                <span className="text-white/40 block">Tài khoản nộp:</span>
                <span className="font-bold text-white text-sm">{currentPaymentStudent ? currentPaymentStudent.name : "..."}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-white/40 block">Tổng hóa đơn:</span>
                  <span className="font-bold text-white leading-loose font-mono">{currentPaymentRow.amount.toLocaleString()} VND</span>
                </div>
                <div>
                  <span className="text-white/40 block">Đã hoàn thành:</span>
                  <span className="font-bold text-emerald-400 leading-loose font-mono">{currentPaymentRow.paidAmount.toLocaleString()} VND</span>
                </div>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold text-slate-300 block">Số tiền đóng đợt này (VND):</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    max={currentPaymentRow.amount - currentPaymentRow.paidAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none font-mono font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setActivePaymentFeeId(null)}
                    className="px-4 py-2 bg-transparent text-white/50 hover:text-white transition cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Xác nhận biên lai
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
