import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Building, 
  BookOpen, 
  Plus, 
  Trash, 
  CheckCircle, 
  ChevronRight, 
  Layers, 
  GraduationCap 
} from "lucide-react";
import { LMSDataStore, AcademicYear, Semester, Department, Program, ProgramCourse, User, Course } from "../types";
import { AppStore } from "../store";
import { generateId } from "../utils";

interface AcademicManagerProps {
  store: LMSDataStore;
  currentUser: User;
  onRefreshData: () => void;
  triggerToast: (msg: string) => void;
  initialTab?: "years" | "semesters" | "departments" | "programs";
}

export default function AcademicManager({ store, currentUser, onRefreshData, triggerToast, initialTab }: AcademicManagerProps) {
  const [activeTab, setActiveTab] = useState<"years" | "semesters" | "departments" | "programs">(initialTab ?? "years");

  // Sync activeTab when initialTab prop changes (sidebar click)
  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Selection for Program Course Curriculum
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Forms states
  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const [semYearId, setSemYearId] = useState("");
  const [semName, setSemName] = useState("");
  const [semType, setSemType] = useState<"fall" | "spring" | "summer">("fall");
  const [semStart, setSemStart] = useState("");
  const [semEnd, setSemEnd] = useState("");
  const [semRegOpen, setSemRegOpen] = useState("");
  const [semRegClose, setSemRegClose] = useState("");

  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptHeadId, setDeptHeadId] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  const [progDeptId, setProgDeptId] = useState("");
  const [progName, setProgName] = useState("");
  const [progCode, setProgCode] = useState("");
  const [progType, setProgType] = useState<"certificate" | "diploma" | "degree">("degree");
  const [progCredits, setProgCredits] = useState<number>(120);
  const [progDesc, setProgDesc] = useState("");

  // Curriculum Form states
  const [currCourseId, setCurrCourseId] = useState("");
  const [currCredits, setCurrCredits] = useState<number>(3);
  const [currRequired, setCurrRequired] = useState(true);
  const [currSemester, setCurrSemester] = useState<number>(1);
  const [academicSearch, setAcademicSearch] = useState("");

  // Sorting states
  const [yearsSortField, setYearsSortField] = useState<string>("name");
  const [yearsSortOrder, setYearsSortOrder] = useState<"asc" | "desc">("asc");

  const [semsSortField, setSemsSortField] = useState<string>("name");
  const [semsSortOrder, setSemsSortOrder] = useState<"asc" | "desc">("asc");

  const [deptsSortField, setDeptsSortField] = useState<string>("code");
  const [deptsSortOrder, setDeptsSortOrder] = useState<"asc" | "desc">("asc");

  const [currSortField, setCurrSortField] = useState<string>("semester");
  const [currSortOrder, setCurrSortOrder] = useState<"asc" | "desc">("asc");

  const handleYearsSort = (field: string) => {
    if (yearsSortField === field) {
      setYearsSortOrder(yearsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setYearsSortField(field);
      setYearsSortOrder("asc");
    }
  };

  const handleSemsSort = (field: string) => {
    if (semsSortField === field) {
      setSemsSortOrder(semsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSemsSortField(field);
      setSemsSortOrder("asc");
    }
  };

  const handleDeptsSort = (field: string) => {
    if (deptsSortField === field) {
      setDeptsSortOrder(deptsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setDeptsSortField(field);
      setDeptsSortOrder("asc");
    }
  };

  const handleCurrSort = (field: string) => {
    if (currSortField === field) {
      setCurrSortOrder(currSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCurrSortField(field);
      setCurrSortOrder("asc");
    }
  };

  // Filter lists safely
  const teachers = store.users.filter(u => u.role === "teacher");
  const years = store.academicYears || [];
  const semesters = store.semesters || [];
  const departments = store.departments || [];
  const programs = store.programs || [];
  const programCourses = store.programCourses || [];
  const courses = store.courses || [];

  // Year Actions
  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim() || !yearStart || !yearEnd) {
      triggerToast("Vui lòng điền đầy đủ thông tin năm học.");
      return;
    }
    const storeData = AppStore.get();
    const newYear: AcademicYear = {
      id: generateId("ay"),
      name: yearName.trim(),
      startDate: yearStart,
      endDate: yearEnd,
      isCurrent: years.length === 0 // Make current if it's the first one
    };
    storeData.academicYears.push(newYear);
    AppStore.log(currentUser.id, "add_academic_year", newYear.name, "Khởi tạo năm học mới.");
    AppStore.save(storeData);
    onRefreshData();
    triggerToast(`Đã thêm năm học: ${newYear.name}`);
    setYearName("");
    setYearStart("");
    setYearEnd("");
  };

  const handleSetCurrentYear = (id: string) => {
    const storeData = AppStore.get();
    storeData.academicYears = storeData.academicYears.map(y => ({
      ...y,
      isCurrent: y.id === id
    }));
    const chosen = storeData.academicYears.find(y => y.id === id);
    AppStore.log(currentUser.id, "set_current_academic_year", chosen?.name || id, "Thay đổi năm học hiện đại của SIS.");
    AppStore.save(storeData);
    onRefreshData();
    triggerToast(`Đã chuyển đổi năm học hiện tại.`);
  };

  const handleDeleteYear = (id: string) => {
    const storeData = AppStore.get();
    const linkedSems = storeData.semesters.filter(s => s.academicYearId === id);
    if (linkedSems.length > 0) {
      triggerToast("Không thể xóa năm học vì có các học kỳ đang ràng buộc.");
      return;
    }
    storeData.academicYears = storeData.academicYears.filter(y => y.id !== id);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("Đã xóa năm học thành công.");
  };

  // Semester Actions
  const handleAddSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semYearId || !semName.trim() || !semStart || !semEnd || !semRegOpen || !semRegClose) {
      triggerToast("Vui lòng nhập đầy đủ thông tin học kỳ.");
      return;
    }
    const storeData = AppStore.get();
    const newSem: Semester = {
      id: generateId("sem"),
      academicYearId: semYearId,
      name: semName.trim(),
      type: semType,
      startDate: semStart,
      endDate: semEnd,
      registrationOpen: semRegReg(semRegOpen),
      registrationClose: semRegReg(semRegClose)
    };
    function semRegReg(raw: string) { return raw; }

    storeData.semesters.push(newSem);
    AppStore.log(currentUser.id, "add_semester", newSem.name, "Liên kết học kỳ mới vào hệ thống.");
    AppStore.save(storeData);
    onRefreshData();
    triggerToast(`Đã lưu học kỳ: ${newSem.name}`);
    setSemName("");
    setSemStart("");
    setSemEnd("");
    setSemRegOpen("");
    setSemRegClose("");
  };

  const handleDeleteSemester = (id: string) => {
    const storeData = AppStore.get();
    storeData.semesters = storeData.semesters.filter(s => s.id !== id);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("Đã loại bỏ học kỳ khỏi danh sách.");
  };

  // Department Actions
  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim() || !deptHeadId) {
      triggerToast("Thông tin khoa chuyên môn không được bỏ trống.");
      return;
    }
    const storeData = AppStore.get();
    const newDept: Department = {
      id: generateId("dept"),
      name: deptName.trim(),
      code: deptCode.trim().toUpperCase(),
      headTeacherId: deptHeadId,
      description: deptDesc.trim()
    };
    storeData.departments.push(newDept);
    AppStore.log(currentUser.id, "add_department", newDept.name, `Đăng ký thành lập khoa chuyên môn code: ${newDept.code}`);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast(`Đã lập khoa: ${newDept.name}`);
    setDeptName("");
    setDeptCode("");
    setDeptHeadId("");
    setDeptDesc("");
  };

  // Program Actions
  const handleAddProg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progDeptId || !progName.trim() || !progCode.trim() || progCredits <= 0) {
      triggerToast("Vui lòng hợp lệ hóa thông tin chương trình.");
      return;
    }
    const storeData = AppStore.get();
    const newProg: Program = {
      id: generateId("prog"),
      departmentId: progDeptId,
      name: progName.trim(),
      code: progCode.trim().toUpperCase(),
      type: progType,
      totalCredits: Number(progCredits),
      description: progDesc.trim()
    };
    storeData.programs.push(newProg);
    AppStore.log(currentUser.id, "add_program", newProg.name, `Tạo hệ đào tạo ${newProg.type} ngành ${newProg.code}`);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast(`Đã tạo ngành đào tạo: ${newProg.name}`);
    setProgName("");
    setProgCode("");
    setProgDesc("");
  };

  // Curriculum Course Editor
  const handleAddCourseToCurriculum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;
    if (!currCourseId || currCredits <= 0 || currSemester <= 0) {
      triggerToast("Thông tin khung bài học học phần chưa hợp lệ.");
      return;
    }

    const storeData = AppStore.get();
    // Check duplicate
    const exists = storeData.programCourses.some(pc => pc.programId === selectedProgramId && pc.courseId === currCourseId);
    if (exists) {
      triggerToast("Học phần này đã nằm trong khung chương trình của ngành.");
      return;
    }

    const newProgCourse: ProgramCourse = {
      id: generateId("pc"),
      programId: selectedProgramId,
      courseId: currCourseId,
      credits: Number(currCredits),
      isRequired: currRequired,
      semester: Number(currSemester)
    };
    storeData.programCourses.push(newProgCourse);
    AppStore.log(currentUser.id, "add_program_course", `Curriculum ${selectedProgramId}`, `Liên kết học phần ${currCourseId} vào khung đào tạo.`);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("Học phần đã được ghim vào khung đào tạo thành công.");
    setCurrCourseId("");
  };

  const handleRemoveCourseFromCurriculum = (id: string) => {
    const storeData = AppStore.get();
    storeData.programCourses = storeData.programCourses.filter(pc => pc.id !== id);
    AppStore.save(storeData);
    onRefreshData();
    triggerToast("Đã rút học phần ra khỏi khung giảng dạy.");
  };

  const currentProgram = programs.find(p => p.id === selectedProgramId);
  const activeCurriculums = programCourses.filter(pc => pc.programId === selectedProgramId);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-white/10 pb-2 gap-4">
        <button
          onClick={() => { setActiveTab("years"); setSelectedProgramId(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "years" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <Calendar className="inline-block h-3.5 w-3.5 mr-1.5" /> Năm học
        </button>
        <button
          onClick={() => { setActiveTab("semesters"); setSelectedProgramId(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "semesters" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <Clock className="inline-block h-3.5 w-3.5 mr-1.5" /> Học kỳ
        </button>
        <button
          onClick={() => { setActiveTab("departments"); setSelectedProgramId(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "departments" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <Building className="inline-block h-3.5 w-3.5 mr-1.5" /> Khoa học vụ
        </button>
        <button
          onClick={() => { setActiveTab("programs"); }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === "programs" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <BookOpen className="inline-block h-3.5 w-3.5 mr-1.5" /> Khung đào tạo & Ngành
        </button>
      </div>

      {/* Reactive list search input */}
      {!selectedProgramId && (
        <div className="bg-white/3 border border-white/5 p-3 rounded-xl text-xs max-w-md">
          <input
            type="text"
            placeholder={`Tìm kiếm trong danh sách ${
              activeTab === "years" ? "năm học" :
              activeTab === "semesters" ? "học kỳ" :
              activeTab === "departments" ? "khoa" :
              "chương trình / ngành"
            }...`}
            value={academicSearch}
            onChange={(e) => setAcademicSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-black/25 text-white placeholder-white/30 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>
      )}

      {activeTab === "years" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách các năm học hiện hữu</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleYearsSort("name")}>
                      Tên năm học {yearsSortField === "name" ? (yearsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleYearsSort("startDate")}>
                      Bắt đầu {yearsSortField === "startDate" ? (yearsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleYearsSort("endDate")}>
                      Kết thúc {yearsSortField === "endDate" ? (yearsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleYearsSort("isCurrent")}>
                      Hiện tại {yearsSortField === "isCurrent" ? (yearsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...years].filter(y => y.name.toLowerCase().includes(academicSearch.toLowerCase())).sort((a, b) => {
                    let valA: any = a[yearsSortField as keyof AcademicYear];
                    let valB: any = b[yearsSortField as keyof AcademicYear];
                    if (valA === undefined || valA === null) return 1;
                    if (valB === undefined || valB === null) return -1;
                    if (typeof valA === "string" && typeof valB === "string") {
                      return yearsSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    if (typeof valA === "number" && typeof valB === "number") {
                      return yearsSortOrder === "asc" ? valA - valB : valB - valA;
                    }
                    if (typeof valA === "boolean" && typeof valB === "boolean") {
                      return yearsSortOrder === "asc" ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
                    }
                    return 0;
                  }).map(y => (
                    <tr key={y.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-semibold text-white">{y.name}</td>
                      <td className="py-3 px-3 text-white/70">{y.startDate}</td>
                      <td className="py-3 px-3 text-white/70">{y.endDate}</td>
                      <td className="py-3 px-3">
                        {y.isCurrent ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            Đang hoạt động
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetCurrentYear(y.id)}
                            className="bg-white/5 hover:bg-white/10 text-white/80 px-2 py-0.5 rounded text-[10px] transition cursor-pointer"
                          >
                            Thiết lập
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteYear(y.id)}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {years.filter(y => y.name.toLowerCase().includes(academicSearch.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/40 italic">Không tìm thấy năm học nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-white">Thêm năm học mới</h4>
            <form onSubmit={handleAddYear} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Tên năm học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 2024–2025"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Ngày bắt đầu</label>
                <input
                  type="date"
                  required
                  value={yearStart}
                  onChange={(e) => setYearStart(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Ngày kết thúc</label>
                <input
                  type="date"
                  required
                  value={yearEnd}
                  onChange={(e) => setYearEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-white/90 transition cursor-pointer"
              >
                Tạo năm học
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "semesters" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách học kỳ trong năm học</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleSemsSort("name")}>
                      Tên Học Kỳ {semsSortField === "name" ? (semsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleSemsSort("academicYearId")}>
                      Năm Học {semsSortField === "academicYearId" ? (semsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleSemsSort("type")}>
                      Kiểu {semsSortField === "type" ? (semsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleSemsSort("startDate")}>
                      Thời gian {semsSortField === "startDate" ? (semsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleSemsSort("registrationOpen")}>
                      Đăng ký môn {semsSortField === "registrationOpen" ? (semsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...semesters].filter(s => s.name.toLowerCase().includes(academicSearch.toLowerCase())).sort((a, b) => {
                    let valA: any = a[semsSortField as keyof Semester];
                    let valB: any = b[semsSortField as keyof Semester];
                    if (semsSortField === "academicYearId") {
                      const yearA = years.find(y => y.id === a.academicYearId)?.name || "";
                      const yearB = years.find(y => y.id === b.academicYearId)?.name || "";
                      valA = yearA;
                      valB = yearB;
                    }
                    if (valA === undefined || valA === null) return 1;
                    if (valB === undefined || valB === null) return -1;
                    if (typeof valA === "string" && typeof valB === "string") {
                      return semsSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    if (typeof valA === "number" && typeof valB === "number") {
                      return semsSortOrder === "asc" ? valA - valB : valB - valA;
                    }
                    return 0;
                  }).map(s => {
                    const linkedY = years.find(y => y.id === s.academicYearId);
                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                        <td className="py-3 px-3 text-white/60">{linkedY ? linkedY.name : "Không xác định"}</td>
                        <td className="py-3 px-3 uppercase text-cyan-400 font-mono text-[10px]">{s.type}</td>
                        <td className="py-3 px-3 text-white/70">
                          {s.startDate} đến {s.endDate}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-white/40">
                          Mở: {s.registrationOpen} <br /> Đóng: {s.registrationClose}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteSemester(s.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {semesters.filter(s => s.name.toLowerCase().includes(academicSearch.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/40 italic">Không tìm thấy học kỳ nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-white">Thêm học kỳ mới</h4>
            <form onSubmit={handleAddSemester} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Thuộc năm học</label>
                <select
                  value={semYearId}
                  onChange={(e) => setSemYearId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                >
                  <option value="">-- Chọn Năm học --</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id} className="bg-slate-900">{y.name} {y.isCurrent ? "(Hiện tại)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Tên học kỳ</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Spring 2025"
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Kiểu học kỳ</label>
                <select
                  value={semType}
                  onChange={(e) => setSemType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                >
                  <option value="fall" className="bg-slate-900">Fall (Thu)</option>
                  <option value="spring" className="bg-slate-900">Spring (Xuân)</option>
                  <option value="summer" className="bg-slate-900">Summer (Hè)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-white/60 font-medium">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={semStart}
                    onChange={(e) => setSemStart(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none text-[10px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/60 font-medium">Ngày bế giảng</label>
                  <input
                    type="date"
                    required
                    value={semEnd}
                    onChange={(e) => setSemEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none text-[10px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-white/60 font-medium">Mở đăng ký môn</label>
                  <input
                    type="date"
                    required
                    value={semRegOpen}
                    onChange={(e) => setSemRegOpen(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none text-[10px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/60 font-medium">Khóa đăng ký môn</label>
                  <input
                    type="date"
                    required
                    value={semRegClose}
                    onChange={(e) => setSemRegClose(e.target.value)}
                    className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none text-[10px]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-white/90 transition cursor-pointer"
              >
                Khởi tạo học kỳ
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách Khoa đào tạo chuyên môn</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleDeptsSort("code")}>
                      Mã Khoa {deptsSortField === "code" ? (deptsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleDeptsSort("name")}>
                      Tên Gọi {deptsSortField === "name" ? (deptsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition" onClick={() => handleDeptsSort("headTeacherId")}>
                      Trưởng khoa phụ trách {deptsSortField === "headTeacherId" ? (deptsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white transition" onClick={() => handleDeptsSort("progsCount")}>
                      Lượng Ngành {deptsSortField === "progsCount" ? (deptsSortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...departments].filter(d => d.name.toLowerCase().includes(academicSearch.toLowerCase()) || d.code.toLowerCase().includes(academicSearch.toLowerCase())).sort((a, b) => {
                    let valA: any = a[deptsSortField as keyof Department];
                    let valB: any = b[deptsSortField as keyof Department];
                    if (deptsSortField === "headTeacherId") {
                      const teacherA = teachers.find(t => t.id === a.headTeacherId)?.name || "";
                      const teacherB = teachers.find(t => t.id === b.headTeacherId)?.name || "";
                      valA = teacherA;
                      valB = teacherB;
                    } else if (deptsSortField === "progsCount") {
                      valA = programs.filter(p => p.departmentId === a.id).length;
                      valB = programs.filter(p => p.departmentId === b.id).length;
                    }
                    if (valA === undefined || valA === null) return 1;
                    if (valB === undefined || valB === null) return -1;
                    if (typeof valA === "string" && typeof valB === "string") {
                      return deptsSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    if (typeof valA === "number" && typeof valB === "number") {
                      return deptsSortOrder === "asc" ? valA - valB : valB - valA;
                    }
                    return 0;
                  }).map(d => {
                    const head = teachers.find(t => t.id === d.headTeacherId);
                    const progsCount = programs.filter(p => p.departmentId === d.id).length;
                    return (
                      <tr key={d.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400 uppercase">{d.code}</td>
                        <td className="py-3 px-3 font-semibold text-white">
                          <div className="font-bold">{d.name}</div>
                          <div className="text-[10px] text-white/40">{d.description || "Chưa có biểu tả chi tiết"}</div>
                        </td>
                        <td className="py-3 px-3 text-white/70">{head ? head.name : "Chưa bộ chỉ định"}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-white/80">{progsCount} ngành</td>
                      </tr>
                    );
                  })}
                  {departments.filter(d => d.name.toLowerCase().includes(academicSearch.toLowerCase()) || d.code.toLowerCase().includes(academicSearch.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-white/40 italic">Không tìm thấy khoa nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-white">Đăng ký khoa phòng mới</h4>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Mã khoa viết tắt</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: CS, CNTT"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Tên gọi của Khoa</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa Khoa học Máy tính"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Giảng viên/Trưởng khoa</label>
                <select
                  value={deptHeadId}
                  onChange={(e) => setDeptHeadId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none"
                >
                  <option value="">-- Chọn Giảng viên phụ trách --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900">{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-white/60 font-medium">Mô tả khái quát</label>
                <textarea
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Nhập mô trình bày về khoa..."
                  className="w-full px-3 py-2 bg-black/25 text-white border border-white/10 rounded-xl focus:outline-none h-16"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-white text-indigo-950 font-bold rounded-xl hover:bg-white/90 transition cursor-pointer"
              >
                Xác nhận lập khoa
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "programs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-white">Quản lý Ngành & Khung Đào tạo</h4>
            
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {programs.filter(p => p.name.toLowerCase().includes(academicSearch.toLowerCase()) || p.code.toLowerCase().includes(academicSearch.toLowerCase())).map(p => {
                const linkedDept = departments.find(d => d.id === p.departmentId);
                const isSelected = selectedProgramId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProgramId(p.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                      isSelected 
                        ? "bg-white/10 border-white/20 text-white shadow-md font-semibold" 
                        : "bg-white/2 border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[10px]">
                        {p.code}
                      </span>
                      <span className="capitalize text-[10px] text-white/50">{p.type} • {p.totalCredits} TC</span>
                    </div>
                    <div className="mt-1.5 font-bold leading-tight">{p.name}</div>
                    <div className="text-[10px] text-white/40 mt-1">{linkedDept ? linkedDept.name : ""}</div>
                  </div>
                );
              })}

              {programs.filter(p => p.name.toLowerCase().includes(academicSearch.toLowerCase()) || p.code.toLowerCase().includes(academicSearch.toLowerCase())).length === 0 && (
                <div className="py-12 text-center text-white/30 italic font-sans text-xs">Không tìm thấy ngành học nào.</div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <h5 className="text-xs font-bold text-white">Thêm chương trình đào tạo mới</h5>
              <form onSubmit={handleAddProg} className="space-y-2 text-[11px]">
                <div className="space-y-0.5">
                  <label className="text-white/60">Mã chương trình</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: SE, MKT, BA"
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-white/60">Tên chuyên ngành đào tạo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Software Engineering"
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-white/60">Cấp đào tạo</label>
                    <select
                      value={progType}
                      onChange={(e) => setProgType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                    >
                      <option value="degree" className="bg-slate-900">Cử nhân/Kỹ sư</option>
                      <option value="diploma" className="bg-slate-900">Cao đẳng</option>
                      <option value="certificate" className="bg-slate-900">Chứng chỉ</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-white/60">Số tín chỉ tối thiểu</label>
                    <input
                      type="number"
                      required
                      value={progCredits}
                      onChange={(e) => setProgCredits(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-white/60">Trực thuộc Khoa</label>
                  <select
                    value={progDeptId}
                    onChange={(e) => setProgDeptId(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                  >
                    <option value="">-- Chọn Khoa --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-white text-indigo-950 font-bold rounded-lg hover:bg-white/95 transition cursor-pointer text-xs mt-2"
                >
                  Khởi tạo Ngành học
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            {selectedProgramId ? (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">Khung chương trình đào tạo: {currentProgram?.name}</h3>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Thiết lập danh sách và thời điểm bố trí các môn học cấu thành chương trình chung.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Học phần đào tạo cấu trúc</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-white/40 text-[10.5px]">
                            <th className="py-2 px-1 cursor-pointer select-none hover:text-white transition" onClick={() => handleCurrSort("courseId")}>
                              Môn học {currSortField === "courseId" ? (currSortOrder === "asc" ? "▲" : "▼") : "↕"}
                            </th>
                            <th className="py-2 px-1 text-center cursor-pointer select-none hover:text-white transition" onClick={() => handleCurrSort("credits")}>
                              Tín chỉ {currSortField === "credits" ? (currSortOrder === "asc" ? "▲" : "▼") : "↕"}
                            </th>
                            <th className="py-2 px-1 cursor-pointer select-none hover:text-white transition" onClick={() => handleCurrSort("isRequired")}>
                              Loại môn {currSortField === "isRequired" ? (currSortOrder === "asc" ? "▲" : "▼") : "↕"}
                            </th>
                            <th className="py-2 px-1 text-center cursor-pointer select-none hover:text-white transition" onClick={() => handleCurrSort("semester")}>
                              Học kỳ sắp xếp {currSortField === "semester" ? (currSortOrder === "asc" ? "▲" : "▼") : "↕"}
                            </th>
                            <th className="py-2 px-1 text-right">Rút môn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...activeCurriculums].sort((a, b) => {
                            let valA: any = a[currSortField as keyof ProgramCourse];
                            let valB: any = b[currSortField as keyof ProgramCourse];
                            if (currSortField === "courseId") {
                              const courseA = courses.find(c => c.id === a.courseId)?.title || "";
                              const courseB = courses.find(c => c.id === b.courseId)?.title || "";
                              valA = courseA;
                              valB = courseB;
                            }
                            if (valA === undefined || valA === null) return 1;
                            if (valB === undefined || valB === null) return -1;
                            if (typeof valA === "string" && typeof valB === "string") {
                              return currSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                            }
                            if (typeof valA === "number" && typeof valB === "number") {
                              return currSortOrder === "asc" ? valA - valB : valB - valA;
                            }
                            if (typeof valA === "boolean" && typeof valB === "boolean") {
                              return currSortOrder === "asc" ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
                            }
                            return 0;
                          }).map(pc => {
                            const matchedCourse = courses.find(c => c.id === pc.courseId);
                            return (
                              <tr key={pc.id} className="hover:bg-white/2 transition">
                                <td className="py-2 px-1">
                                  {matchedCourse ? (
                                    <>
                                      <div className="font-bold text-white">{matchedCourse.title}</div>
                                      <div className="text-[10px] text-white/40">{matchedCourse.category}</div>
                                    </>
                                  ) : (
                                    <span className="text-red-400">Môn học không tồn tại</span>
                                  )}
                                </td>
                                <td className="py-2 px-1 text-center font-mono font-bold text-white">{pc.credits} TC</td>
                                <td className="py-2 px-1">
                                  {pc.isRequired ? (
                                    <span className="bg-red-500/10 text-red-400 border border-red-500/15 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                      Bắt buộc
                                    </span>
                                  ) : (
                                    <span className="bg-white/5 text-white/60 px-1.5 py-0.5 rounded text-[9.5px]">
                                      Tự chọn
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-1 text-center font-mono font-bold text-indigo-300">kỳ {pc.semester}</td>
                                <td className="py-2 px-1 text-right font-semibold">
                                  <button
                                    onClick={() => handleRemoveCourseFromCurriculum(pc.id)}
                                    className="p-1 text-red-400 hover:bg-red-500/15 rounded-md cursor-pointer"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {activeCurriculums.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                                Chưa thêm học phần cấu trúc nào cho chương trình này.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-white/5 rounded-xl border border-white/5 p-4 space-y-3">
                    <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Thêm học phần vào khung</h5>
                    <form onSubmit={handleAddCourseToCurriculum} className="space-y-3 text-[11px]">
                      <div className="space-y-0.5">
                        <label className="text-white/60">Chọn môn học cơ sở</label>
                        <select
                          value={currCourseId}
                          onChange={(e) => setCurrCourseId(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                        >
                          <option value="">-- Chọn môn học --</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id} className="bg-slate-900">{c.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-white/60">Số tín kỳ này</label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={10}
                            value={currCredits}
                            onChange={(e) => setCurrCredits(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-white/60">Học kỳ đề xuất</label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={10}
                            value={currSemester}
                            onChange={(e) => setCurrSemester(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-black/25 text-white border border-white/10 rounded-lg focus:outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="curr-req"
                          checked={currRequired}
                          onChange={(e) => setCurrRequired(e.target.checked)}
                          className="rounded border-white/10 bg-black/20"
                        />
                        <label htmlFor="curr-req" className="text-xs text-white/80 cursor-pointer">
                          Yêu cầu cốt lõi (Bắt buộc)
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-white text-indigo-950 font-bold rounded-lg hover:bg-white/95 transition text-xs cursor-pointer mt-1"
                      >
                        Ghim vào Khung học
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-white/30 space-y-2">
                <Layers className="h-10 w-10 mx-auto text-indigo-500/40" />
                <p className="text-xs font-medium">Nhấp chọn chuyên ngành ở bộ phận bên trái để chỉnh sửa cấu trúc danh mục tín chỉ & khung chương trình chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
