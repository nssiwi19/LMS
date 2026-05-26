import { User, Course, StudentProfile, LMSDataStore } from "./types";
import { hashPassword } from "./authHash";
import { recomputeAndPersistAllGpas } from "./store";

const credential = (password: string, salt: string) => hashPassword(password, salt);

export function backfillMegaDemoData(store: LMSDataStore) {
  const currentStudentsCount = store.users.filter(u => u.role === "student").length;
  // If the directory of students is already fully seeded, do not regenerate
  if (currentStudentsCount >= 100) {
    return;
  }

  // Surnames, middles, and givennames in Vietnamese for authentic mock records
  const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  const middlenames = ["Văn", "Thị", "Quang", "Minh", "Hồng", "Khánh", "Tuấn", "Thanh", "Ngọc", "Hải", "Anh", "Đức", "Công", "Xuân", "Phương"];
  const givennames = ["Hùng", "Hải", "Sơn", "Trung", "Nam", "Bắc", "Trang", "Linh", "Thảo", "Hương", "Anh", "Duy", "Phương", "Cường", "Tuấn", "Vy", "Yến", "Lan", "Phong", "Khoa"];

  const generateName = () => {
    const s = surnames[Math.floor(Math.random() * surnames.length)];
    const m = middlenames[Math.floor(Math.random() * middlenames.length)];
    const g = givennames[Math.floor(Math.random() * givennames.length)];
    return `${s} ${m} ${g}`;
  };

  // 1. Double check Super Admin presence
  const hasSuperAdmin = store.users.some(u => u.role === "super_admin");
  if (!hasSuperAdmin) {
    store.users.push({
      id: "user_super_admin",
      email: "superadmin@e16.local",
      passwordHash: credential("superadmin16", "seed_super_admin").hash,
      passwordSalt: credential("superadmin16", "seed_super_admin").salt,
      name: "Trần Anh Khoa (Super Admin)",
      role: "super_admin",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00Z").toISOString()
    });
  }

  // 2. Generate 19 more Teachers to make 20 total
  const teachersCountToGen = 20 - store.users.filter(u => u.role === "teacher").length;
  const newTeachers: User[] = [];
  for (let i = 1; i <= teachersCountToGen; i++) {
    const name = "Thầy/Cô " + generateName();
    const tId = `teacher_gen_${i}`;
    newTeachers.push({
      id: tId,
      email: `teacher_${i}@e16.local`,
      passwordHash: credential("teachere16", `seed_teacher_gen_${i}`).hash,
      passwordSalt: credential("teachere16", `seed_teacher_gen_${i}`).salt,
      name,
      role: "teacher",
      isActive: true,
      createdAt: new Date("2026-01-02T00:00:00Z").toISOString()
    });
  }
  store.users.push(...newTeachers);

  const allTeachers = store.users.filter(u => u.role === "teacher");

  // 3. Generate 37 more Courses to make 40 total
  const coursesCountToGen = 40 - store.courses.length;
  const courseTitles = [
    "Cấu trúc dữ liệu và giải thuật áp dụng",
    "Lập trình hướng đối tượng chuyên sâu",
    "Cơ sở dữ liệu NoSQL & Distributed Cache",
    "Kỹ thuật kiểm thử & Jenkins CI/CD pipeline",
    "Phát triển ứng dụng đám mây AWS",
    "Trí tuệ nhân tạo và ứng dụng NLP",
    "An toàn mạng máy tính và mã hóa đầu cuối",
    "Phân tích tài chính doanh nghiệp nâng cao",
    "Lập trình ứng dụng di động React Native",
    "Xây dựng và tối ưu hóa truy vấn SQL",
    "Thiết kế kiến trúc hệ thống Microservices",
    "Hành vi người dùng & Thiết kế UI/UX",
    "Giải pháp Blockchain & Ethereum Smart Contract",
    "Khai thác và phân tích Big Data",
    "Kỹ thuật lập trình sạch Clean Code",
    "Hệ thống điều hành phân tán",
    "Lập trình trò chơi Unity 3D cơ bản",
    "Điện toán đám mây Docker & Kubernetes",
    "Kế toán quản trị và Thuế chuyên sâu",
    "Hệ thống thông tin quản lý kinh tế",
    "Phân tích rủi ro & Bảo hiểm tài chính",
    "Khởi nghiệp đổi mới sáng tạo số",
    "Thương mại điện tử & Phễu tối ưu Marketing",
    "Quản lý chuỗi cung ứng Logistics toàn cầu",
    "Kỹ năng mềm cho kỹ sư phần mềm",
    "Lập trình ứng dụng Web với NestJS",
    "Đại số tuyến tính hướng ứng dụng Máy học",
    "Lý thuyết mật mã học và bảo mật",
    "Phát triển ứng dụng Web Frontend với Vue.js 3",
    "Lập trình Python Core & Cơ bản",
    "Trải nghiệm trò chơi & Kỹ thuật Shader",
    "Phác thảo đồ họa và hoạt cảnh 2D",
    "Tối ưu hiệu suất Server Node.js",
    "Ngôn ngữ Go cho phát triển Network Service",
    "Phát triển ứng dụng Cross-platform với Flutter",
    "Công nghệ IoT & Lập trình nhúng Arduino",
    "Kiểm toán độc lập và Quản trị doanh nghiệp"
  ];

  const categories = ["Web Development", "Software Engineering", "Data Science", "System Administration", "Artificial Intelligence", "Business Management", "Finance"];
  const levels = ["Cơ bản", "Trung cấp", "Nâng cao"] as const;

  const newCourses: Course[] = [];
  for (let i = 0; i < coursesCountToGen; i++) {
    const cId = `course_gen_${i}`;
    const t = allTeachers[Math.floor(Math.random() * allTeachers.length)];
    const title = courseTitles[i % courseTitles.length];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    newCourses.push({
      id: cId,
      title,
      description: `Khóa học toàn diện về ${title}, trang bị kỹ năng chuyên ngành và thực hành qua hệ thống Lab SIS hiện đại. Thích hợp cho cả sinh viên học lại và nghiên cứu nâng cao.`,
      teacherId: t.id,
      status: "published",
      category: cat,
      price: 1500000 + Math.floor(Math.random() * 5) * 500000,
      level,
      tags: [cat.split(" ")[0] || "General", "E16", "SIS"],
      createdAt: new Date("2026-01-10T00:00:00Z").toISOString(),
      thumbnail: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000000)}?w=600&auto=format&fit=crop&q=60`
    });
  }
  store.courses.push(...newCourses);

  const allCourses = store.courses;

  // Make sure each course has custom lessons, quizzes, and questions
  allCourses.forEach((course) => {
    const hasLesson = store.lessons.some(l => l.courseId === course.id);
    if (!hasLesson) {
      store.lessons.push({
        id: `lesson_en_${course.id}_1`,
        courseId: course.id,
        title: "1. Tổng quan lý thuyết & Định vị kiến thức",
        content: `Chào mừng các bạn đến với khóa học: ${course.title}. Đây là chương đệm sơ bộ về các ranh giới kiến thức cốt lõi. Hãy làm bài tập đầy đủ để được cấp chứng nhận.`,
        order: 1,
        duration: "20 mins"
      });
      store.lessons.push({
        id: `lesson_en_${course.id}_2`,
        courseId: course.id,
        title: "2. Thực hành cấu hình trực tiếp phòng Lab",
        content: "Nội dung nâng cao hướng dẫn từng bước cấu tạo hệ thống cục bộ, triển khai qua Docker container.",
        order: 2,
        duration: "30 mins"
      });
    }

    const hasQuiz = store.quizzes.some(q => q.courseId === course.id);
    const quizId = `quiz_${course.id}`;
    if (!hasQuiz) {
      store.quizzes.push({
        id: quizId,
        courseId: course.id,
        title: `Đề thi trắc nghiệm học phần: ${course.title}`,
        passingScore: 70,
        timeLimit: 15,
        maxAttempts: 3
      });
      
      store.questions.push({
        id: `q_${course.id}_1`,
        quizId: quizId,
        text: `Nêu ưu điểm tối thượng của chương trình đào tạo học phần ${course.title}?`,
        type: "single",
        options: ["Đào tạo bám sát thực tế phát triển doanh nghiệp", "Thời gian học ngắn và không phải thi cử", "Cấp chứng chỉ miễn phí mà không cần học", "Chương trình lỗi thời không áp dụng thực tiễn"],
        correctAnswer: "0"
      });
      store.questions.push({
        id: `q_${course.id}_2`,
        quizId: quizId,
        text: "Các rào cản kỹ thuật hay lỗi hệ thống cần được xử lý như thế nào?",
        type: "single",
        options: ["Bỏ qua và không học tiếp", "Liên hệ cố vấn học tập & thầy giáo phụ trách để trợ giúp", "Tự ý thay đổi điểm số học bạ", "Gửi bài tập trống"],
        correctAnswer: "1"
      });
    }

    const hasAssignment = store.assignments.some(a => a.courseId === course.id);
    if (!hasAssignment) {
      store.assignments.push({
        id: `assign_${course.id}`,
        courseId: course.id,
        title: `Bài tập lớn thực hành cuối kỳ: ${course.title}`,
        description: "Sinh viên hoàn thành báo cáo mã nguồn, đẩy lên GitHub cá nhân và viết mô tả giải pháp chi tiết vào ô nộp bài.",
        deadline: new Date("2026-07-15T23:59:59Z").toISOString(),
        maxScore: 100
      });
    }
  });

  // 4. Generate remaining students to satisfy requested 300 student demo state
  const studentsToGen = 300 - store.users.filter(u => u.role === "student").length;
  if (studentsToGen <= 0) return;

  const newStudents: User[] = [];
  const newProfiles: StudentProfile[] = [];

  const addresses = [
    "Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội",
    "227 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
    "Khu phố 6, Linh Trung, Thủ Đức, TP. Hồ Chí Minh",
    "144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    "Số 2 Trường Sa, Ngũ Hành Sơn, Đà Nẵng",
    "Lộ Vòng Cung, An Khánh, Ninh Kiều, Cần Thơ",
    "Số 1 Tô Hiệu, Lê Chân, Hải Phòng",
    "54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng",
    "Phường Phú Hòa, Thủ Dầu Một, Bình Dương",
    "180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh"
  ];

  for (let i = 1; i <= studentsToGen; i++) {
    const sId = `student_gen_${i}`;
    const name = generateName();
    
    newStudents.push({
      id: sId,
      email: `st_${i}@e16.local`,
      passwordHash: credential("studente16", `seed_student_gen_${i}`).hash,
      passwordSalt: credential("studente16", `seed_student_gen_${i}`).salt,
      name,
      role: "student",
      isActive: true,
      createdAt: new Date("2026-01-03T00:00:00Z").toISOString(),
      phone: "09" + Math.floor(10000000 + Math.random() * 90000000)
    });

    const isSeorBm = Math.random() > 0.5 ? "prog_se" : "prog_bm";
    const dep = isSeorBm === "prog_se" ? "dept_cs" : "dept_ba";
    const year = Math.floor(Math.random() * 4) + 1;
    const gpaVal = 2.0 + Math.random() * 1.95; 
    const credits = 15 + (year * 30) - Math.floor(Math.random() * 12);

    newProfiles.push({
      id: `profile_gen_${i}`,
      userId: sId,
      studentCode: `SV202${5 - year}00${String(1000 + i).slice(1)}`,
      programId: isSeorBm,
      departmentId: dep,
      academicYear: year,
      enrollmentDate: `202${5 - year}-09-01`,
      expectedGraduation: `202${9 - year}-06-30`,
      status: Math.random() > 0.08 ? "active" : Math.random() > 0.5 ? "suspended" : "on-leave",
      gpa: Number(gpaVal.toFixed(2)),
      totalCreditsEarned: credits,
      address: addresses[Math.floor(Math.random() * addresses.length)],
      phone: "09" + Math.floor(10000000 + Math.random() * 90000000),
      dateOfBirth: `200${5 - year}-04-12`,
      gender: Math.random() > 0.45 ? "Nam" : "Nữ",
      notes: "Lý lịch học sinh sinh viên chính thức."
    });
  }

  store.users.push(...newStudents);
  store.studentProfiles.push(...newProfiles);

  const activeStudentIds = store.studentProfiles
    .filter(p => p.userId.startsWith("student_gen_"))
    .map(p => p.userId);

  activeStudentIds.forEach((sId, index) => {
    store.advisorAssignments.push({
      id: `aa_gen_${index}`,
      advisorId: "user_advisor",
      studentId: sId,
      semesterId: "sem_spring25",
      assignedAt: new Date("2026-02-01T00:00:00Z").toISOString()
    });

    if (index < 30) {
      store.advisorNotes.push({
        id: `adv_note_gen_${index}`,
        advisorId: "user_advisor",
        studentId: sId,
        content: `Đã trao đổi cập nhật với gia đình tình hình rèn luyện kỳ này. Sinh viên có nỗ lực nâng điểm GPA tích lũy.`,
        type: Math.random() > 0.35 ? "academic" : "behavioral",
        createdAt: new Date("2026-05-10T12:00:00Z").toISOString()
      });
    }

    const profile = store.studentProfiles.find(pf => pf.userId === sId);
    if (profile && profile.gpa < 2.3) {
      store.academicWarnings.push({
        id: `warn_gen_${index}`,
        studentId: sId,
        type: "low_gpa",
        message: `Cảnh báo học tập: Điểm trung bình GPA hiện tại của học viên là ${profile.gpa} (dưới ngưỡng an toàn 2.50). Đề xuất trao đổi với Cố vấn học tập sớm nhất.`,
        isResolved: false,
        createdAt: new Date("2026-05-15T09:00:00Z").toISOString()
      });
    }

    const randomCourses = [...store.courses].sort(() => 0.5 - Math.random()).slice(0, 2);
    randomCourses.forEach((crs, crsIdx) => {
      const enrollId = `enroll_gen_${sId}_${crsIdx}`;
      store.enrollments.push({
        id: enrollId,
        courseId: crs.id,
        studentId: sId,
        status: "active",
        enrolledAt: new Date("2026-02-15T09:00:00Z").toISOString()
      });

      store.lessonProgress.push({
        id: `progress_gen_${sId}_${crsIdx}_1`,
        enrollmentId: enrollId,
        lessonId: `lesson_en_${crs.id}_1`,
        completed: true,
        completedAt: new Date("2026-02-20T10:00:00Z").toISOString()
      });

      const score = Math.floor(65 + Math.random() * 35); 
      store.quizAttempts.push({
        id: `attempt_gen_${sId}_${crsIdx}`,
        quizId: `quiz_${crs.id}`,
        studentId: sId,
        answers: { [`q_${crs.id}_1`]: "0", [`q_${crs.id}_2`]: "1" },
        score,
        passed: score >= 70,
        startedAt: new Date("2026-03-01T14:00:00Z").toISOString(),
        submittedAt: new Date("2026-03-01T14:12:00Z").toISOString()
      });

      const feeId = `fee_gen_${sId}_${crsIdx}`;
      store.tuitionFees.push({
        id: feeId,
        studentId: sId,
        semesterId: "sem_spring25",
        amount: crs.price || 2000000,
        dueDate: "2026-06-30",
        status: Math.random() > 0.4 ? "paid" : "unpaid",
        paidAmount: Math.random() > 0.4 ? (crs.price || 2000000) : 0,
        paidAt: Math.random() > 0.4 ? new Date("2026-02-28T10:00:00Z").toISOString() : undefined,
        receiptCode: Math.random() > 0.4 ? `RC${222340 + index}` : undefined
      });
    });
  });

  recomputeAndPersistAllGpas(store);
}
