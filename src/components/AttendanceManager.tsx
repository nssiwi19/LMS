import React, { useState } from "react";
import { 
  Users, 
  Calendar, 
  Plus, 
  Check, 
  X, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  BookOpen,
  PlusCircle,
  FolderSync
} from "lucide-react";
import { LMSDataStore, Course, User, AttendanceSession, AttendanceRecord, AcademicWarning } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";

interface AttendanceManagerProps {
  store: LMSDataStore;
  currentUser: User;
  onRefreshData: () => void;
  triggerToast: (msg: string) => void;
}

export default function AttendanceManager({ store, currentUser, onRefreshData, triggerToast }: AttendanceManagerProps) {
  // Course selection
  const [selectedCourseId, setSelectedCourseId] = useState("");
  // Session selection (or create new)
  const [activeSessionId, setActiveSessionId] = useState("");

  // New session creation fields
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionTopic, setNewSessionTopic] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("09:00 - 11:30");

  const courses = store.courses || [];
  const enrollments = store.enrollments || [];
  const systemSemesters = store.semesters || [];
  const activeSemester = systemSemesters.find(s => s.id === "sem_spring25") || systemSemesters[0]; // spring 25 default
  const curSemesterId = activeSemester ? activeSemester.id : "sem_spring25";

  // Sessions for chosen course
  const sessions = (store.attendanceSessions || []).filter(s => s.courseId === selectedCourseId);
  // Enrolled students in chosen course
  const courseEnrollments = enrollments.filter(e => e.courseId === selectedCourseId && e.status !== "cancelled");
  const courseStudents = courseEnrollments.map(enroll => {
    const usr = store.users.find(u => u.id === enroll.studentId) || { name: "Sinh viên", id: enroll.studentId };
    const pProfile = (store.studentProfiles || []).find(p => p.userId === enroll.studentId);
    return {
      userId: usr.id,
      name: usr.name,
      studentCode: pProfile ? pProfile.studentCode : "SV-UNLINK"
    };
  });

  // Load records for active session
  const activeRecords = (store.attendanceRecords || []).filter(r => r.sessionId === activeSessionId);

  // New Session submit
  const handleCreateSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      triggerToast("Vui lòng chọn môn học trước khi lập buổi điểm danh.");
      return;
    }
    if (!newSessionDate || !newSessionTopic.trim()) {
      triggerToast("Hãy nhập đầy đủ thông tin ngày tháng và chủ đề.");
      return;
    }

    const storeData = AppStore.get();
    const combinedDate = newSessionTime.trim() ? `${newSessionDate} (${newSessionTime.trim()})` : newSessionDate;
    const newSession: AttendanceSession = {
      id: generateId("ats"),
      courseId: selectedCourseId,
      semesterId: curSemesterId,
      teacherId: currentUser.id,
      date: combinedDate,
      topic: newSessionTopic.trim()
    };

    if (!storeData.attendanceSessions) storeData.attendanceSessions = [];
    storeData.attendanceSessions.push(newSession);

    // Auto initialize attendance record as "present" for all enrolled students
    if (!storeData.attendanceRecords) storeData.attendanceRecords = [];
    courseEnrollments.forEach(enroll => {
      const rec: AttendanceRecord = {
        id: generateId("atr"),
        sessionId: newSession.id,
        studentId: enroll.studentId,
        status: "present"
      };
      storeData.attendanceRecords.push(rec);
    });

    AppStore.log(currentUser.id, "create_attendance_session", selectedCourseId, `Khởi tạo buổi học ngày ${combinedDate}`);
    AppStore.save(storeData);
    
    setNewSessionDate("");
    setNewSessionTopic("");
    setNewSessionTime("09:00 - 11:30");
    setShowCreateSession(false);
    setActiveSessionId(newSession.id);
    onRefreshData();
    triggerToast("Đã khởi tạo buổi điểm danh môn học mới thành công.");
  };

  // Modify Record Status per student
  const handleMarkStatusChange = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    if (!activeSessionId) return;
    const storeData = AppStore.get();
    
    let recordIndex = storeData.attendanceRecords.findIndex(r => r.sessionId === activeSessionId && r.studentId === studentId);
    if (recordIndex !== -1) {
      storeData.attendanceRecords[recordIndex].status = status;
    } else {
      // Create if missing
      const newRec: AttendanceRecord = {
        id: generateId("atr"),
        sessionId: activeSessionId,
        studentId,
        status
      };
      storeData.attendanceRecords.push(newRec);
    }
    AppStore.save(storeData);
    onRefreshData();
  };

  // Auto Scan compliance & create warnings
  const handleScanAttendanceWarnings = () => {
    if (!selectedCourseId) {
      triggerToast("Chọn môn học để khảo sát cảnh báo.");
      return;
    }

    const sessionsCount = sessions.length;
    if (sessionsCount === 0) {
      triggerToast("Lớp học phần này chưa mở bất kỳ buổi điểm danh nào.");
      return;
    }

    const storeData = AppStore.get();
    let warningCount = 0;

    courseEnrollments.forEach(enroll => {
      const studentId = enroll.studentId;
      const records = storeData.attendanceRecords.filter(r => 
        r.studentId === studentId && 
        sessions.some(s => s.id === r.sessionId)
      );

      const presentRecords = records.filter(r => r.status === "present" || r.status === "late" || r.status === "excused").length;
      const rate = Math.round((presentRecords / sessionsCount) * 100);

      if (rate < 80) {
        // Issue Academic Warning if not exist
        const courseObj = courses.find(c => c.id === selectedCourseId);
        const nameText = courseObj ? courseObj.title : selectedCourseId;
        const exists = storeData.academicWarnings.some(w => 
          w.studentId === studentId && 
          w.type === "attendance" && 
          !w.isResolved &&
          w.message.includes(nameText)
        );

        if (!exists) {
          const warn: AcademicWarning = {
            id: generateId("warn"),
            studentId,
            type: "attendance",
            message: `Tỷ lệ tham gia giảng dạy môn: ${nameText} xuống thấp báo động dưới 80% (Thực đạt ${rate}% vắng ${sessionsCount - presentRecords} buổi).`,
            isResolved: false,
            createdAt: new Date().toISOString()
          };
          storeData.academicWarnings.push(warn);
          
          // Auto issue system notification to student
          AppStore.notify(studentId, "danger", `Cảnh báo chuyên cần: Bạn đã vắng học vượt quá giới hạn ở môn ${nameText} (${rate}%). Vui lòng liên hệ phòng đào tạo.`);
          warningCount++;
        }
      }
    });

    if (warningCount > 0) {
      AppStore.save(storeData);
      onRefreshData();
      triggerToast(`Đã rà soát và phát học cảnh báo đỏ cho ${warningCount} sinh viên nghỉ học quá hạn.`);
    } else {
      triggerToast("Mọi học sinh tại lớp học phần này đều đảm bảo chuyên cần (Tỷ lệ >= 80%).");
    }
  };

  // Pre-calculate presence rates for display in list
  const getStudentPresenceRate = (studentId: string) => {
    const sessionsCount = sessions.length;
    if (sessionsCount === 0) return 100;
    
    const records = (store.attendanceRecords || []).filter(r => 
      r.studentId === studentId && 
      sessions.some(s => s.id === r.sessionId)
    );
    const presentRecords = records.filter(r => r.status === "present" || r.status === "late" || r.status === "excused").length;
    return Math.round((presentRecords / sessionsCount) * 100);
  };

  return (
    <div className="space-y-6">
      
      {/* Course & Session selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/4 border border-white/5 p-4 rounded-2xl text-xs">
        <div className="space-y-1">
          <label className="text-white/60 font-bold block">1. Lựa chọn môn học / lớp học phần:</label>
          <select
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setActiveSessionId(""); }}
            className="w-full p-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
          >
            <option value="">-- Click chọn lớp môn học --</option>
            {courses.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.title} ({c.category})</option>
            ))}
          </select>
        </div>

        {selectedCourseId && (
          <div className="space-y-1">
            <label className="text-white/60 font-bold block">2. Chọn đợt buổi học:</label>
            <div className="flex gap-2">
              <select
                value={activeSessionId}
                onChange={(e) => setActiveSessionId(e.target.value)}
                className="flex-1 p-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
              >
                <option value="">-- Mở bảng học kỳ --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900">{s.date} -- Đề mục: {s.topic}</option>
                ))}
              </select>
              <button
                onClick={() => setShowCreateSession(true)}
                className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Bắt đầu buổi học mới
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Area layout split */}
      {selectedCourseId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Middle Span: Attendance taking Grid */}
          <div className="lg:col-span-2 space-y-4">
            {activeSessionId ? (
              <div className="space-y-4">
                {(() => {
                  const activeSession = sessions.find(s => s.id === activeSessionId);
                  return (
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Chốt danh sách điểm danh: <span className="text-indigo-400 font-mono font-semibold">{activeSession?.date}</span>
                        </h4>
                        <p className="text-xs text-white/40">
                          Chủ đề buổi học: <span className="text-cyan-400 font-semibold">{activeSession?.topic}</span>
                        </p>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-mono font-bold">
                        ID: {activeSessionId.slice(0, 8)}
                      </span>
                    </div>
                  );
                })()}

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10.5px] uppercase text-white/50 bg-white/2">
                          <th className="py-2.5 px-3">Mã SV</th>
                          <th className="py-2.5 px-3">Tên Sinh Viên</th>
                          <th className="py-2.5 px-3 text-center">Đúng giờ (Có mặt)</th>
                          <th className="py-2.5 px-3 text-center text-yellow-400">Đi Muộn</th>
                          <th className="py-2.5 px-3 text-center text-orange-400">Có Phép</th>
                          <th className="py-2.5 px-3 text-center text-red-400">Vắng mặt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/90">
                        {courseStudents.map(st => {
                          const record = activeRecords.find(r => r.studentId === st.userId);
                          const activeStatus = record ? record.status : "present";
                          return (
                            <tr key={st.userId} className="hover:bg-white/2 transition">
                              <td className="py-3 px-3 font-mono font-bold text-cyan-400">{st.studentCode}</td>
                              <td className="py-3 px-3 font-semibold text-white">{st.name}</td>
                              
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="radio"
                                  name={`status-${st.userId}`}
                                  checked={activeStatus === "present"}
                                  onChange={() => handleMarkStatusChange(st.userId, "present")}
                                  className="h-4 w-4 bg-black/30 border-white/10 text-emerald-500 cursor-pointer focus:ring-opacity-0 focus:ring-0"
                                />
                              </td>

                              <td className="py-3 px-3 text-center">
                                <input
                                  type="radio"
                                  name={`status-${st.userId}`}
                                  checked={activeStatus === "late"}
                                  onChange={() => handleMarkStatusChange(st.userId, "late")}
                                  className="h-4 w-4 bg-black/30 border-white/10 text-yellow-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-3 px-3 text-center">
                                <input
                                  type="radio"
                                  name={`status-${st.userId}`}
                                  checked={activeStatus === "excused"}
                                  onChange={() => handleMarkStatusChange(st.userId, "excused")}
                                  className="h-4 w-4 bg-black/30 border-white/10 text-cyan-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-3 px-3 text-center">
                                <input
                                  type="radio"
                                  name={`status-${st.userId}`}
                                  checked={activeStatus === "absent"}
                                  onChange={() => handleMarkStatusChange(st.userId, "absent")}
                                  className="h-4 w-4 bg-black/30 border-white/10 text-red-500 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl text-white/30 space-y-2">
                <Calendar className="h-10 w-10 mx-auto text-indigo-400/30" />
                <p className="text-xs">Chưa có thông tin đợt buổi để truy vết. Vui lòng bấm dứt điểm một buổi lưu trữ hoặc khởi tạo buổi mới.</p>
              </div>
            )}
          </div>

          {/* Right Column: Attendance Statistics & alarms triggers */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 h-fit">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Activity className="h-4 w-4 text-emerald-400" /> Thống kê lớp học phần
              </h4>
              <span className="font-mono text-[10px] text-white/40">{sessions.length} buổi tổng</span>
            </div>

            <div className="space-y-3">
              {courseStudents.map(st => {
                const percentage = getStudentPresenceRate(st.userId);
                return (
                  <div key={st.userId} className="text-xs space-y-1.5 p-2 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex justify-between leading-tight">
                      <span className="font-bold text-white max-w-[70%] truncate">{st.name}</span>
                      <span className={`font-mono font-bold ${percentage >= 80 ? "text-emerald-400" : "text-red-400 animation-pulse"}`}>
                        {percentage}%
                      </span>
                    </div>
                    {/* Visual Progress bar indicators */}
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${percentage >= 80 ? "bg-emerald-500" : "bg-red-400"}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {courseStudents.length === 0 && (
                <div className="text-center py-6 text-white/30 text-[11px]">Chưa có sinh viên đăng ký môn thi học phần này.</div>
              )}
            </div>

            {courseStudents.length > 0 && (
              <button
                onClick={handleScanAttendanceWarnings}
                className="w-full py-2.5 bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/15 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 animate-bounce" /> Phát cảnh báo răn đe chuyên cần
              </button>
            )}
          </div>

        </div>
      ) : (
        <div className="py-24 text-center border border-white/5 bg-white/2 rounded-3xl text-white/40 space-y-2">
          <BookOpen className="h-12 w-12 mx-auto text-indigo-500/30" />
          <h4 className="text-sm font-bold text-white/80">Quản trị chuyên cần & Biểu chuyên học</h4>
          <p className="text-xs max-w-sm mx-auto">Vui lòng chọn hoặc lựa chọn một Học phần đào tạo từ thanh công cụ HUD phía trên đầu để khởi chạy quản trị chuyên cần.</p>
        </div>
      )}

      {/* CREATE SESSION MODAL CONTAINER */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowCreateSession(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3 uppercase">
              <PlusCircle className="h-5 w-5 text-indigo-400" /> Thiết lập buổi điểm danh lớp học
            </h3>

            <p className="text-xs text-white/50 leading-relaxed mb-4">
              Khởi động khung điểm danh cho ngày hôm nay. Hệ thống sẽ tự kiểm kích và lên sẵn bộ hồ sơ mặc định của sinh viên để bớt thao tác rờ rà.
            </p>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold block">Ngày học tập</label>
                  <input
                    type="date"
                    required
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 font-semibold block">Giờ học cụ thể</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 09:00 - 11:30"
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white/70 font-semibold block">Đề tài giảng dạy / Chủ đề ngày học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lý thuyết Model Schema Design hay Lab 03 Git..."
                  value={newSessionTopic}
                  onChange={(e) => setNewSessionTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSession(false)}
                  className="px-4 py-2 bg-transparent text-white/50 hover:text-white transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
                >
                  <FolderSync className="h-3.5 w-3.5" /> Xác nhận mở điểm danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
