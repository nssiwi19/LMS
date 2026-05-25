import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import pg from "pg";
import { getInitialStore } from "./src/store";
import { verifyPassword } from "./src/authHash";
import { Course, Enrollment, LessonProgress, Question, TuitionFee, User } from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-e16-lms-secret");
const revokedTokens = new Set<string>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const csrfSafeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

app.use(express.json({ limit: "10mb" }));

if (process.env.NODE_ENV === "production" && !JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}

type AuthRequest = express.Request & { user?: User };
type DbUserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt?: string | null;
  name: string;
  role: User["role"];
  is_active: number | boolean;
  phone?: string | null;
  linked_student_id?: string | null;
  created_at: string;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the Postgres/Supabase backend.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

function normalizeRole(role: string): User["role"] {
  if (role === "ke_toan") return "finance";
  if (role === "quan_ly_hoc_vu" || role === "academic_admin") return "academic";
  return role as User["role"];
}

function toPublicUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: "",
    name: row.name,
    role: normalizeRole(row.role),
    isActive: Boolean(row.is_active),
    phone: row.phone || undefined,
    linkedStudentId: row.linked_student_id || undefined,
    createdAt: row.created_at
  };
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function signToken(user: User): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifyToken(token: string): { sub: string } | null {
  if (revokedTokens.has(token)) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function setAuthCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `e16_lms_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 8}${secure}`);
}

function setCsrfCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append("Set-Cookie", `e16_lms_csrf=${token}; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 8}${secure}`);
}

function clearAuthCookie(res: express.Response) {
  res.setHeader("Set-Cookie", [
    "e16_lms_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    "e16_lms_csrf=; SameSite=Lax; Path=/; Max-Age=0"
  ]);
}

function extractBearerToken(req: express.Request): string | null {
  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const match = (req.header("Cookie") || "").match(/(?:^|;\s*)e16_lms_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractCookie(req: express.Request, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = (req.header("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function rateLimitLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (entry.count >= maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  }
  entry.count += 1;
  next();
}

function requireCsrf(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (csrfSafeMethods.has(req.method)) return next();
  if (req.path === "/auth/login" || req.path === "/api/auth/login") return next();
  const cookieToken = extractCookie(req, "e16_lms_csrf");
  const headerToken = req.header("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "Invalid CSRF token." });
  }
  next();
}

async function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing session." });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired session." });
  const result = await pool.query<DbUserRow>("SELECT * FROM users WHERE id = $1", [payload.sub]);
  const row = result.rows[0];
  if (!row || !row.is_active) return res.status(401).json({ error: "User is not available." });
  req.user = toPublicUser(row);
  next();
}

app.use("/api", requireCsrf);

function requireRole(roles: Array<User["role"]>) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Permission denied." });
    next();
  };
}

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function courseFromRow(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    teacherId: row.teacher_id,
    status: row.status,
    category: row.category,
    thumbnail: row.thumbnail || undefined,
    price: row.price ?? undefined,
    level: row.level || undefined,
    tags: row.tags_json ? JSON.parse(row.tags_json) : [],
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at
  };
}

function enrollmentFromRow(row: any): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    status: row.status,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at || undefined
  };
}

function questionFromRow(row: any): Question {
  return {
    id: row.id,
    quizId: row.quiz_id,
    text: row.text,
    type: row.type,
    options: row.options_json ? JSON.parse(row.options_json) : [],
    correctAnswer: row.correct_answer
  };
}

async function initializeDatabase() {
  const migration = fs.readFileSync(path.join(process.cwd(), "migrations", "001_initial_schema.postgres.sql"), "utf8");
  await pool.query(migration);
  await pool.query(`
    UPDATE users SET role = 'finance' WHERE role = 'ke_toan';
    UPDATE users SET role = 'academic' WHERE role IN ('quan_ly_hoc_vu', 'academic_admin');
  `);
  await seedAuthUsers();
  await seedCoreLearningData();
}

async function seedAuthUsers() {
  const count = Number((await pool.query("SELECT COUNT(*) AS count FROM users")).rows[0].count);
  if (count > 0) return;
  const store = getInitialStore();
  for (const user of store.users) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.email.toLowerCase(), user.passwordHash, user.passwordSalt || null, user.name, normalizeRole(user.role), user.isActive ? 1 : 0, user.phone || null, user.linkedStudentId || null, user.createdAt]
    );
  }
}

async function seedCoreLearningData() {
  const store = getInitialStore();
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM courses")).rows[0].count) === 0) {
    for (const c of store.courses) {
      await pool.query(
        `INSERT INTO courses (id, title, description, teacher_id, status, category, thumbnail, price, level, tags_json, rejection_reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.title, c.description, c.teacherId, c.status, c.category, c.thumbnail || null, c.price || 0, c.level || null, JSON.stringify(c.tags || []), c.rejectionReason || null, c.createdAt]
      );
    }
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM lessons")).rows[0].count) === 0) {
    for (const l of store.lessons) await pool.query("INSERT INTO lessons (id, course_id, title, content, video_url, lesson_order, duration) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING", [l.id, l.courseId, l.title, l.content, l.videoUrl || null, l.order, l.duration]);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM enrollments")).rows[0].count) === 0) {
    for (const e of store.enrollments) await pool.query("INSERT INTO enrollments (id, course_id, student_id, status, enrolled_at, completed_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING", [e.id, e.courseId, e.studentId, e.status, e.enrolledAt, e.completedAt || null]);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM lesson_progress")).rows[0].count) === 0) {
    for (const p of store.lessonProgress) await pool.query("INSERT INTO lesson_progress (id, enrollment_id, lesson_id, completed, completed_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING", [p.id, p.enrollmentId, p.lessonId, p.completed ? 1 : 0, p.completedAt || null]).catch(() => undefined);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM quizzes")).rows[0].count) === 0) {
    for (const q of store.quizzes) await pool.query("INSERT INTO quizzes (id, course_id, lesson_id, title, passing_score, time_limit, max_attempts) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING", [q.id, q.courseId, q.lessonId || null, q.title, q.passingScore, q.timeLimit, q.maxAttempts]);
    for (const q of store.questions) await pool.query("INSERT INTO questions (id, quiz_id, text, type, options_json, correct_answer) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING", [q.id, q.quizId, q.text, q.type, JSON.stringify(q.options || []), q.correctAnswer]);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM assignments")).rows[0].count) === 0) {
    for (const a of store.assignments) await pool.query("INSERT INTO assignments (id, course_id, title, description, deadline, max_score) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING", [a.id, a.courseId, a.title, a.description, a.deadline, a.maxScore]);
    for (const s of store.submissions) await pool.query("INSERT INTO submissions (id, assignment_id, student_id, content, score, feedback, submitted_at, graded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING", [s.id, s.assignmentId, s.studentId, s.content, s.score ?? null, s.feedback || null, s.submittedAt, s.gradedAt || null]);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM tuition_fees")).rows[0].count) === 0) {
    for (const f of store.tuitionFees) await pool.query("INSERT INTO tuition_fees (id, student_id, semester_id, amount, due_date, status, paid_amount, paid_at, receipt_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING", [f.id, f.studentId, f.semesterId || null, f.amount, f.dueDate, f.status, f.paidAmount, f.paidAt || null, f.receiptCode || null]);
  }
  if (Number((await pool.query("SELECT COUNT(*) AS count FROM academic_warnings")).rows[0].count) === 0) {
    for (const w of store.academicWarnings) await pool.query("INSERT INTO academic_warnings (id, student_id, type, message, is_resolved, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING", [w.id, w.studentId, w.type, w.message, w.isResolved ? 1 : 0, w.createdAt]);
  }
}

async function storeSnapshotFromDb() {
  const users = (await pool.query<DbUserRow>("SELECT * FROM users")).rows.map(toPublicUser);
  const courses = (await pool.query("SELECT * FROM courses")).rows.map(courseFromRow);
  const lessons = (await pool.query("SELECT * FROM lessons")).rows.map(row => ({ id: row.id, courseId: row.course_id, title: row.title, content: row.content, videoUrl: row.video_url || undefined, order: row.lesson_order, duration: row.duration }));
  const enrollments = (await pool.query("SELECT * FROM enrollments")).rows.map(enrollmentFromRow);
  const lessonProgress = (await pool.query("SELECT * FROM lesson_progress")).rows.map(row => ({ id: row.id, enrollmentId: row.enrollment_id, lessonId: row.lesson_id, completed: Boolean(row.completed), completedAt: row.completed_at || undefined }));
  const quizzes = (await pool.query("SELECT * FROM quizzes")).rows.map(row => ({ id: row.id, courseId: row.course_id, lessonId: row.lesson_id || undefined, title: row.title, passingScore: row.passing_score, timeLimit: row.time_limit, maxAttempts: row.max_attempts }));
  const questions = (await pool.query("SELECT * FROM questions")).rows.map(questionFromRow);
  const quizAttempts = (await pool.query("SELECT * FROM quiz_attempts")).rows.map(row => ({ id: row.id, quizId: row.quiz_id, studentId: row.student_id, answers: row.answers_json ? JSON.parse(row.answers_json) : {}, score: row.score, passed: Boolean(row.passed), startedAt: row.started_at, submittedAt: row.submitted_at }));
  const assignments = (await pool.query("SELECT * FROM assignments")).rows.map(row => ({ id: row.id, courseId: row.course_id, title: row.title, description: row.description, deadline: row.deadline, maxScore: row.max_score }));
  const submissions = (await pool.query("SELECT * FROM submissions")).rows.map(row => ({ id: row.id, assignmentId: row.assignment_id, studentId: row.student_id, content: row.content, score: row.score ?? undefined, feedback: row.feedback || undefined, submittedAt: row.submitted_at, gradedAt: row.graded_at || undefined }));
  const tuitionFees = (await pool.query("SELECT * FROM tuition_fees")).rows.map(row => ({ id: row.id, studentId: row.student_id, semesterId: row.semester_id || "", amount: row.amount, dueDate: row.due_date, status: row.status, paidAmount: row.paid_amount, paidAt: row.paid_at || undefined, receiptCode: row.receipt_code || undefined }));
  const academicWarnings = (await pool.query("SELECT * FROM academic_warnings")).rows.map(row => ({ id: row.id, studentId: row.student_id, type: row.type, message: row.message, isResolved: Boolean(row.is_resolved), createdAt: row.created_at }));
  return { ...getInitialStore(), users, courses, lessons, enrollments, lessonProgress, quizzes, questions, quizAttempts, assignments, submissions, tuitionFees, academicWarnings };
}

function limitStoreForRole(store: any, user: User) {
  if (user.role === "admin" || user.role === "super_admin" || user.role === "academic") {
    return {
      ...store,
      users: store.users.map((item: User) => ({
        id: item.id,
        email: item.email,
        name: item.name,
        role: item.role,
        isActive: item.isActive,
        phone: item.phone,
        linkedStudentId: item.linkedStudentId,
        createdAt: item.createdAt,
        passwordHash: ""
      }))
    };
  }

  if (user.role === "teacher") {
    const teacherCourseIds = new Set(store.courses.filter((course: Course) => course.teacherId === user.id).map((course: Course) => course.id));
    const visibleEnrollments = store.enrollments.filter((item: Enrollment) => teacherCourseIds.has(item.courseId));
    const visibleStudentIds = new Set(visibleEnrollments.map((item: Enrollment) => item.studentId));
    visibleStudentIds.add(user.id);
    return {
      ...store,
      users: store.users.filter((item: User) => visibleStudentIds.has(item.id) || item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" })),
      courses: store.courses.filter((course: Course) => teacherCourseIds.has(course.id)),
      enrollments: visibleEnrollments,
      lessonProgress: store.lessonProgress.filter((item: LessonProgress) => visibleEnrollments.some((enroll: Enrollment) => enroll.id === item.enrollmentId)),
      quizzes: store.quizzes.filter((quiz: any) => teacherCourseIds.has(quiz.courseId)),
      assignments: store.assignments.filter((assignment: any) => teacherCourseIds.has(assignment.courseId)),
      submissions: store.submissions.filter((submission: any) => visibleStudentIds.has(submission.studentId))
    };
  }

  if (user.role === "student") {
    const myEnrollments = store.enrollments.filter((item: Enrollment) => item.studentId === user.id);
    const myCourseIds = new Set(myEnrollments.map((item: Enrollment) => item.courseId));
    const myAssignmentIds = new Set(store.assignments.filter((item: any) => myCourseIds.has(item.courseId)).map((item: any) => item.id));
    return {
      ...store,
      users: store.users.filter((item: User) => item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" })),
      enrollments: myEnrollments,
      lessonProgress: store.lessonProgress.filter((item: LessonProgress) => myEnrollments.some((enroll: Enrollment) => enroll.id === item.enrollmentId)),
      quizAttempts: store.quizAttempts.filter((item: any) => item.studentId === user.id),
      submissions: store.submissions.filter((item: any) => item.studentId === user.id),
      tuitionFees: store.tuitionFees.filter((item: any) => item.studentId === user.id),
      academicWarnings: store.academicWarnings.filter((item: any) => item.studentId === user.id),
      assignments: store.assignments.filter((item: any) => myCourseIds.has(item.courseId) || myAssignmentIds.has(item.id))
    };
  }

  return {
    ...store,
    users: store.users.filter((item: User) => item.id === user.id).map((item: User) => ({ ...item, passwordHash: "" }))
  };
}

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }) : null;

app.post("/api/analyze", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code content is required." });
  if (!ai) return res.status(503).json({ error: "Gemini API Key is not configured in the workspace secrets. Please configure GEMINI_API_KEY in Settings." });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze this web/backend application entrypoint file, specifically looking at its structure, routing, models (if applicable), and configuration, and generate a structured JSON feedback. Here is the code:\n\n${code}`,
      config: {
        systemInstruction: "You are an expert full-stack engineer specialized in web frameworks, microservices, and porting applications across Python (Flask) and Node.js/Express.js.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            configs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, defaultValue: { type: Type.STRING }, envVar: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "defaultValue", "envVar", "description"] } },
            nodePort: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["explanation", "configs", "nodePort", "tips"]
        }
      }
    });
    res.json(JSON.parse(response.text?.trim() ?? "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "An error occurred during code analysis." });
  }
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "ok", uptime: process.uptime() });
  } catch {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

app.post("/api/auth/login", rateLimitLogin, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const row = (await pool.query<DbUserRow>("SELECT * FROM users WHERE lower(email) = $1", [email])).rows[0];
  if (!row || !verifyPassword(password, row.password_hash, row.password_salt || undefined)) return res.status(401).json({ error: "Incorrect email or password." });
  if (!row.is_active) return res.status(403).json({ error: "Account inactive." });
  const user = toPublicUser(row);
  setAuthCookie(res, signToken(user));
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  setCsrfCookie(res, csrfToken);
  res.json({ user, csrfToken });
});

app.post("/api/auth/logout", (req, res) => {
  const token = extractBearerToken(req);
  if (token) revokedTokens.add(token);
  clearAuthCookie(res);
  res.status(204).send();
});

app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));
app.get("/api/store", requireAuth, async (req: AuthRequest, res) => res.json(limitStoreForRole(await storeSnapshotFromDb(), req.user!)));
app.get("/api/courses", requireAuth, async (_req, res) => res.json((await pool.query("SELECT * FROM courses ORDER BY created_at DESC")).rows.map(courseFromRow)));

app.post("/api/courses", requireAuth, requireRole(["teacher", "admin", "super_admin", "academic"]), async (req: AuthRequest, res) => {
  const course: Course = { id: generateId("course"), title: String(req.body.title || "").trim(), description: String(req.body.description || "").trim(), teacherId: req.user!.role === "teacher" ? req.user!.id : String(req.body.teacherId || req.user!.id), status: "draft", category: String(req.body.category || "General"), thumbnail: req.body.thumbnail || undefined, price: Number(req.body.price || 0), level: req.body.level || undefined, tags: Array.isArray(req.body.tags) ? req.body.tags : [], createdAt: new Date().toISOString() };
  if (!course.title || !course.description) return res.status(400).json({ error: "Title and description are required." });
  await pool.query("INSERT INTO courses (id,title,description,teacher_id,status,category,thumbnail,price,level,tags_json,rejection_reason,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [course.id, course.title, course.description, course.teacherId, course.status, course.category, course.thumbnail || null, course.price || 0, course.level || null, JSON.stringify(course.tags || []), null, course.createdAt]);
  res.status(201).json(course);
});

app.post("/api/courses/:id/publish", requireAuth, requireRole(["admin", "super_admin", "academic"]), async (req, res) => {
  const result = await pool.query("UPDATE courses SET status = 'published' WHERE id = $1 RETURNING *", [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: "Course not found." });
  res.json(courseFromRow(result.rows[0]));
});

app.get("/api/enrollments", requireAuth, async (req: AuthRequest, res) => {
  const result = ["admin", "super_admin", "academic"].includes(req.user!.role) ? await pool.query("SELECT * FROM enrollments") : await pool.query("SELECT * FROM enrollments WHERE student_id = $1", [req.user!.id]);
  res.json(result.rows.map(enrollmentFromRow));
});

app.post("/api/enrollments/register", requireAuth, requireRole(["student"]), async (req: AuthRequest, res) => {
  const courseId = String(req.body.courseId || "");
  const course = (await pool.query("SELECT * FROM courses WHERE id = $1 AND status = 'published'", [courseId])).rows[0];
  if (!course) return res.status(404).json({ error: "Published course not found." });
  const existing = (await pool.query("SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2", [courseId, req.user!.id])).rows[0];
  if (existing) return res.status(409).json({ error: "Enrollment already exists." });
  const enrollment: Enrollment = { id: generateId("enroll"), courseId, studentId: req.user!.id, status: Number(course.price || 0) > 0 ? "pending_payment" : "active", enrolledAt: new Date().toISOString() };
  await pool.query("INSERT INTO enrollments (id,course_id,student_id,status,enrolled_at,completed_at) VALUES ($1,$2,$3,$4,$5,$6)", [enrollment.id, enrollment.courseId, enrollment.studentId, enrollment.status, enrollment.enrolledAt, null]);
  res.status(201).json(enrollment);
});

app.post("/api/progress/toggle", requireAuth, requireRole(["student"]), async (req: AuthRequest, res) => {
  const enrollmentId = String(req.body.enrollmentId || "");
  const lessonId = String(req.body.lessonId || "");
  const enrollment = (await pool.query("SELECT id FROM enrollments WHERE id = $1 AND student_id = $2", [enrollmentId, req.user!.id])).rows[0];
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });
  const existing = (await pool.query("SELECT * FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2", [enrollmentId, lessonId])).rows[0];
  if (existing) {
    const completed = existing.completed ? 0 : 1;
    const completedAt = completed ? new Date().toISOString() : null;
    await pool.query("UPDATE lesson_progress SET completed = $1, completed_at = $2 WHERE id = $3", [completed, completedAt, existing.id]);
    return res.json({ id: existing.id, enrollmentId, lessonId, completed: Boolean(completed), completedAt: completedAt || undefined } satisfies LessonProgress);
  }
  const progress: LessonProgress = { id: generateId("prog"), enrollmentId, lessonId, completed: true, completedAt: new Date().toISOString() };
  await pool.query("INSERT INTO lesson_progress (id,enrollment_id,lesson_id,completed,completed_at) VALUES ($1,$2,$3,$4,$5)", [progress.id, enrollmentId, lessonId, 1, progress.completedAt]);
  res.json(progress);
});

app.post("/api/quizzes/submit", requireAuth, requireRole(["student"]), async (req: AuthRequest, res) => {
  const quizId = String(req.body.quizId || "");
  const answers = (req.body.answers || {}) as Record<string, string>;
  const quiz = (await pool.query("SELECT * FROM quizzes WHERE id = $1", [quizId])).rows[0];
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  const questions = (await pool.query("SELECT * FROM questions WHERE quiz_id = $1", [quizId])).rows.map(questionFromRow);
  let correctCount = 0;
  for (const q of questions) {
    const studentAnswer = answers[q.id] || "";
    if (q.type === "text" && q.correctAnswer.toLowerCase().split(",").map(key => key.trim()).some(key => studentAnswer.toLowerCase().includes(key))) correctCount++;
    else if (q.type !== "text" && studentAnswer === q.correctAnswer) correctCount++;
  }
  const score = Math.round((correctCount / (questions.length || 1)) * 100);
  const passed = score >= quiz.passing_score;
  const attempt = { id: generateId("attempt"), quizId, studentId: req.user!.id, answers, score, passed, startedAt: req.body.startedAt || new Date().toISOString(), submittedAt: new Date().toISOString() };
  await pool.query("INSERT INTO quiz_attempts (id,quiz_id,student_id,answers_json,score,passed,started_at,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [attempt.id, quizId, req.user!.id, JSON.stringify(answers), score, passed ? 1 : 0, attempt.startedAt, attempt.submittedAt]);
  res.status(201).json({ ...attempt, correctAnswers: correctCount, total: questions.length });
});

app.post("/api/assignments/grade", requireAuth, requireRole(["teacher", "admin", "super_admin"]), async (req: AuthRequest, res) => {
  const submissionId = String(req.body.submissionId || "");
  const score = Number(req.body.score);
  const feedback = String(req.body.feedback || "");
  const submission = (await pool.query("SELECT s.*, a.max_score, c.teacher_id FROM submissions s JOIN assignments a ON a.id = s.assignment_id JOIN courses c ON c.id = a.course_id WHERE s.id = $1", [submissionId])).rows[0];
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  if (req.user!.role === "teacher" && submission.teacher_id !== req.user!.id) return res.status(403).json({ error: "Permission denied." });
  if (Number.isNaN(score) || score < 0 || score > submission.max_score) return res.status(400).json({ error: "Invalid score." });
  await pool.query("UPDATE submissions SET score = $1, feedback = $2, graded_at = $3 WHERE id = $4", [score, feedback, new Date().toISOString(), submissionId]);
  res.json({ id: submissionId, score, feedback });
});

app.get("/api/academics/warnings", requireAuth, async (req: AuthRequest, res) => {
  const result = ["admin", "super_admin", "academic", "advisor"].includes(req.user!.role) ? await pool.query("SELECT * FROM academic_warnings ORDER BY created_at DESC") : await pool.query("SELECT * FROM academic_warnings WHERE student_id = $1 ORDER BY created_at DESC", [req.user!.id]);
  res.json(result.rows.map(row => ({ id: row.id, studentId: row.student_id, type: row.type, message: row.message, isResolved: Boolean(row.is_resolved), createdAt: row.created_at })));
});

app.post("/api/tuition/pay", requireAuth, requireRole(["finance", "admin", "super_admin"]), async (req, res) => {
  const feeId = String(req.body.feeId || "");
  const paidAmount = Number(req.body.paidAmount || 0);
  const fee = (await pool.query("SELECT * FROM tuition_fees WHERE id = $1", [feeId])).rows[0];
  if (!fee) return res.status(404).json({ error: "Tuition fee not found." });
  const totalPaid = Math.min(Number(fee.amount), Number(fee.paid_amount || 0) + paidAmount);
  const status: TuitionFee["status"] = totalPaid >= Number(fee.amount) ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
  const paidAt = status === "paid" ? new Date().toISOString() : fee.paid_at;
  const receiptCode = fee.receipt_code || `RC${Date.now()}`;
  await pool.query("UPDATE tuition_fees SET paid_amount = $1, status = $2, paid_at = $3, receipt_code = $4 WHERE id = $5", [totalPaid, status, paidAt, receiptCode, feeId]);
  res.json({ id: feeId, paidAmount: totalPaid, status, paidAt, receiptCode });
});

app.post("/api/store/sync", requireAuth, async (_req, res) => {
  res.json({ ok: true, mode: "postgres-authoritative" });
});

async function setupServer() {
  await initializeDatabase();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error." : err.message || "Internal server error." });
  });
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
