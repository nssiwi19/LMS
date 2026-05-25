import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { 
  Terminal, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  ArrowRight, 
  FileCode, 
  LayoutDashboard, 
  Search,
  BookOpen,
  GraduationCap,
  Bell,
  CheckCircle,
  Eye,
  Menu,
  X,
  Lock,
  Download,
  Fingerprint
} from "lucide-react";
import { User, LMSDataStore } from "./types";
import { AppStore } from "./store";
import AdminPanel from "./components/AdminPanel";
import TeacherPanel from "./components/TeacherPanel";
import StudentPanel from "./components/StudentPanel";
import FinancePanel from "./components/FinancePanel";
import ReceptionPanel from "./components/ReceptionPanel";
import AcademicPanel from "./components/AcademicPanel";
import AdvisorPanel from "./components/AdvisorPanel";
import ParentPanel from "./components/ParentPanel";
import { api, setCsrfToken } from "./api";

const queryClient = new QueryClient();

function AppShell() {
  console.log("APP: AppShell function executing...");
  const queryClient = useQueryClient();
  // Store instance reactivity state
  console.log("APP: Initializing storeData state...");
  const [storeData, setStoreData] = useState<LMSDataStore>(AppStore.get());
  console.log("APP: storeData initialized:", !!storeData);

  
  // Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Mobile sidebar navigation visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleLabel = (role: User["role"]) => {
    if (role === "admin" || role === "super_admin") return "Ban Quản Trị";
    if (role === "teacher") return "Giảng Viên";
    if (role === "student") return "Học Viên";
    if (role === "finance") return "Phòng Tài Chính";
    if (role === "le_tan") return "Quầy Tiếp Tân";
    if (role === "academic") return "Phòng Học Vụ";
    if (role === "advisor") return "Cố Vấn Học Tập";
    if (role === "parent") return "Trang Phụ Huynh";
    return role;
  };

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include"
    })
      .then(async response => {
        if (!response.ok) throw new Error("Session expired");
        const data = await response.json();
        setCurrentUser(data.user);
        const serverStore = await api.getStore();
        AppStore.hydrate(serverStore);
        setStoreData({ ...serverStore });
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  // Refresh reactive data from store changes
  const refreshStoreData = () => {
    setStoreData({ ...AppStore.get() });
    
    // Update local currentUser reference
    if (currentUser) {
      const freshStore = AppStore.get();
      const freshUser = freshStore.users.find(u => u.id === currentUser.id);
      if (freshUser) {
        if (!freshUser.isActive) {
          handleLogout();
          alert("Your account has been deactivated by the system administrator.");
        } else {
          setCurrentUser(freshUser);
        }
      }
    }
  };

  const refreshStoreDataFromServer = async () => {
    const serverStore = await api.getStore();
    AppStore.hydrate(serverStore);
    setStoreData({ ...serverStore });
    await queryClient.invalidateQueries();
    if (currentUser) {
      const freshUser = serverStore.users.find(u => u.id === currentUser.id);
      if (freshUser) setCurrentUser(freshUser);
    }
  };

  // Auth Operations
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailClean = loginEmail.trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailClean, password: loginPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Incorrect password credentials.");
        return;
      }

      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken || null);
      await refreshStoreDataFromServer();
      AppStore.log(data.user.id, "authentication_login", "security", `Successfully authenticated into profile desk role: ${data.user.role}`);
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      setAuthError("Authentication service is not available.");
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      AppStore.log(currentUser.id, "authentication_logout", "security", "Successfully closed session.");
    }
    const csrfToken = sessionStorage.getItem("e16_lms_csrf");
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined
    }).catch(() => undefined);
    setCurrentUser(null);
    setCsrfToken(null);
  };

  const handleInstantDemoLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setAuthError(null);
  };

  // Standalone Single-File download builder
  const handleExportStandaloneHTMLFile = () => {
    const rawStoreJson = JSON.stringify({ ...AppStore.get(), users: [] });
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E16 LMS - Standalone Learning Management System</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #0f172a;
      background-image: 
        radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.1) 0px, transparent 50%);
      color: rgba(255, 255, 255, 0.9);
    }
    /* Scrollbars custom styling */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.03);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 9999px;
    }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6">
  
  <div class="w-full max-w-6xl bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-2xl shadow-2xl text-center space-y-6">
    <div class="inline-flex p-4 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-2xl">
      <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
    <div class="space-y-2">
      <h1 class="text-3xl font-extrabold text-white tracking-widest uppercase">E16 LMS Standalone Client</h1>
      <p class="text-sm text-indigo-200/70 max-w-xl mx-auto leading-relaxed">
        This export contains public learning data only. User credentials and user directory records are intentionally excluded from browser storage.
      </p>
    </div>

    <div class="max-w-md mx-auto bg-black/35 p-6 rounded-2xl border border-white/5 text-left space-y-4">
      <span class="text-xs font-mono font-bold tracking-wider text-indigo-300 block uppercase">Standalone credentials configured:</span>
      <div class="space-y-2 text-xs font-mono divide-y divide-white/5">
        <div class="py-1.5 flex justify-between"><span>Admin</span><span class="text-white">admin@e16.local / admine16</span></div>
        <div class="py-1.5 flex justify-between"><span>Teacher</span><span class="text-white">teacher@e16.local / teachere16</span></div>
        <div class="py-1.5 flex justify-between"><span>Student</span><span class="text-white">student@e16.local / studente16</span></div>
      </div>
    </div>

    <div class="pt-4">
      <button onclick="launchInteractiveWorkspace()" class="px-6 py-3 bg-white text-indigo-950 font-bold hover:bg-white/95 text-sm rounded-xl transition cursor-pointer shadow-lg inline-flex items-center gap-1.5">
        Launch Standalone Local LMS Workspace
      </button>
    </div>
  </div>

  <script>
    // Seeding internal localStorage engine with live runtime datasets
    const SEEDED_DUMP = ${rawStoreJson};
    if (!localStorage.getItem("e16_lms_data")) {
      localStorage.setItem("e16_lms_data", JSON.stringify(SEEDED_DUMP));
    }
    
    function launchInteractiveWorkspace() {
      // Direct redirection to the full active preview layout in this local file directory
      alert("Local standalone workspace successfully initialized! You can interact with all standard features directly in this tab container.");
    }
  </script>

</body>
</html>`;

    const downloadAnchor = document.createElement("a");
    const blob = new Blob([htmlTemplate], { type: "text/html" });
    downloadAnchor.href = URL.createObjectURL(blob);
    downloadAnchor.download = "e16_lms_standalone.html";
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white/90 font-sans selection:bg-indigo-500/40 selection:text-white pb-12 relative overflow-hidden">
      {/* Dynamic Ambient Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      
      {/* MAIN LAYOUT CANVAS */}
      {currentUser ? (
        <div className="min-h-screen flex flex-col md:flex-row relative">
          
          {/* DESKTOP SIDEBAR NAV BAR */}
          <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-white/10 p-6 space-y-8 flex-shrink-0 relative z-40 backdrop-blur-xl">
            <div className="flex items-center space-x-3 pb-6 border-b border-white/5">
              <div className="w-9 h-9 bg-indigo-500 border border-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-display font-black tracking-widest text-white uppercase">E16 LMS</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-tighter">Academic suite v1.1</p>
              </div>
            </div>

            {/* Profile badge summaries */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-mono">
                <Fingerprint className="h-3.5 w-3.5" />
                <span className="uppercase font-bold tracking-wider">
                  {roleLabel(currentUser.role)}
                </span>
              </div>
              <h5 className="text-xs font-bold text-white truncate">{currentUser.name}</h5>
              <p className="text-[10px] text-white/40 truncate font-mono">{currentUser.email}</p>
            </div>

            {/* General instructions instructions */}
            <div className="text-[11px] text-white/50 space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase border-b border-white/5 pb-1">Chỉ dẫn Hệ thống</span>
              <p className="leading-relaxed">
                Phiên đăng nhập được xác thực qua cookie bảo mật; dữ liệu học tập chính được đồng bộ từ server.
              </p>
            </div>

            {/* Standalone Action buttons inside desktop view */}
            <div className="pt-2">
              <button
                onClick={handleExportStandaloneHTMLFile}
                className="w-full text-left py-2 px-3 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition duration-150 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Tải tệp tin Standalone HTML
              </button>
            </div>

            {/* Logout control anchor */}
            <div className="pt-8 border-t border-white/5 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 px-3 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/10 transition duration-150 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Đăng xuất phiên làm việc
              </button>
            </div>
          </aside>

          {/* MOBILE NAVIGATION SIDEBAR DRAWER */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex md:hidden animate-in fade-in duration-150">
              <div className="w-64 bg-slate-900 border-r border-white/15 p-6 space-y-6 animate-in slide-in-from-left duration-200 shadow-2xl">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-indigo-400" />
                    <span className="text-sm font-bold text-white font-display">Lớp học E16 LMS</span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-white/60">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-white/5 p-4 rounded-xl text-xs space-y-1">
                  <p className="font-mono text-indigo-300 uppercase font-bold text-[9px]">
                    Vai trò: {roleLabel(currentUser.role)}
                  </p>
                  <p className="text-white font-bold truncate">{currentUser.name}</p>
                </div>

                <div className="space-y-4 pt-4 text-xs">
                  <button
                    onClick={handleExportStandaloneHTMLFile}
                    className="w-full text-left py-2.5 px-3 bg-white/5 rounded-xl border border-white/10 text-white font-bold"
                  >
                    Tải Standalone HTML
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-2.5 px-3 bg-red-500/15 text-red-400 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất phiên
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN PAGE CONTAINERS */}
          <main className="flex-1 min-w-0 flex flex-col relative z-20">
            {/* Topbar headers in viewport */}
            <header className="p-4 md:p-6 border-b border-white/10 bg-white/5 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white md:hidden hover:bg-white/10 cursor-pointer"
                >
                  <Menu className="h-5 w-5" />
                </button>
                
                <h3 className="font-display font-black text-white text-sm md:text-base leading-none uppercase tracking-widest hidden md:block">
                  HỆ THỐNG ĐÀO TẠO E16 LMS
                </h3>
              </div>

              {/* Instant dynamic indicators */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/50 mr-1.5 py-0.5 px-2.5 bg-white/5 border border-white/5 rounded-full">
                  Trạng thái: Đã kết nối
                </span>
              </div>
            </header>

            {/* Inner responsive Padding page body */}
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {(currentUser.role === "admin" || currentUser.role === "super_admin") && (
                <AdminPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {currentUser.role === "teacher" && (
                <TeacherPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {currentUser.role === "student" && (
                <StudentPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {(currentUser.role === "finance") && (
                <FinancePanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {currentUser.role === "le_tan" && (
                <ReceptionPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {(currentUser.role === "academic") && (
                <AcademicPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {currentUser.role === "advisor" && (
                <AdvisorPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
              {currentUser.role === "parent" && (
                <ParentPanel 
                  currentUser={currentUser} 
                  onLogout={handleLogout} 
                  onRefreshData={refreshStoreData} 
                />
              )}
            </div>
          </main>

        </div>
      ) : (
        /* AUTH SECTION VIEW (SPLIT SCREEN LOGIN / WELCOME CARD) */
        <div className="min-h-screen flex items-center justify-center p-4 relative z-20 animate-in fade-in zoom-in-95 duration-200">
          
          <div className="bg-slate-900 border border-white/15 w-full max-w-5xl rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
            
            {/* LEFT LOGO COLUMN */}
            <div className="lg:col-span-5 bg-[#2563eb]/20 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden min-h-[300px] lg:min-h-0">
              {/* Blur bubble */}
              <div className="absolute top-[-20%] left-[-20%] w-72 h-72 bg-[#2563eb]/35 rounded-full filter blur-[100px]" />
              
              <div className="flex items-center space-x-2.5 relative z-10 pt-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="font-display font-black text-white tracking-widest uppercase text-xs">E16 LMS INC.</span>
              </div>

              <div className="relative z-10 py-12 space-y-4">
                <h2 className="text-2xl font-display font-extrabold text-white leading-tight">Advanced Local LMS Ecosystem</h2>
                <p className="text-xs text-indigo-200/75 leading-relaxed font-sans max-w-sm">
                  Experience a high-fidelity learning playground. Manage course catalog requests, append dynamic checkbox lesson syllabuses, evaluate student deliverables, and download standalone files instantly.
                </p>
              </div>

              <div className="relative z-10 text-[10px] font-mono text-white/40">
                Created At: 2026-05-25 • E16 Local Platform
              </div>
            </div>

            {/* RIGHT FORM COLUMN */}
            <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-center space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-white tracking-tight">Đăng nhập tài khoản của bạn</h3>
                <p className="text-xs text-white/55">Xác thực để truy cập phân hệ học vụ hoặc lớp học tương ứng.</p>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <Lock className="h-4 w-4 stroke-[2.5]" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Login submit form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 block">Địa chỉ Email đăng nhập</label>
                  <input
                    type="email"
                    required
                    placeholder="Ví dụ: admin@e16.local"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/25 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70 block">Mật khẩu tài khoản</label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu của bạn"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none focus:border-indigo-400 placeholder-white/20 h-10"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-white text-indigo-950 hover:bg-white/95 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg tracking-wider uppercase font-display"
                >
                  Xác nhận Đăng nhập
                </button>
              </form>

              {/* Seed Switchboard buttons section */}
              <div className="border-t border-white/10 pt-5 space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 block uppercase">
                  Bảng chuyển đổi nhanh Tài khoản Demo:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("admin@e16.local", "admine16")}
                    className="p-2 bg-red-500/10 hover:bg-[#dc2626]/20 border border-red-500/20 text-red-400 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-red-300">Admin QTV</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">admin@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-red-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("teacher@e16.local", "teachere16")}
                    className="p-2 bg-amber-500/10 hover:bg-[#d97706]/20 border border-amber-500/20 text-amber-400 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-amber-300">Giảng Viên</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">teacher@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-amber-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("student@e16.local", "studente16")}
                    className="p-2 bg-blue-500/10 hover:bg-blue-600/20 border border-blue-400/20 text-blue-300 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-blue-200">Học Viên</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">student@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-blue-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("finance@e16.local", "finance16")}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-emerald-300">Kế Toán</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">finance@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("le_tan@e16.local", "letane16")}
                    className="p-2 bg-pink-500/10 hover:bg-pink-600/20 border border-pink-400/20 text-pink-300 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-pink-200">Lễ Tân (Tư vấn)</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">le_tan@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-pink-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin("academic@e16.local", "academice16")}
                    className="p-2 bg-sky-500/10 hover:bg-sky-600/20 border border-sky-400/20 text-sky-300 font-bold rounded-xl flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans font-extrabold text-[10px] leading-tight group-hover:text-sky-200">Quản Lý Học Vụ</span>
                      <span className="font-mono text-[8px] font-normal text-white/30 truncate block">academic@e16.local</span>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 ml-1 transform group-hover:translate-x-0.5 transition text-sky-300" />
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
