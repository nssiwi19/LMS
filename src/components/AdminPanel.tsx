import React, { useState } from "react";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  UserPlus, 
  Upload, 
  Download, 
  Check, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  FileSpreadsheet, 
  SlidersHorizontal,
  Database,
  ShieldCheck,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  Building,
  ShieldAlert,
  Activity,
  LogOut,
  ChevronRight
} from "lucide-react";
import { LMSDataStore, User, Course, Lesson, Quiz, Question, Assignment, Submission, QuizAttempt } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";
import { hashPassword } from "../authHash";
import { useApiStore } from "../hooks/apiHooks";

// Import modular sub-components
import AcademicManager from "./AcademicManager";
import StudentRegistry from "./StudentRegistry";
import AttendanceManager from "./AttendanceManager";
import TuitionManager from "./TuitionManager";
import WarningAndReports from "./WarningAndReports";

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
  onRefreshData: () => void;
}

export default function AdminPanel({ currentUser, onLogout, onRefreshData }: AdminPanelProps) {
  const { store, isLoading, isError } = useApiStore();

  // Navigation tab states
  // Groupings: ACADEMIC, STUDENTS, LEARNING, REPORTS
  const [activeSubTab, setActiveSubTab] = useState<
    | "academic_years" 
    | "semesters" 
    | "departments" 
    | "programs" 
    | "students" 
    | "attendance" 
    | "tuition" 
    | "warnings" 
    | "approval" 
    | "users" 
    | "analytics" 
    | "reports"
    | "audit"
  >("students");

  // Keep student selection state for quick lookup redirection from other tabs
  const [registryLookupStudentId, setRegistryLookupStudentId] = useState<string | null>(null);

  // Existing User modals states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"student" | "teacher" | "admin" | "finance" | "le_tan" | "academic_admin">("student");
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Course rejection states
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Search & Filter flags for users registry
  const [userSearch, setUserSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userDirTab, setUserDirTab] = useState<"student" | "teacher" | "other">("student");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 8;

  const [toastMessage, setToastMessage] = useState<string | null>(null);



  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Create User Action
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.includes("@") || newUserPassword.length < 6 || !newUserName.trim()) {
      triggerToast("ThÃ´ng tin Ä‘Äƒng kÃ½ chÆ°a há»£p lá»‡ (Máº­t kháº©u tá»‘i thiá»ƒu 6 kÃ½ tá»±).");
      return;
    }

    const storeData = AppStore.get();
    const exists = storeData.users.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
    if (exists) {
      triggerToast("Email Ä‘Äƒng kÃ½ nÃ y tÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i.");
      return;
    }

    const credential = hashPassword(newUserPassword);
    const added: User = {
      id: generateId("user"),
      name: newUserName.trim(),
      email: newUserEmail.toLowerCase().trim(),
      passwordHash: credential.hash,
      passwordSalt: credential.salt,
      role: newUserRole,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    storeData.users.push(added);

    // If it's a student account, auto-generate StudentProfile
    if (newUserRole === "student") {
      if (!storeData.studentProfiles) storeData.studentProfiles = [];
      const studentCode = `SV${new Date().getFullYear()}${String(storeData.studentProfiles.length + 1).padStart(4, "0")}`;
      storeData.studentProfiles.push({
        id: generateId("profile"),
        userId: added.id,
        studentCode,
        programId: "prog_se", // software engineering as default seeded
        departmentId: "dept_cs", // computerscience default
        academicYear: 1, // year 1
        enrollmentDate: new Date().toISOString().slice(0, 10),
        expectedGraduation: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().slice(0, 10),
        status: "active",
        gpa: 0.0,
        totalCreditsEarned: 0
      });
    }

    AppStore.log(currentUser.id, "create_user", added.email, `Khá»Ÿi táº¡o ngÆ°á»i dÃ¹ng quyá»n: ${added.role}`);
    AppStore.save(storeData);
    
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPassword("");
    setShowAddUserModal(false);
    onRefreshData();
    triggerToast("ÄÃ£ lÆ°u trá»¯ vÃ  thiáº¿t láº­p tÃ i khoáº£n thÃ nh cÃ´ng.");
  };

  // CSV Users Bulk Import Entry
  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      triggerToast("ChÆ°a nháº­p ná»™i dung tá»‡p CSV.");
      return;
    }

    const rows = csvText.split("\n").map(r => r.trim()).filter(Boolean);
    let successCount = 0;
    let errorCount = 0;
    const storeData = AppStore.get();

    rows.forEach((row, index) => {
      if (index === 0 && (row.toLowerCase().includes("name") || row.toLowerCase().includes("email"))) {
        return; // skip headers
      }

      const columns = row.split(",").map(c => c.trim().replace(/"/g, ""));
      if (columns.length < 3) {
        errorCount++;
        return;
      }

      const [name, email, role] = columns;
      const cleanRole = role.toLowerCase() as any;
      const roleValidated = ["student", "teacher", "admin", "finance", "le_tan", "academic_admin"].includes(cleanRole);
      const emailUnique = !storeData.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (name && email.includes("@") && roleValidated && emailUnique) {
        const credential = hashPassword("password123");
        const importedUser: User = {
          id: generateId("user"),
          name,
          email: email.toLowerCase(),
          passwordHash: credential.hash,
          passwordSalt: credential.salt,
          role: cleanRole,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        storeData.users.push(importedUser);

        // Auto profile for student imports
        if (cleanRole === "student") {
          if (!storeData.studentProfiles) storeData.studentProfiles = [];
          const studentCode = `SV${new Date().getFullYear()}${String(storeData.studentProfiles.length + 1).padStart(4, "0")}`;
          storeData.studentProfiles.push({
            id: generateId("profile"),
            userId: importedUser.id,
            studentCode,
            programId: "prog_se",
            departmentId: "dept_cs",
            academicYear: 1,
            enrollmentDate: new Date().toISOString().slice(0, 10),
            expectedGraduation: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().slice(0, 10),
            status: "active",
            gpa: 0.0,
            totalCreditsEarned: 0
          });
        }

        AppStore.notify(importedUser.id, "info", `TÃ i khoáº£n cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi táº¡o thÃ´ng qua tá»‡p nháº­p liá»‡u CSV cá»§a Quáº£n trá»‹ viÃªn.`);
        successCount++;
      } else {
        errorCount++;
      }
    });

    if (successCount > 0) {
      AppStore.log(currentUser.id, "bulk_csv_import", "users", `Nháº­p dá»¯ liá»‡u CSV Ä‘á»“ng loáº¡t thÃ nh cÃ´ng: ${successCount} dÃ²ng.`);
      AppStore.save(storeData);
      onRefreshData();
      setImportMessage({ 
        type: "success", 
        text: `ÄÃ£ nháº­p Ä‘á»“ng loáº¡t. ThÃ nh cÃ´ng: ${successCount} tÃ i khoáº£n. Tháº¥t báº¡i hoáº·c trÃ¹ng láº·p: ${errorCount}.` 
      });
      setCsvText("");
      setTimeout(() => setShowImportModal(false), 3000);
    } else {
      setImportMessage({ 
        type: "error", 
        text: `Nháº­p dá»¯ liá»‡u Ä‘á»“ng loáº¡t tháº¥t báº¡i. ToÃ n bá»™ ${errorCount} dÃ²ng cÃ³ lá»—i schema cáº¥u trÃºc cáº¥u trÃºc hoáº·c Ä‘Ã£ bá»‹ trÃ¹ng email.` 
      });
    }
  };

  // Toggle user active status action
  const handleToggleUserStatus = (userId: string) => {
    const storeData = AppStore.get();
    storeData.users = storeData.users.map(u => {
      if (u.id === userId) {
        const nextState = !u.isActive;
        AppStore.log(currentUser.id, "toggle_user_status", u.email, `Thay Ä‘á»•i tráº¡ng thÃ¡i tÃ i khoáº£n thÃ nh: ${nextState ? "Active" : "Locked"}`);
        return { ...u, isActive: nextState };
      }
      return u;
    });
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng ngÆ°á»i dÃ¹ng.");
  };

  const ensureStudentProfile = (storeData: LMSDataStore, userId: string) => {
    if (!storeData.studentProfiles) storeData.studentProfiles = [];
    if (storeData.studentProfiles.some(profile => profile.userId === userId)) return;
    const nextIndex = storeData.studentProfiles.length + 1;
    storeData.studentProfiles.push({
      id: generateId("profile"),
      userId,
      studentCode: `SV${new Date().getFullYear()}${String(nextIndex).padStart(4, "0")}`,
      programId: "prog_se",
      departmentId: "dept_cs",
      academicYear: 1,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      expectedGraduation: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().slice(0, 10),
      status: "active",
      gpa: 0,
      totalCreditsEarned: 0
    });
  };

  const handleUpdateUserRole = (userId: string, newRole: User["role"]) => {
    const allowedRoles: User["role"][] = ["student", "teacher", "admin", "finance", "academic_admin", "le_tan", "advisor"];
    if (!allowedRoles.includes(newRole)) return;
    const storeData = AppStore.get();
    storeData.users = storeData.users.map(user => user.id === userId ? { ...user, role: newRole } : user);
    if (newRole === "student") ensureStudentProfile(storeData, userId);
    AppStore.log(currentUser.id, "update_user_role", userId, `Changed role to ${newRole}`);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("ÄÃ£ cáº­p nháº­t quyá»n háº¡n ngÆ°á»i dÃ¹ng vÃ  Ä‘á»“ng bá»™ xuá»‘ng PostgreSQL.");
  };

  // Approve Course selection
  const handleApproveCourse = (courseId: string) => {
    const storeData = AppStore.get();
    storeData.courses = storeData.courses.map(c => {
      if (c.id === courseId) {
        AppStore.log(currentUser.id, "approve_course", c.title, "PhÃª duyá»‡t cÃ´ng khai khÃ³a giáº£ng dáº¡y.");
        AppStore.notify(c.teacherId, "success", `Tin vui: BÃ i yÃªu cáº§u má»Ÿ mÃ´n "${c.title}" cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c quáº£n trá»‹ viÃªn duyá»‡t cÃ´ng bá»‘ hoÃ n táº¥t!`);
        return { ...c, status: "published" };
      }
      return c;
    });
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("ÄÃ£ phÃª duyá»‡t vÃ  phÃ¡t hÃ nh khÃ³a há»c.");
  };

  const handleStartRejectCourse = (courseId: string) => {
    setRejectingCourseId(courseId);
    setRejectReason("");
  };

  const handleConfirmRejectCourse = () => {
    if (!rejectingCourseId) return;
    if (!rejectReason.trim()) {
      triggerToast("Vui lÃ²ng ghi rÃµ lÃ½ do tráº£ vá» há»c pháº§n.");
      return;
    }

    const storeData = AppStore.get();
    storeData.courses = storeData.courses.map(c => {
      if (c.id === rejectingCourseId) {
        AppStore.log(currentUser.id, "reject_course", c.title, `Tráº£ vá» yÃªu cáº§u: ${rejectReason}`);
        AppStore.notify(c.teacherId, "danger", `BÃ i Ä‘Äƒng kÃ½ khÃ³a há»c "${c.title}" cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c pháº£n há»“i lá»—i Ä‘iá»u chá»‰nh há»c pháº§n lÃ½ do: ${rejectReason}`);
        return { ...c, status: "rejected" };
      }
      return c;
    });
    AppStore.save(storeData);
    setRejectingCourseId(null);
    onRefreshData();
    triggerToast("Há»c pháº§n lá»›p há»c Ä‘Æ°á»£c tráº£ vá» Ä‘á»ƒ Ä‘iá»u hÃ nh giáº£ng viÃªn bá»• sung.");
  };

  // Local JSON snapshot export dump backup
  const handleExportDataStore = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sis_lms_backup_data_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("ÄÃ£ sao lÆ°u dá»n dáº¹p káº¿t tinh tá»‡p JSON sao lÆ°u.");
  };

  // Computed counters metrics
  const totalUsersCount = store.users.length;
  const totalCoursesCount = store.courses.length;
  const totalEnrollmentsCount = store.enrollments.length;

  // Search filter listings
  const filteredUsers = store.users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && u.isActive) || 
      (filterStatus === "inactive" && !u.isActive);
    const matchesDirectory =
      userDirTab === "student" ? u.role === "student" :
      userDirTab === "teacher" ? u.role === "teacher" :
      !["student", "teacher", "parent"].includes(u.role);

    return matchesSearch && matchesRole && matchesStatus && matchesDirectory;
  });

  const pageCount = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);
  const pendingCourses = store.courses.filter(c => c.status === "pending");

  // Redirection link callback helper to load Student Profile Modal details
  const handleSelectStudentProfileRedirect = (userId: string) => {
    setRegistryLookupStudentId(userId);
    setActiveSubTab("students");
  };

  return (
    <div className="space-y-6">
      {isLoading && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Äang táº£i dá»¯ liá»‡u...</div>}
      {isError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u tá»« server.</div>}
      {/* Toast alarms logs alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2563eb] border border-blue-400 text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl animate-fade-in animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Administrative Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-9e0">
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-[#2563eb] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 uppercase">
            Cá»”NG THÃ”NG TIN QUáº¢N TRá»Š VIÃŠN & PHÃ’NG ÄÃ€O Táº O (SIS-LMS)
          </span>
          <h2 className="text-xl font-display font-bold text-white mt-2">Executive Portal & Academic Records</h2>
          <p className="text-xs text-white/50">PhÃ¢n quyá»n giÃ¡m sÃ¡t cáº¥u trÃºc há»c ká»³ niÃªn khÃ³a, chuyÃªn cáº§n há»c sinh, tá»•ng vá»¥ tÃ i chÃ­nh káº¿ toÃ¡n.</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="h-4.5 w-4.5" /> Nháº­p CSV Users
          </button>
          <button 
            onClick={handleExportDataStore}
            className="px-3.5 py-1.5 text-xs font-bold text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="h-4.5 w-4.5" /> Sao lÆ°u JSON
          </button>
          <button 
            onClick={() => setShowAddUserModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-indigo-950 bg-white hover:bg-white/95 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4.5 w-4.5" /> Táº¡o ngÆ°á»i dÃ¹ng
          </button>
        </div>
      </div>

      {/* Grid counters stat cards metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">NhÃ¢n kháº©u há»c (Tá»•ng sá»‘ tÃ i khoáº£n)</p>
          <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalUsersCount}</h3>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">KhÃ³a há»c mÃ´n giáº£ng dáº¡y</p>
          <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalCoursesCount}</h3>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">ÄÄƒng kÃ½ lá»›p há»c niÃªn khÃ³a</p>
          <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalEnrollmentsCount}</h3>
        </div>
      </div>

      {/* Main Two-Column Layout split sidebar list vs viewports */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column navbar structured sections */}
        <div className="lg:w-64 flex-shrink-0 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs space-y-4">
            
            <div className="space-y-1.5">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block px-2.5">
                SCHOLASTIC (Cáº¥u trÃºc Ä‘Ã o táº¡o)
              </span>
              <button
                onClick={() => { setActiveSubTab("academic_years"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "academic_years" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> NÄƒm há»c</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("semesters"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "semesters" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Há»c Ká»³</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("departments"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "departments" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Building className="h-4 w-4" /> Khoa (Departments)</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("programs"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "programs" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> ChÆ°Æ¡ng trÃ¬nh Ä‘Ã o táº¡o</span>
              </button>
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block px-2.5">
                STUDENTS & ACADEMICS (Há»“ sÆ¡ há»c vá»¥)
              </span>
              <button
                onClick={() => { setActiveSubTab("students"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "students" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Sá»• Há»c sinh Sinh viÃªn</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("attendance"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "attendance" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Quáº£n trá»‹ Äiá»ƒm danh</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("tuition"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "tuition" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Káº¿ toÃ¡n Há»c PhÃ­</span>
              </button>
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block px-2.5">
                LEARNING PLATFORM (LMS máº·c Ä‘á»‹nh)
              </span>
              <button
                onClick={() => { setActiveSubTab("approval"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "approval" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Duyá»‡t khÃ³a há»c</span>
                {pendingCourses.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-sans font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {pendingCourses.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveSubTab("users"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "users" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> PhÃ¢n quyá»n ngÆ°á»i dÃ¹ng</span>
              </button>
              <button
                onClick={() => { setActiveSubTab("audit"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "audit" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><Database className="h-4 w-4" /> Nháº­t kÃ½ há»‡ thá»‘ng (Audit)</span>
              </button>
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block px-2.5">
                REPORTS STATS (Thá»‘ng kÃª tá»•ng há»£p)
              </span>
              <button
                onClick={() => { setActiveSubTab("warnings"); setRegistryLookupStudentId(null); }}
                className={`w-full text-left py-2 px-3 rounded-xl transition font-medium flex items-center justify-between ${
                  activeSubTab === "warnings" ? "bg-white/10 text-white font-bold" : "text-white/60 hover:bg-white/2 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Cáº£nh bÃ¡o & Thá»‘ng KÃª</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Main viewport area container */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 min-w-0">
          
          {/* SCHOLASTIC GROUP (Academic Manager) */}
          {(activeSubTab === "academic_years" || activeSubTab === "semesters" || activeSubTab === "departments" || activeSubTab === "programs") && (
            <AcademicManager 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={triggerToast}
              initialTab={
                activeSubTab === "academic_years" ? "years" :
                activeSubTab === "semesters" ? "semesters" :
                activeSubTab === "departments" ? "departments" :
                "programs"
              }
            />
          )}

          {/* STUDENTS GROUP (Student registry layout) */}
          {activeSubTab === "students" && (
            <StudentRegistry 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={triggerToast} 
            />
          )}

          {/* ATTENDANCE GROUP */}
          {activeSubTab === "attendance" && (
            <AttendanceManager 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={triggerToast} 
            />
          )}

          {/* TUITION BILLINGS GROUP */}
          {activeSubTab === "tuition" && (
            <TuitionManager 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={triggerToast} 
            />
          )}

          {/* WARNINGS & HISTOGRAMS REPORTS GROUP */}
          {(activeSubTab === "warnings" || activeSubTab === "reports") && (
            <WarningAndReports 
              store={store} 
              currentUser={currentUser} 
              onRefreshData={onRefreshData} 
              triggerToast={triggerToast} 
              onSelectStudentProfile={handleSelectStudentProfileRedirect} 
            />
          )}

          {/* EXISTING APPROVED TAB */}
          {activeSubTab === "approval" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Xá»­ lÃ½ PhÃª duyá»‡t Má»Ÿ MÃ´n há»c & Äá» cÆ°Æ¡ng</h3>
                <p className="text-xs text-white/50">PhÃª duyá»‡t Ä‘á»ƒ Ä‘Æ°a bÃ i khÃ³a há»c cá»§a GiÃ¡o viÃªn chuyÃªn mÃ´n lÃªn Há»‡ thá»‘ng tuyá»ƒn sinh Ä‘Ã o táº¡o.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCourses.map(course => {
                  const teacherUser = store.users.find(u => u.id === course.teacherId) || { name: "Giáº£ng viÃªn" };
                  return (
                    <div key={course.id} className="p-4 bg-white/3 border border-white/5 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono text-cyan-400 font-bold uppercase">{course.category}</span>
                          <span className="text-white/40">{teacherUser.name}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">{course.title}</h4>
                        <p className="text-xs text-white/60 line-clamp-2">{course.description}</p>
                      </div>

                      <div className="flex gap-2 justify-end text-xs pt-4 border-t border-white/5 mt-4">
                        <button
                          onClick={() => handleStartRejectCourse(course.id)}
                          className="px-3.5 py-1.5 text-red-400 hover:bg-red-500/10 rounded-xl transition text-[11px]"
                        >
                          Tráº£ vá» yÃªu cáº§u
                        </button>
                        <button
                          onClick={() => handleApproveCourse(course.id)}
                          className="px-4.5 py-1.5 bg-white text-indigo-950 font-bold rounded-xl hover:bg-indigo-50 transition text-[11px]"
                        >
                          PhÃª duyá»‡t láº­p tá»©c
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pendingCourses.length === 0 && (
                  <div className="col-span-2 py-16 text-center text-white/30 text-xs">
                    Sáº¡ch tá»‡p há»“ tuyá»ƒn sinh! KhÃ´ng cÃ³ bÃ i yÃªu cáº§u phÃª duyá»‡t má»Ÿ há»c pháº§n nÃ o Ä‘ang treo.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXISTING USER ACCESS CONTROLS REGISTRY */}
          {activeSubTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Interactive User Directory & Access Controls</h3>
                  <p className="text-xs text-white/50">GiÃ¡m sÃ¡t tÃ i khoáº£n phÃ¢n há»‡ trá»±c quan.</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="TÃ¬m theo tÃªn, email..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="px-3 py-1.5 bg-black/25 text-white placeholder-white/30 border border-white/10 rounded-xl focus:outline-none"
                  />

                  <select
                    value={filterRole}
                    onChange={(e) => { setFilterRole(e.target.value); setUserPage(1); }}
                    className="p-1.5 bg-black/25 text-white/85 border border-white/10 rounded-xl"
                  >
                    <option value="all" className="bg-slate-900">Má»i vai trÃ²</option>
                    <option value="student" className="bg-slate-900">Sinh ViÃªn</option>
                    <option value="teacher" className="bg-slate-900">GiÃ¡o ViÃªn</option>
                    <option value="admin" className="bg-slate-900">Quáº£n Trá»‹ ViÃªn</option>
                    <option value="finance" className="bg-slate-900">Káº¿ ToÃ¡n</option>
                    <option value="academic_admin" className="bg-slate-900">ChuyÃªn viÃªn Há»c Vá»¥</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "student", label: "Sinh ViÃªn" },
                  { id: "teacher", label: "Giáº£ng ViÃªn" },
                  { id: "other", label: "Chá»©c NÄƒng KhÃ¡c" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setUserDirTab(tab.id as "student" | "teacher" | "other"); setUserPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${userDirTab === tab.id ? "bg-indigo-600 text-white border-indigo-400" : "bg-white/5 text-white/60 border-white/10 hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white/3 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/2 text-[10px] uppercase text-white/50">
                        <th className="py-2.5 px-3">Há» vÃ  TÃªn</th>
                        <th className="py-2.5 px-3">Email cÃ¡ nhÃ¢n</th>
                        {userDirTab === "student" && <th className="py-2.5 px-3">Há»“ sÆ¡ há»c vá»¥</th>}
                        <th className="py-2.5 px-3">Quyá»n háº¡n</th>
                        <th className="py-2.5 px-3">Tráº¡ng thÃ¡i khÃ³a</th>
                        <th className="py-2.5 px-3 text-right">KhÃ³a/Má»Ÿ KhÃ³a</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedUsers.map(usr => {
                        const profile = store.studentProfiles?.find(p => p.userId === usr.id);
                        const program = store.programs?.find(p => p.id === profile?.programId);
                        return (
                          <tr key={usr.id} className="hover:bg-white/2 transition">
                            <td className="py-3 px-3 font-semibold text-white">{usr.name}</td>
                            <td className="py-3 px-3 font-mono text-white/60">{usr.email}</td>
                            {userDirTab === "student" && (
                              <td className="py-3 px-3 text-white/70">
                                <div className="font-mono text-indigo-300">{profile?.studentCode || "ChÆ°a cÃ³ mÃ£"}</div>
                                <div className="text-[10px] text-white/40">{program?.name || profile?.programId || "ChÆ°a gÃ¡n ngÃ nh"} Â· GPA {profile?.gpa ?? 0}</div>
                              </td>
                            )}
                            <td className="py-3 px-3">
                              <select
                                value={usr.role}
                                onChange={(e) => handleUpdateUserRole(usr.id, e.target.value as User["role"])}
                                disabled={usr.id === currentUser.id}
                                className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-200 disabled:opacity-50"
                              >
                                <option value="student" className="bg-slate-900">Sinh viÃªn</option>
                                <option value="teacher" className="bg-slate-900">Giáº£ng viÃªn</option>
                                <option value="admin" className="bg-slate-900">Admin</option>
                                <option value="finance" className="bg-slate-900">TÃ i chÃ­nh</option>
                                <option value="academic_admin" className="bg-slate-900">Há»c vá»¥</option>
                                <option value="le_tan" className="bg-slate-900">Lá»… tÃ¢n</option>
                                <option value="advisor" className="bg-slate-900">Cá»‘ váº¥n</option>
                              </select>
                            </td>
                            <td className="py-3 px-3">
                              {usr.isActive ? (
                                <span className="text-emerald-400 font-bold text-[10.5px]">Äang hoáº¡t Ä‘á»™ng</span>
                              ) : (
                                <span className="text-red-400 font-bold text-[10.5px]">Äang khÃ³a</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {usr.id !== currentUser.id ? (
                                <button
                                  onClick={() => handleToggleUserStatus(usr.id)}
                                  className={`px-2 py-1 rounded transition text-[10.5px] cursor-pointer ${usr.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/15" : "bg-emerald-500/10 text-emerald-400"}`}
                                >
                                  {usr.isActive ? "KhÃ³a" : "KÃ­ch hoáº¡t"}
                                </button>
                              ) : (
                                <span className="text-white/30 text-[10.5px]">TÃ i khoáº£n hiá»‡n hÃ nh</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedUsers.length === 0 && (
                        <tr>
                          <td colSpan={userDirTab === "student" ? 6 : 5} className="py-10 text-center text-white/35">
                            KhÃ´ng cÃ³ tÃ i khoáº£n phÃ¹ há»£p trong thÆ° má»¥c nÃ y.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginations */}
              {pageCount > 1 && (
                <div className="flex justify-between items-center text-xs">
                  <button
                    onClick={() => setUserPage(p => Math.max(p - 1, 1))}
                    disabled={userPage === 1}
                    className="p-1 px-2 border border-white/10 rounded hover:bg-white/5 disabled:opacity-40"
                  >
                    TrÆ°á»›c
                  </button>
                  <span className="text-white/50 text-[11px]">Trang {userPage} / {pageCount}</span>
                  <button
                    onClick={() => setUserPage(p => Math.min(p + 1, pageCount))}
                    disabled={userPage === pageCount}
                    className="p-1 px-2 border border-white/10 rounded hover:bg-white/5 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}

            </div>
          )}

          {/* SYSTEM SECURITY COMPLIANCE AUDIT LOGS */}
          {activeSubTab === "audit" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Nháº­t kÃ½ Há»‡ thá»‘ng & Access Audits (Infrastructure Logs)</h3>
                <p className="text-xs text-white/50">Nháº­t kÃ½ theo dÃµi cÃ¡c bÃºt toÃ¡n an ninh, sá»­a Ä‘á»•i káº¿t cáº¥u Ä‘iá»ƒm sá»‘, há»c báº¡ chÃ­nh xÃ¡c theo thá»i gian thá»±c.</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-[10.5px] leading-relaxed max-h-96 overflow-y-auto space-y-2 text-white/90">
                {store.auditLogs.map((log, i) => (
                  <div key={log.id || i} className="border-b border-white/5 pb-2">
                    <span className="text-indigo-400">[{log.createdAt.slice(11, 19)}]</span>{" "}
                    <span className="text-cyan-300 font-bold">{log.action.toUpperCase()}</span>{" "}
                    <span className="text-slate-400">by:</span> <span className="text-emerald-400 font-bold">{log.userId}</span>{" "}
                    <span className="text-slate-400">target:</span> <span className="text-yellow-400">{log.target}</span> --{" "}
                    <span className="text-white/80">{log.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* USER REGISTRATION POPUP MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3 uppercase tracking-wider">
              Khá»Ÿi táº¡o ngÆ°á»i dÃ¹ng há»‡ thá»‘ng má»›i
            </h3>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-white/60">Há» vÃ  TÃªn</label>
                <input
                  type="text"
                  required
                  placeholder="VÃ­ dá»¥: Gavin Belson"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60">Äá»‹a chá»‰ Email</label>
                <input
                  type="email"
                  required
                  placeholder="VÃ­ dá»¥: gavin@hooli.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60">Máº­t kháº©u ban Ä‘áº§u</label>
                <input
                  type="password"
                  required
                  placeholder="Tá»‘i thiá»ƒu 6 kÃ½ tá»± báº£o máº­t"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60">PhÃ¢n há»‡ Quyá»n</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                >
                  <option value="student" className="bg-slate-900">Sinh ViÃªn (Student)</option>
                  <option value="teacher" className="bg-slate-900">Giáº£ng ViÃªn (Teacher)</option>
                  <option value="admin" className="bg-slate-900">Quáº£n Trá»‹ ViÃªn (Admin)</option>
                  <option value="finance" className="bg-slate-900">CÃ¡n bá»™ Káº¿ toÃ¡n (Ke toan)</option>
                  <option value="academic_admin" className="bg-slate-900">Quáº£n LÃ½ Há»c Vá»¥ (Há»c vá»¥)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-transparent text-white/50 hover:text-white transition cursor-pointer"
                >
                  Bá» qua
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Táº¡o tÃ i khoáº£n
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL CHAT BOX */}
      {rejectingCourseId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setRejectingCourseId(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3 uppercase">
              Tráº£ láº¡i há»“ sÆ¡ Ä‘Äƒng lÃ½ giáº£ng dáº¡y
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmRejectCourse(); }} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-white/60">GÃ³p Ã½ lÃ½ do tráº£ vá» Ä‘Ã­nh kÃ¨m:</label>
                <textarea
                  required
                  placeholder="VÃ­ dá»¥: Äá» cÆ°Æ¡ng chÆ°Æ¡ng 3 chÆ°a Ä‘Ã­nh kÃ¨m bÃ i giáº£ng lÃ½ thuyáº¿t..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white placeholder-white/20 border border-white/10 rounded-xl focus:outline-none h-24"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingCourseId(null)}
                  className="px-4 py-2 bg-transparent text-white/50 hover:text-white transition cursor-pointer"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-red-600 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  XÃ¡c nháº­n tráº£ vá»
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MULTIPLE USERS REGISTRY CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => { setShowImportModal(false); setImportMessage(null); }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/50 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 border-b border-white/10 pb-3 uppercase tracking-wider">
              Nháº­p Ä‘á»“ng loáº¡t ngÆ°á»i dÃ¹ng tá»« CSV
            </h3>

            {importMessage && (
              <div className={`mb-4 rounded-xl p-3 flex items-center gap-2 text-xs border ${
                importMessage.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400 animate-shake"
              }`}>
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>{importMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleImportCSVSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <p className="text-[10.5px] text-white/45 leading-relaxed">
                  Nháº­p dÃ²ng giÃ¡ trá»‹ ngÄƒn cÃ¡ch bá»Ÿi dáº¥u pháº©y. Cá»™t Ä‘á»‹nh dáº¡ng: <code className="text-indigo-400 font-bold">name, email, role</code>. Máº­t kháº©u máº·c Ä‘á»‹nh sinh tá»± Ä‘á»™ng lÃ  <code className="text-cyan-400 font-bold">password123</code>.
                </p>
                <textarea
                  required
                  placeholder="name, email, role&#10;Gavin Belson, gavin@hooli.com, student&#10;Laurie Bream, laurie@raviga.com, teacher"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white font-mono placeholder-white/20 border border-white/10 rounded-xl focus:outline-none h-36 mt-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportMessage(null); }}
                  className="px-4 py-2 bg-transparent text-white/50 hover:text-white transition cursor-pointer"
                >
                  Bá» qua
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-white text-indigo-950 font-bold rounded-xl transition cursor-pointer"
                >
                  XÃ¡c nháº­n táº£i tá»‡p lÃªn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
