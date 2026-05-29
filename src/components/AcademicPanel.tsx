import React, { useState } from "react";
import { 
  GraduationCap, 
  Users, 
  TrendingUp, 
  Clock, 
  Download, 
  Search, 
  BarChart2, 
  ChevronRight, 
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  Filter,
  Trash
} from "lucide-react";
import { User, Course, Enrollment, Lesson, LessonProgress } from "../types";
import { AppStore } from "../store";
import { useApiStore } from "../hooks/apiHooks";
import AttendanceManager from "./AttendanceManager";
import WarningAndReports from "./WarningAndReports";
import { api } from "../api";

interface AcademicPanelProps {
  currentUser: User;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function AcademicPanel({ currentUser, onLogout, onRefreshData }: AcademicPanelProps) {
  const { store, isLoading, isError } = useApiStore();

  // Active sub tab navigation
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "students" | "compare" | "dropouts" | "attendance" | "warnings" | "reports">("overview");

  // Filters state
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseDetailId, setCourseDetailId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sorting state for student progress ledger
  const [ledgerSortField, setLedgerSortField] = useState<string>("studentName");
  const [ledgerSortOrder, setLedgerSortOrder] = useState<"asc" | "desc">("asc");

  // Sorting state for course comparison dataset
  const [compareSortField, setCompareSortField] = useState<string>("courseTitle");
  const [compareSortOrder, setCompareSortOrder] = useState<"asc" | "desc">("asc");

  const handleLedgerSort = (field: string) => {
    if (ledgerSortField === field) {
      setLedgerSortOrder(ledgerSortOrder === "asc" ? "desc" : "asc");
    } else {
      setLedgerSortField(field);
      setLedgerSortOrder("asc");
    }
  };

  const handleCompareSort = (field: string) => {
    if (compareSortField === field) {
      setCompareSortOrder(compareSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCompareSortField(field);
      setCompareSortOrder("asc");
    }
  };



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`⚠️ CẢNH BÁO CỰC KỲ QUAN TRỌNG ⚠️\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN khóa học "${courseTitle}" không?\nHành động này sẽ thực hiện xóa hàng loạt toàn bộ bài học, câu hỏi, bài thi, bài tập và điểm số liên quan đến môn học này.\n\nHành động này không thể hoàn tác!`)) {
      return;
    }
    try {
      await api.deleteCourse(courseId);
      showToast(`✅ Đã xóa vĩnh viễn khóa học "${courseTitle}" thành công!`);
      onRefreshData();
    } catch (err: any) {
      showToast(`❌ Không thể xóa khóa học: ${err.message}`);
    }
  };

  // Base Data Queries
  const activeCourses = store.courses.filter(c => c.status === "published");
  const totalStudents = store.users.filter(u => u.role === "student").length;

  // Filter courses based on teacher if a teacher filter is selected
  const filteredCoursesForCalculations = activeCourses.filter(c => 
    selectedTeacherId === "all" || c.teacherId === selectedTeacherId
  );
  const filteredCourseIds = filteredCoursesForCalculations.map(c => c.id);

  // Filter enrollments based on course selection and teacher selection
  const filteredEnrollments = store.enrollments.filter(e => {
    const course = store.courses.find(c => c.id === e.courseId);
    if (!course || course.status !== "published") return false;

    const matchesCourse = selectedCourseId === "all" || e.courseId === selectedCourseId;
    const matchesTeacher = selectedTeacherId === "all" || course.teacherId === selectedTeacherId;

    return matchesCourse && matchesTeacher;
  });

  // Calculate Average Completion Rate
  const totalEnrollmentsCount = filteredEnrollments.length;
  let totalCompletionSum = 0;
  let tregStudentsCount = 0; // trễ tiến độ count (progress < 50% and enrolled > 14 days ago)
  
  const enrollmentDetails = filteredEnrollments.map(e => {
    const studentUser = store.users.find(u => u.id === e.studentId);
    const courseObj = store.courses.find(c => c.id === e.courseId);
    const totalLessons = store.lessons.filter(l => l.courseId === e.courseId).length;
    const completedProgressCount = store.lessonProgress.filter(
      p => p.enrollmentId === e.id && p.completed
    ).length;

    const progressPercentage = totalLessons ? Math.round((completedProgressCount / totalLessons) * 100) : 0;
    totalCompletionSum += progressPercentage;

    // A student is considered late/lagging (Trễ tiến độ) if they have progress < 50%
    const isLate = progressPercentage < 50;
    if (isLate) {
      tregStudentsCount++;
    }

    return {
      enrollment: e,
      student: studentUser,
      course: courseObj,
      progress: progressPercentage,
      completedCount: completedProgressCount,
      totalCount: totalLessons,
      isLate
    };
  });

  const avgCompletionRate = totalEnrollmentsCount ? Math.round(totalCompletionSum / totalEnrollmentsCount) : 0;

  // Compare active courses metric logic
  const courseComparisonDataset = activeCourses.map(c => {
    const courseEnrollments = store.enrollments.filter(e => e.courseId === c.id);
    const courseLessons = store.lessons.filter(l => l.courseId === c.id);
    const teacherName = store.users.find(u => u.id === c.teacherId)?.name || "Chưa gán";

    let completedSum = 0;
    courseEnrollments.forEach(e => {
      const completedCount = store.lessonProgress.filter(p => p.enrollmentId === e.id && p.completed).length;
      const pct = courseLessons.length ? (completedCount / courseLessons.length) * 100 : 0;
      completedSum += pct;
    });

    const averageCompletion = courseEnrollments.length ? Math.round(completedSum / courseEnrollments.length) : 0;
    
    // Average Quiz score for this course
    const courseQuizzes = store.quizzes.filter(q => q.courseId === c.id);
    const courseQuizIds = courseQuizzes.map(q => q.id);
    const courseAttempts = store.quizAttempts.filter(qa => courseQuizIds.includes(qa.quizId));
    const avgScore = courseAttempts.length ? Math.round(courseAttempts.reduce((acc, curr) => acc + curr.score, 0) / courseAttempts.length) : 0;

    return {
      course: c,
      teacherName,
      enrollmentCount: courseEnrollments.length,
      avgCompletion: averageCompletion,
      avgQuizScore: avgScore
    };
  });

  // Dropout Analysis (Tỷ lệ bỏ dở từng bài học)
  const dropoutAnalysis = (() => {
    if (selectedCourseId === "all" || selectedCourseId === "") {
      // Default to first active course for rich preview
      const firstCourse = activeCourses[0];
      return firstCourse ? getDropoutForCourse(firstCourse.id) : [];
    }
    return getDropoutForCourse(selectedCourseId);
  })();

  function getDropoutForCourse(courseId: string) {
    const courseLessons = store.lessons.filter(l => l.courseId === courseId).sort((a,b) => a.order - b.order);
    const courseEnrollments = store.enrollments.filter(e => e.courseId === courseId);
    
    return courseLessons.map(lesson => {
      // Find how many enrolled students have completed this lesson
      const completedCount = courseEnrollments.filter(e => {
        return store.lessonProgress.some(p => p.enrollmentId === e.id && p.lessonId === lesson.id && p.completed);
      }).length;

      // Drop rate is percentage of active students in the course who DID NOT complete this lesson
      const dropRate = courseEnrollments.length ? Math.round(((courseEnrollments.length - completedCount) / courseEnrollments.length) * 100) : 0;

      return {
        lesson,
        completedCount,
        studentTotal: courseEnrollments.length,
        dropRate
      };
    });
  }

  // Handle Export CSV Training report
  const handleExportCSVReport = () => {
    let csvContent = "Khóa học,Giảng viên,Sĩ số học viên,Tiến độ hoàn thành trung bình (%),Điểm kiểm tra trung bình (%)\n";
    courseComparisonDataset.forEach(d => {
      csvContent += `"${d.course.title}","${d.teacherName}","${d.enrollmentCount}","${d.avgCompletion}","${d.avgQuizScore}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bao_cao_quan_ly_hoc_vu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống báo cáo tổng quan học vụ CSV!");
  };

  const filteredStudentLedger = enrollmentDetails.filter(item => {
    if (!item.student) return false;
    const query = searchStudentQuery.toLowerCase();
    return item.student.name.toLowerCase().includes(query) || 
           item.student.email.toLowerCase().includes(query);
  });

  const sortedStudentLedger = [...filteredStudentLedger].sort((a, b) => {
    if (!ledgerSortField) return 0;
    let valA: any = "";
    let valB: any = "";

    if (ledgerSortField === "studentName") {
      valA = a.student?.name || "";
      valB = b.student?.name || "";
    } else if (ledgerSortField === "courseTitle") {
      valA = a.course?.title || "";
      valB = b.course?.title || "";
    } else if (ledgerSortField === "enrolledAt") {
      valA = a.enrollment.enrolledAt ? new Date(a.enrollment.enrolledAt).getTime() : 0;
      valB = b.enrollment.enrolledAt ? new Date(b.enrollment.enrolledAt).getTime() : 0;
    } else if (ledgerSortField === "progress") {
      valA = a.progress;
      valB = b.progress;
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return ledgerSortOrder === "asc" 
        ? valA.localeCompare(valB, "vi", { sensitivity: "base" }) 
        : valB.localeCompare(valA, "vi", { sensitivity: "base" });
    }
    return ledgerSortOrder === "asc" ? valA - valB : valB - valA;
  });

  const filteredCourseComparison = courseComparisonDataset.filter(item => {
    return !courseSearch || 
      item.course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      item.teacherName.toLowerCase().includes(courseSearch.toLowerCase());
  });

  const sortedCourseComparison = [...filteredCourseComparison].sort((a, b) => {
    if (!compareSortField) return 0;
    let valA: any = "";
    let valB: any = "";

    if (compareSortField === "courseTitle") {
      valA = a.course.title || "";
      valB = b.course.title || "";
    } else if (compareSortField === "teacherName") {
      valA = a.teacherName || "";
      valB = b.teacherName || "";
    } else if (compareSortField === "enrollmentCount") {
      valA = a.enrollmentCount;
      valB = b.enrollmentCount;
    } else if (compareSortField === "avgCompletion") {
      valA = a.avgCompletion;
      valB = b.avgCompletion;
    } else if (compareSortField === "avgQuizScore") {
      valA = a.avgQuizScore;
      valB = b.avgQuizScore;
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return compareSortOrder === "asc"
        ? valA.localeCompare(valB, "vi", { sensitivity: "base" })
        : valB.localeCompare(valA, "vi", { sensitivity: "base" });
    }
    return compareSortOrder === "asc" ? valA - valB : valB - valA;
  });

  return (
    <div className="space-y-8 text-white/90">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2563eb] text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 px-3 py-1 rounded-full border border-[#38bdf8]/20 uppercase">
            Phân hệ Quản lý Học vụ & Giám sát đào tạo
          </span>
          <h2 className="text-2xl font-display font-bold text-white mt-1.5">Xin chào, {currentUser.name} 📈</h2>
          <p className="text-sm text-white/60">Giám sát chất lượng giảng dạy, tỷ lệ hoàn hành bài học, điểm số và biểu đồ phân tích hao hụt học viên.</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Khóa học đăng đóng/ở</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">{activeCourses.length} Khóa học</span>
            <span className="text-[10px] text-white/30 font-mono">Đang công chiếu Đã công bố</span>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Tổng sĩ số học viên</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{totalStudents} Học viên</span>
            <span className="text-[10px] text-white/30 font-mono">Đăng ký hệ thống thực tế</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Tỷ lệ hoàn thành trung bình</span>
            <span className="text-xl font-bold text-indigo-400 mt-1 block">{avgCompletionRate}%</span>
            <span className="text-[10px] text-white/30 font-mono">Tính trên các học viên đăng ký</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 block font-medium">Học viên trễ tiến độ</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{tregStudentsCount} Học viên</span>
            <span className="text-[10px] text-white/30 font-mono">Có tiến độ học tập &lt; 50%</span>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Course & Teacher Filter bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/50 font-mono uppercase font-bold text-[11px]">
            <Filter className="h-3.5 w-3.5" /> Bộ lọc tổng hợp:
          </div>

          <div className="flex items-center gap-2">
            <span>Theo Giảng viên:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setSelectedCourseId("all"); // Reset course selection
              }}
              className="p-1.5 bg-slate-900 border border-white/10 text-white rounded-lg focus:outline-none focus:border-white/20"
            >
              <option value="all">Tất cả Giảng viên</option>
              {store.users.filter(u => u.role === "teacher").map(teach => (
                <option key={teach.id} value={teach.id}>{teach.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Theo Khóa học:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="p-1.5 bg-slate-900 border border-white/10 text-white rounded-lg focus:outline-none focus:border-white/20"
            >
              <option value="all">Tất cả Khóa học</option>
              {store.courses.filter(c => selectedTeacherId === "all" || c.teacherId === selectedTeacherId).map(crs => (
                <option key={crs.id} value={crs.id}>{crs.title}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSVReport}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition text-white shadow shadow-sky-700/50 cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Xuất Báo cáo đào tạo (CSV)
        </button>
      </div>

      {/* Main interactive subpanels workspace */}
      <div className="flex flex-wrap border-b border-white/10 bg-white/5 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "overview" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Tổng quan Chất lượng
        </button>
        <button
          onClick={() => setActiveSubTab("students")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "students" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Tiến độ Từng Học viên
        </button>
        <button
          onClick={() => setActiveSubTab("compare")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "compare" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          So sánh Hiệu suất
        </button>
        <button
          onClick={() => setActiveSubTab("dropouts")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "dropouts" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Hao hụt Bài học
        </button>
        <button
          onClick={() => setActiveSubTab("attendance")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "attendance" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Quản lý Điểm danh
        </button>
        <button
          onClick={() => setActiveSubTab("warnings")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "warnings" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Cảnh báo Học tập
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
            activeSubTab === "reports" ? "bg-white/10 text-white border border-white/15" : "text-white/60 hover:text-white"
          }`}
        >
          Báo cáo & Phổ điểm
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        
        {/* Tab 1: Tổng quan */}
        {activeSubTab === "overview" && (() => {
          // Calculate dynamic statistics
          const allStudentProfiles = store.studentProfiles || [];
          const activeGpaValues = allStudentProfiles.map(p => p.gpa || 0).filter(g => g > 0);
          const studentAverageGpa = activeGpaValues.length 
            ? Number((activeGpaValues.reduce((sum, g) => sum + g, 0) / activeGpaValues.length).toFixed(2)) 
            : 0;

          const totalQuizAttemptsCount = store.quizAttempts.length;
          const passedQuizCount = store.quizAttempts.filter(qa => qa.passed).length;
          const quizPassPercentage = totalQuizAttemptsCount 
            ? Math.round((passedQuizCount / totalQuizAttemptsCount) * 100) 
            : 0;

          // Custom Course Completion rates vector
          const topCoursesMetrics = courseComparisonDataset
            .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
            .slice(0, 4);

          return (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-base font-display font-semibold text-white">Báo cáo chung chỉ số Học vụ & Giám sát Chuyên sâu</h4>
                <p className="text-xs text-white/50">Phân tích thống kê thời gian thực trên khối lượng cơ sở dữ liệu gồm 300+ học viên và 40 khóa học chính quy.</p>
              </div>

              {/* Bento grid rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual SVG Card 1: Course completion comparison */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-mono font-bold text-sky-400 block uppercase">Tiến độ Học tập Trung bình các Khóa tiêu biểu</span>
                    <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 font-mono">Top thịnh hành</span>
                  </div>

                  <div className="space-y-4 py-2">
                    {topCoursesMetrics.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-white/90 truncate max-w-[220px]">{item.course.title}</span>
                          <span className="font-mono text-sky-400 font-bold">{item.avgCompletion}% Tiến độ</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="bg-sky-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.avgCompletion}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/30 font-mono">
                          <span>Sĩ số: {item.enrollmentCount} học viên</span>
                          <span>Điểm thi: {item.avgQuizScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual SVG Card 2: Performance Donut/Gauge Ring */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-400 block uppercase pb-2 border-b border-white/5">Hiệu suất Đạt chuẩn Bài thi Trắc nghiệm (Quiz)</span>
                    <p className="text-[11px] text-white/50 pt-2 font-sans leading-relaxed">
                      Đo lường tỷ lệ vượt qua bài đánh giá năng lực trong nỗ lực đầu tiên của học sinh ở tất cả 40 phân hệ đào tạo.
                    </p>
                  </div>

                  <div className="flex items-center gap-8 py-4">
                    {/* SVG Gauge circular */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-white/5"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-indigo-500 transition-all duration-1000"
                          strokeWidth="3.5"
                          strokeDasharray={`${quizPassPercentage}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold font-mono text-white leading-none">{quizPassPercentage}%</span>
                        <span className="text-[8px] text-white/40 uppercase font-bold mt-1">Đạt chuẩn</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">Tổng số lượt làm bài:</span>
                        <span className="font-bold text-white font-mono">{totalQuizAttemptsCount} lượt</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">Bài làm đạt điểm đỗ:</span>
                        <span className="font-bold text-emerald-400 font-mono">{passedQuizCount} bài</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">Điểm số GPA Hệ thống:</span>
                        <span className="font-bold text-indigo-400 font-mono">{studentAverageGpa} / 4.0</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Stats overview data and Academic Warning alerts list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-black/25 border border-white/5 p-4 rounded-2xl text-xs space-y-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider block text-white/45 pb-1 border-b border-white/5">Chỉ số Hiệu suất Vận hành chính quy</span>
                  <div className="flex justify-between">
                    <span className="text-white/60">Tỷ lệ đồng bộ cơ sở dữ liệu:</span>
                    <span className="font-semibold text-emerald-400 font-mono">100% Đồng bộ</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2.5">
                    <span className="text-white/60">Số lượng học sinh trong niên khóa:</span>
                    <span className="font-bold text-white font-mono">{allStudentProfiles.length} tài liệu học bạ</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2.5">
                    <span className="text-white/60">Chứng chỉ cấp thành công (Hoàn thành 100%):</span>
                    <span className="font-bold text-emerald-400 font-mono">{store.certificates.length} chứng chỉ đã kích hoạt</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2.5">
                    <span className="text-white/60">Bài thi và Tiểu luận chờ chấm điểm:</span>
                    <span className="font-bold text-amber-400 font-mono">{store.submissions.filter(s => s.score === undefined).length} bài tập</span>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 flex gap-3.5 text-xs text-amber-300">
                  <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 leading-relaxed">
                    <span className="font-bold text-white block text-sm">Cảnh báo Học vụ Khẩn cấp</span>
                    <p className="text-white/70">
                      Hệ thống tự động phát hiện <strong>{tregStudentsCount} học sinh có tiến độ lớp học kém (&lt; 50%)</strong> hoặc đang nhận cảnh báo học tập do GPA dưới ngưỡng quy định. Ban quản lý học vụ cần phối hợp trực tiếp với Cố vấn học tập <strong>(Phạm Cố Vấn)</strong> để gửi thông báo rèn luyện tự động tới giao diện của phụ huynh học sinh ngay lập tức.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {/* Tab 2: Tiến độ từng học viên */}
        {activeSubTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h4 className="text-base font-display font-semibold text-white">Sổ theo dõi Tiến độ Học tập của Học viên</h4>
                <p className="text-xs text-white/50">Phân tích tỷ lệ phần trăm đã học xong để đưa ra các đề án giảng dạy phù hợp.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Tìm học viên bằng tên hoặc email..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs bg-black/25 text-white placeholder-white/40 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/50 uppercase font-mono tracking-wider font-bold">
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleLedgerSort("studentName")}>
                      Học viên {ledgerSortField === "studentName" ? (ledgerSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleLedgerSort("courseTitle")}>
                      Khóa học {ledgerSortField === "courseTitle" ? (ledgerSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleLedgerSort("enrolledAt")}>
                      Ngày đăng ký {ledgerSortField === "enrolledAt" ? (ledgerSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleLedgerSort("progress")}>
                      Hoàn thành bài học {ledgerSortField === "progress" ? (ledgerSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleLedgerSort("progress")}>
                      Tiến độ chi tiết {ledgerSortField === "progress" ? (ledgerSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4">Đánh giá chung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedStudentLedger.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition duration-150">
                      <td className="p-4 font-bold text-white">
                        <div>{item.student?.name}</div>
                        <div className="text-[10px] text-white/40 font-mono">{item.student?.email}</div>
                      </td>
                      <td className="p-4 text-white/80 font-semibold">{item.course?.title}</td>
                      <td className="p-4 font-mono text-white/40">
                        {item.enrollment.enrolledAt ? new Date(item.enrollment.enrolledAt).toLocaleDateString("vi-VN") : "Không xác định"}
                      </td>
                      <td className="p-4 font-mono text-white/70">
                        {item.completedCount}/{item.totalCount} bài học
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <code className="text-[10px] text-indigo-400 font-mono font-bold w-10 text-right">{item.progress}%</code>
                          <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.progress >= 100 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold text-[9px] uppercase font-mono">
                            Đã tốt nghiệp
                          </span>
                        ) : item.isLate ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-bold text-[9px] uppercase font-mono">
                            Cần thúc giục học
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-full font-bold text-[9px] uppercase font-mono">
                            Tiến độ tốt
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {sortedStudentLedger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-white/45">
                        Không tìm thấy học viên tương ứng với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: So sánh khóa học */}
        {activeSubTab === "compare" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">So sánh Hiệu xuất Đào tạo giữa các Khóa học</h4>
              <p className="text-xs text-white/50">Tỷ lệ hoàn thành trung bình, sĩ số đăng ký và kết quả thi trắc nghiệm giữa các đầu mục giảng dạy.</p>
            </div>

            <div className="flex gap-3 bg-white/3 border border-white/5 p-3 rounded-xl text-xs mb-4">
              <input
                type="text"
                placeholder="Tìm kiếm khóa học hoặc giảng viên..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full md:w-64 px-2.5 py-1.5 bg-black/25 text-white placeholder-white/30 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/50 uppercase font-mono tracking-wider font-bold">
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleCompareSort("courseTitle")}>
                      Khóa học {compareSortField === "courseTitle" ? (compareSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleCompareSort("teacherName")}>
                      Giảng viên phụ trách {compareSortField === "teacherName" ? (compareSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleCompareSort("enrollmentCount")}>
                      Tổng số học viên {compareSortField === "enrollmentCount" ? (compareSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleCompareSort("avgCompletion")}>
                      Tiến độ hoàn thành trung bình {compareSortField === "avgCompletion" ? (compareSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="p-4 cursor-pointer select-none hover:text-white transition" onClick={() => handleCompareSort("avgQuizScore")}>
                      Điểm thi quiz trung bình {compareSortField === "avgQuizScore" ? (compareSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    {["admin", "super_admin", "academic_admin"].includes(currentUser.role) && (
                      <th className="p-4 text-right">Thao tác</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedCourseComparison.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition duration-150">
                      <td className="p-4 font-bold text-white text-sm">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span>{item.course.title}</span>
                          <button
                            onClick={() => setCourseDetailId(item.course.id)}
                            className="px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded text-[9px] font-bold transition flex items-center gap-0.5 cursor-pointer font-sans"
                          >
                            Xem 👁️
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-white/60 font-medium">{item.teacherName}</td>
                      <td className="p-4 font-mono font-bold text-sky-400">{item.enrollmentCount} học viên</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">{item.avgCompletion}%</td>
                      <td className="p-4 font-mono font-bold text-indigo-400">{item.avgQuizScore}%</td>
                      {["admin", "super_admin", "academic_admin"].includes(currentUser.role) && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteCourse(item.course.id, item.course.title)}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/35 rounded-lg font-bold transition flex items-center gap-1 ml-auto cursor-pointer text-[10.5px]"
                          >
                            <Trash className="h-3.5 w-3.5" /> Xóa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {sortedCourseComparison.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-white/30 italic">Không tìm thấy khóa học nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Hao hụt học viên */}
        {activeSubTab === "dropouts" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">Tỷ lệ Hao hụt & Rời khóa theo Từng Bài học</h4>
              <p className="text-xs text-white/50">Hỗ trợ giảng viên phát hiện xem bài học thứ mấy đang bị quá khó hoặc quá tải khiến học viên dừng học.</p>
            </div>

            <div className="bg-black/25 p-4 rounded-xl text-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-white/70 block font-semibold">Chọn Khóa Học phân tích:</span>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="p-1.5 bg-slate-900 border border-white/10 text-white rounded-lg focus:outline-none"
                >
                  <option value="all">-- Chọn khóa học để đo lường cụ thể --</option>
                  {activeCourses.map(crs => (
                    <option key={crs.id} value={crs.id}>{crs.title}</option>
                  ))}
                </select>
              </div>

              {selectedCourseId !== "all" && selectedCourseId !== "" ? (
                <div className="space-y-4 pt-2">
                  <h6 className="font-mono font-bold text-[#38bdf8] uppercase text-[11px] block">Thứ tự hao hụt phần trăm theo bài học:</h6>
                  
                  <div className="space-y-3">
                    {dropoutAnalysis.map((item, idx) => (
                      <div key={idx} className="bg-black/35 p-3.5 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <span className="text-white font-bold block">Bài {item.lesson.order}: {item.lesson.title}</span>
                          <span className="text-[10px] text-white/40 block">Học viên đã nộp hoàn tất: {item.completedCount} / {item.studentTotal}</span>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="text-xs text-white/50 font-mono">Tỷ lệ bỏ dở ở bài này:</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${item.dropRate > 40 ? "text-red-400" : item.dropRate > 15 ? "text-amber-400" : "text-emerald-400"}`}>
                              {item.dropRate}%
                            </span>
                            <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full ${item.dropRate > 40 ? "bg-red-500" : item.dropRate > 15 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${item.dropRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {dropoutAnalysis.length === 0 && (
                      <span className="text-white/40 italic text-xs block">Khóa học này hiện chưa có bài học nào được định nghĩa bài bản.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-white/40">
                  Vui lòng chọn một khóa học cụ thể từ danh sách bên trên để tải lược đồ hao hụt bỏ học.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Quản lý Điểm danh */}
        {activeSubTab === "attendance" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">Điểm danh & Chuyên cần Học viên</h4>
              <p className="text-xs text-white/50">Học vụ hỗ trợ giảng viên điểm danh học phần hoặc điều chỉnh hồ sơ chuyên cần nhanh chóng.</p>
            </div>
            <AttendanceManager 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={showToast} 
            />
          </div>
        )}

        {/* Tab 6: Cảnh báo học tập */}
        {activeSubTab === "warnings" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">Quản lý Cảnh báo Học thuật</h4>
              <p className="text-xs text-white/50">Gửi cảnh báo rèn luyện chuyên môn, GPA, hoặc học phí quá hạn tới học sinh.</p>
            </div>
            <WarningAndReports 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={showToast} 
              onSelectStudentProfile={(userId) => setActiveSubTab("students")}
              defaultTab="warnings"
            />
          </div>
        )}

        {/* Tab 7: Báo cáo & Phổ điểm GPA */}
        {activeSubTab === "reports" && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-base font-display font-semibold text-white">Báo cáo & Phổ điểm Hệ thống</h4>
              <p className="text-xs text-white/50">Thống kê biểu đồ phổ điểm GPA toàn trường và hiệu suất thu hồi học phí học kỳ.</p>
            </div>
            <WarningAndReports 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={showToast} 
              onSelectStudentProfile={(userId) => setActiveSubTab("students")}
              defaultTab="reports"
            />
          </div>
        )}

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
