const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/AttendanceManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find handleCreateSessionSubmit and replace it
const createSessionRegex = /\/\/ New Session submit[\s\S]*?\/\/ Modify Record Status per student/;

const newCreateSession = `// New Session submit
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      triggerToast("Vui lòng chọn môn học trước khi lập buổi điểm danh.");
      return;
    }
    if (!newSessionDate || !newSessionTopic.trim()) {
      triggerToast("Hãy nhập đầy đủ thông tin ngày tháng và chủ đề.");
      return;
    }

    const combinedDate = newSessionTime.trim() ? \`\${newSessionDate} (\${newSessionTime.trim()})\` : newSessionDate;
    try {
      const result = await api.saveAttendance({
        courseId: selectedCourseId,
        semesterId: curSemesterId,
        date: combinedDate,
        topic: newSessionTopic.trim(),
        records: courseEnrollments.map(enroll => ({ studentId: enroll.studentId, status: "present" }))
      }) as any;

      AppStore.log(currentUser.id, "create_attendance_session", selectedCourseId, \`Khởi tạo buổi học ngày \${combinedDate}\`);

      setNewSessionDate("");
      setNewSessionTopic("");
      setNewSessionTime("09:00 - 11:30");
      setShowCreateSession(false);
      setActiveSessionId(result.session.id);
      await onRefreshData();
      triggerToast("Đã khởi tạo buổi điểm danh môn học mới thành công.");
    } catch (err: any) {
      triggerToast(err.message || "Không thể tạo buổi điểm danh.");
    }
  };

  // Modify Record Status per student`;

content = content.replace(createSessionRegex, newCreateSession);

// Find handleMarkStatusChange and replace it
const markStatusRegex = /\/\/ Modify Record Status per student[\s\S]*?\/\/ Auto Scan compliance & create warnings/;

const newMarkStatus = `// Modify Record Status per student
  const handleMarkStatusChange = async (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    if (!activeSessionId) return;
    try {
      await api.updateAttendanceRecord({ sessionId: activeSessionId, studentId, status });
      await onRefreshData();
    } catch (err: any) {
      triggerToast(err.message || "Không thể cập nhật điểm danh.");
    }
  };

  // Auto Scan compliance & create warnings`;

content = content.replace(markStatusRegex, newMarkStatus);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched AttendanceManager.tsx!");
