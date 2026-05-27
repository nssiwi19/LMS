import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { getInitialStore } from "./src/store";
import { hashPassword, verifyPassword } from "./src/authHash";
import { LMSDataStore, StudentProfile, User } from "./src/types";
import { runMigrations } from "./src/dbMigrations";
import { pool } from "./src/server/db";
import { redis, safeRedis } from "./src/server/redis";
import { generateId } from "./src/server/ids";
import { DbUserRow, toPublicUser, denormalizeRole } from "./src/server/mappers";
import { validateBody, schemas } from "./src/server/validation";
import { seedAuthUsers, seedCoreLearningData } from "./src/server/seedCore";
import { usersRepository } from "./src/server/repositories/users";
import { coursesRepository } from "./src/server/repositories/courses";
import { enrollmentsRepository } from "./src/server/repositories/enrollments";
import { quizzesRepository } from "./src/server/repositories/quizzes";
import { assignmentsRepository } from "./src/server/repositories/assignments";
import { financeRepository } from "./src/server/repositories/finance";
import { academicsRepository } from "./src/server/repositories/academics";
import { auditRepository } from "./src/server/repositories/audit";
import { limitStoreForRole, storeSnapshotFromDb } from "./src/server/repositories/storeSnapshot";
import { advisorsRepository } from "./src/server/repositories/advisors";
import { parentRepository } from "./src/server/repositories/parent";
import { courseRegistrationsRepository } from "./src/server/repositories/courseRegistrations";
import { gradeAppealsRepository } from "./src/server/repositories/gradeAppeals";
import { leaveRequestsRepository } from "./src/server/repositories/leaveRequests";
import { graduationRepository } from "./src/server/repositories/graduation";
import { scholarshipsRepository } from "./src/server/repositories/scholarships";
import { notificationsRepository } from "./src/server/repositories/notifications";
import { registerEventHandlers } from "./src/server/eventHandlers";
import { startScheduler } from "./src/server/scheduler";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable is required in production.");
  }
  console.warn("JWT_SECRET not set - using insecure dev default. Never deploy this.");
}
const JWT_SECRET_VALUE = JWT_SECRET || "dev-only-e16-lms-secret-do-not-use-in-prod";
const csrfSafeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

app.use(express.json({ limit: "10mb" }));

type AuthRequest = express.Request & { user?: User; linkedStudentId?: string };
type AsyncRoute = (req: AuthRequest, res: express.Response, next: express.NextFunction) => Promise<unknown>;

function asyncHandler(handler: AsyncRoute) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    handler(req, res, next).catch(next);
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
  const signature = crypto.createHmac("sha256", JWT_SECRET_VALUE).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function verifyToken(token: string): Promise<{ sub: string } | null> {
  if (await safeRedis(() => redis.exists(`revoked:${token}`), 0) === 1) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac("sha256", JWT_SECRET_VALUE).update(`${header}.${payload}`).digest("base64url");
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

async function rateLimitLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.DISABLE_RATE_LIMIT === "true") return next();
  const key = `ratelimit:login:${req.ip || req.socket.remoteAddress || "unknown"}`;
  const max = 10;
  const windowSec = 15 * 60;
  const current = await safeRedis(async () => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return count;
  }, 1);

  if (current > max) {
    const ttl = await safeRedis(() => redis.ttl(key), windowSec);
    res.setHeader("Retry-After", String(ttl));
    return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  }
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
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "Missing session." });
    const payload = await verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Invalid or expired session." });
    const user = await usersRepository.findById(pool, payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: "User is not available." });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(roles: Array<User["role"]>) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Permission denied." });
    next();
  };
}

async function resolveLinkedStudent(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const linkedStudentId = await parentRepository.getLinkedStudent(pool, req.user!.id);
  if (!linkedStudentId) return res.status(403).json({ error: "No linked student found for this parent account." });
  req.linkedStudentId = linkedStudentId;
  next();
}

async function audit(req: AuthRequest, action: string, target: string, detail: string) {
  if (!req.user) return;
  await auditRepository.log(pool, req.user.id, action, target, detail);
}

let isSyncing = false;
const syncQueue: (() => void)[] = [];

const safeDateStr = (d: any) => {
  if (!d) return null;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

async function syncClientStoreToDb(store: Partial<LMSDataStore>) {
  // Serialize syncs to prevent PostgreSQL deadlocks on concurrent saves
  await new Promise<void>((resolve) => {
    if (!isSyncing) {
      isSyncing = true;
      resolve();
    } else {
      syncQueue.push(resolve);
    }
  });

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch existing users to skip identical inserts/updates
      const dbUsersRes = await client.query("SELECT id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id FROM users");
      const dbUsersMap = new Map<string, any>(dbUsersRes.rows.map(r => [r.id, r]));

      for (const user of store.users || []) {
        if (user.role === "parent") continue;
        
        const dbUser = dbUsersMap.get(user.id);
        const emailLower = user.email.toLowerCase();
        const clientRoleDenorm = denormalizeRole(user.role);
        
        // Determine if dirty
        const isDirty = !dbUser || 
          dbUser.email !== emailLower ||
          dbUser.name !== user.name ||
          dbUser.role !== clientRoleDenorm ||
          Boolean(dbUser.is_active) !== Boolean(user.isActive) ||
          (dbUser.phone || null) !== (user.phone || null) ||
          (dbUser.linked_student_id || null) !== (user.linkedStudentId || null) ||
          (user.passwordHash && dbUser.password_hash !== user.passwordHash) ||
          (user.passwordSalt && dbUser.password_salt !== user.passwordSalt);

        if (isDirty) {
          await client.query(
            `INSERT INTO users (id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id, created_at)
             VALUES ($1,$2,COALESCE(NULLIF($3, ''), 'client-sync-placeholder'),$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               role = EXCLUDED.role,
               is_active = EXCLUDED.is_active,
               phone = EXCLUDED.phone,
               linked_student_id = EXCLUDED.linked_student_id,
               password_hash = COALESCE(NULLIF($11, ''), users.password_hash),
               password_salt = COALESCE(EXCLUDED.password_salt, users.password_salt)`,
            [
              user.id,
              emailLower,
              user.passwordHash || "",
              user.passwordSalt || null,
              user.name,
              clientRoleDenorm,
              user.isActive ? 1 : 0,
              user.phone || null,
              user.linkedStudentId || null,
              user.createdAt || new Date().toISOString(),
              user.passwordHash || ""
            ]
          );
        }
      }

      // Fetch existing profiles to skip identical inserts/updates
      const dbProfilesRes = await client.query("SELECT id, user_id, student_code, program_id, department_id, academic_year, enrollment_date, expected_graduation, status, gpa, total_credits_earned, address, phone, date_of_birth, gender, guardian_name, guardian_phone, guardian_email, notes, fee_hold, academic_probation FROM student_profiles");
      const dbProfilesMap = new Map<string, any>(dbProfilesRes.rows.map(r => [r.id, r]));

      for (const profile of store.studentProfiles || []) {
        const dbProfile = dbProfilesMap.get(profile.id);
        
        const isDirty = !dbProfile ||
          dbProfile.user_id !== profile.userId ||
          dbProfile.student_code !== profile.studentCode ||
          dbProfile.program_id !== profile.programId ||
          dbProfile.department_id !== profile.departmentId ||
          Number(dbProfile.academic_year) !== Number(profile.academicYear) ||
          safeDateStr(dbProfile.enrollment_date) !== safeDateStr(profile.enrollmentDate) ||
          safeDateStr(dbProfile.expected_graduation) !== safeDateStr(profile.expectedGraduation) ||
          dbProfile.status !== profile.status ||
        Number(dbProfile.gpa) !== Number(profile.gpa) ||
        Number(dbProfile.total_credits_earned) !== Number(profile.totalCreditsEarned) ||
        dbProfile.address !== (profile.address || null) ||
        dbProfile.phone !== (profile.phone || null) ||
        safeDateStr(dbProfile.date_of_birth) !== safeDateStr(profile.dateOfBirth) ||
        dbProfile.gender !== (profile.gender || null) ||
        dbProfile.guardian_name !== (profile.guardianName || null) ||
        dbProfile.guardian_phone !== (profile.guardianPhone || null) ||
        dbProfile.guardian_email !== (profile.guardianEmail || null) ||
        dbProfile.notes !== (profile.notes || null) ||
        Boolean(dbProfile.fee_hold) !== Boolean(profile.feeHold) ||
        Boolean(dbProfile.academic_probation) !== Boolean(profile.academicProbation);

      if (isDirty) {
        await client.query(
          `INSERT INTO student_profiles (
            id, user_id, student_code, program_id, department_id, academic_year, enrollment_date,
            expected_graduation, status, gpa, total_credits_earned, address, phone, date_of_birth,
            gender, guardian_name, guardian_phone, guardian_email, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            student_code = EXCLUDED.student_code,
            program_id = EXCLUDED.program_id,
            department_id = EXCLUDED.department_id,
            academic_year = EXCLUDED.academic_year,
            enrollment_date = EXCLUDED.enrollment_date,
            expected_graduation = EXCLUDED.expected_graduation,
            status = EXCLUDED.status,
            gpa = EXCLUDED.gpa,
            total_credits_earned = EXCLUDED.total_credits_earned,
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            date_of_birth = EXCLUDED.date_of_birth,
            gender = EXCLUDED.gender,
            guardian_name = EXCLUDED.guardian_name,
            guardian_phone = EXCLUDED.guardian_phone,
            guardian_email = EXCLUDED.guardian_email,
            notes = EXCLUDED.notes`,
          [
            profile.id, profile.userId, profile.studentCode, profile.programId, profile.departmentId,
            profile.academicYear, profile.enrollmentDate, profile.expectedGraduation, profile.status,
            profile.gpa, profile.totalCreditsEarned, profile.address || null, profile.phone || null,
            profile.dateOfBirth || null, profile.gender || null, profile.guardianName || null,
            profile.guardianPhone || null, profile.guardianEmail || null, profile.notes || null
          ]
        );
      }
    }

    for (const user of (store.users || []).filter(item => item.role === "student")) {
      const hasProfile = (store.studentProfiles || []).some(profile => profile.userId === user.id);
      if (!hasProfile) {
        const hasDbProfile = dbProfilesRes.rows.some(r => r.user_id === user.id);
        if (!hasDbProfile) {
          const profile: StudentProfile = {
            id: generateId("profile"),
            userId: user.id,
            studentCode: `SV${new Date().getFullYear()}${user.id.slice(-4).toUpperCase()}`,
            programId: "prog_se",
            departmentId: "dept_cs",
            academicYear: 1,
            enrollmentDate: new Date().toISOString().slice(0, 10),
            expectedGraduation: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().slice(0, 10),
            status: "active",
            gpa: 0,
            totalCreditsEarned: 0
          };
          await client.query(
            `INSERT INTO student_profiles (id, user_id, student_code, program_id, department_id, academic_year, enrollment_date, expected_graduation, status, gpa, total_credits_earned)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (id) DO NOTHING`,
            [profile.id, profile.userId, profile.studentCode, profile.programId, profile.departmentId, profile.academicYear, profile.enrollmentDate, profile.expectedGraduation, profile.status, profile.gpa, profile.totalCreditsEarned]
          );
        }
      }
    }

    // Fetch existing courses to skip identical updates
    const dbCoursesRes = await client.query("SELECT id, status, rejection_reason FROM courses");
    const dbCoursesMap = new Map<string, any>(dbCoursesRes.rows.map(r => [r.id, r]));

    for (const course of store.courses || []) {
      const dbCourse = dbCoursesMap.get(course.id);
      const isDirty = !dbCourse ||
        dbCourse.status !== course.status ||
        dbCourse.rejection_reason !== (course.rejectionReason || null);

      if (isDirty) {
        await client.query(
          `UPDATE courses SET status = $1, rejection_reason = $2 WHERE id = $3`,
          [course.status, course.rejectionReason || null, course.id]
        );
      }
    }

    // Sync structural tables (academic_years, semesters, departments, programs, program_courses)
    // Order of deletion to respect foreign keys: program_courses -> programs -> departments -> semesters -> academic_years
    // 1. Sync program_courses deletes
    const clientProgCourses = store.programCourses || [];
    const clientProgCourseIds = clientProgCourses.map(pc => pc.id);
    if (clientProgCourseIds.length > 0) {
      await client.query(
        "DELETE FROM program_courses WHERE id NOT IN (" + 
        clientProgCourseIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientProgCourseIds
      );
    } else {
      await client.query("DELETE FROM program_courses");
    }

    // 2. Sync programs deletes
    const clientProgs = store.programs || [];
    const clientProgIds = clientProgs.map(p => p.id);
    if (clientProgIds.length > 0) {
      await client.query(
        "DELETE FROM programs WHERE id NOT IN (" + 
        clientProgIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientProgIds
      );
    } else {
      await client.query("DELETE FROM programs");
    }

    // 3. Sync departments deletes
    const clientDepts = store.departments || [];
    const clientDeptIds = clientDepts.map(d => d.id);
    if (clientDeptIds.length > 0) {
      await client.query(
        "DELETE FROM departments WHERE id NOT IN (" + 
        clientDeptIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientDeptIds
      );
    } else {
      await client.query("DELETE FROM departments");
    }

    // 4. Sync semesters deletes
    const clientSemesters = store.semesters || [];
    const clientSemesterIds = clientSemesters.map(s => s.id);
    if (clientSemesterIds.length > 0) {
      await client.query(
        "DELETE FROM semesters WHERE id NOT IN (" + 
        clientSemesterIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientSemesterIds
      );
    } else {
      await client.query("DELETE FROM semesters");
    }

    // 5. Sync academic_years deletes
    const clientYears = store.academicYears || [];
    const clientYearIds = clientYears.map(y => y.id);
    if (clientYearIds.length > 0) {
      await client.query(
        "DELETE FROM academic_years WHERE id NOT IN (" + 
        clientYearIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientYearIds
      );
    } else {
      await client.query("DELETE FROM academic_years");
    }

    // Order of upserts: academic_years -> semesters -> departments -> programs -> program_courses
    // 1. Upsert academic_years
    for (const year of clientYears) {
      await client.query(
        `INSERT INTO academic_years (id, name, start_date, end_date, is_current)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           is_current = EXCLUDED.is_current`,
        [year.id, year.name, year.startDate, year.endDate, Boolean(year.isCurrent)]
      );
    }

    // 2. Upsert semesters
    for (const sem of clientSemesters) {
      await client.query(
        `INSERT INTO semesters (id, academic_year_id, name, type, start_date, end_date, registration_open, registration_close)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           academic_year_id = EXCLUDED.academic_year_id,
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           registration_open = EXCLUDED.registration_open,
           registration_close = EXCLUDED.registration_close`,
        [
          sem.id,
          sem.academicYearId || null,
          sem.name,
          sem.type || null,
          sem.startDate || null,
          sem.endDate || null,
          sem.registrationOpen || null,
          sem.registrationClose || null
        ]
      );
    }

    // 3. Upsert departments
    for (const dept of clientDepts) {
      await client.query(
        `INSERT INTO departments (id, name, code, head_teacher_id, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           code = EXCLUDED.code,
           head_teacher_id = EXCLUDED.head_teacher_id,
           description = EXCLUDED.description`,
        [
          dept.id,
          dept.name,
          dept.code,
          dept.headTeacherId || null,
          dept.description || null
        ]
      );
    }

    // 4. Upsert programs
    for (const prog of clientProgs) {
      await client.query(
        `INSERT INTO programs (id, department_id, name, code, type, total_credits, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           department_id = EXCLUDED.department_id,
           name = EXCLUDED.name,
           code = EXCLUDED.code,
           type = EXCLUDED.type,
           total_credits = EXCLUDED.total_credits,
           description = EXCLUDED.description`,
        [
          prog.id,
          prog.departmentId,
          prog.name,
          prog.code,
          prog.type || "degree",
          Number(prog.totalCredits) || 0,
          prog.description || null
        ]
      );
    }

    // 5. Upsert program_courses
    for (const pc of clientProgCourses) {
      await client.query(
        `INSERT INTO program_courses (id, program_id, course_id, credits, is_required, semester)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           program_id = EXCLUDED.program_id,
           course_id = EXCLUDED.course_id,
           credits = EXCLUDED.credits,
           is_required = EXCLUDED.is_required,
           semester = EXCLUDED.semester`,
        [
          pc.id,
          pc.programId,
          pc.courseId,
          Number(pc.credits) || 0,
          Boolean(pc.isRequired),
          Number(pc.semester) || 1
        ]
      );
    }

    // Sync notifications
    const clientNotes = store.notifications || [];
    const clientNoteIds = clientNotes.map(n => n.id);
    if (clientNoteIds.length > 0) {
      await client.query(
        "DELETE FROM notifications WHERE id NOT IN (" + 
        clientNoteIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientNoteIds
      );
    } else {
      await client.query("DELETE FROM notifications");
    }

    for (const note of clientNotes) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           type = EXCLUDED.type,
           message = EXCLUDED.message,
           is_read = EXCLUDED.is_read,
           created_at = EXCLUDED.created_at`,
        [note.id, note.userId, note.type, note.message, Boolean(note.isRead), note.createdAt]
      );
    }

    // Sync academic_warnings
    const clientWarnings = store.academicWarnings || [];
    const clientWarningIds = clientWarnings.map(w => w.id);
    if (clientWarningIds.length > 0) {
      await client.query(
        "DELETE FROM academic_warnings WHERE id NOT IN (" + 
        clientWarningIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientWarningIds
      );
    } else {
      await client.query("DELETE FROM academic_warnings");
    }

    for (const w of clientWarnings) {
      await client.query(
        `INSERT INTO academic_warnings (id, student_id, type, message, is_resolved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           type = EXCLUDED.type,
           message = EXCLUDED.message,
           is_resolved = EXCLUDED.is_resolved,
           created_at = EXCLUDED.created_at`,
        [w.id, w.studentId, w.type, w.message, Boolean(w.isResolved), w.createdAt]
      );
    }

    // Sync audit_logs
    const clientLogs = store.auditLogs || [];
    const clientLogIds = clientLogs.map(l => l.id);
    if (clientLogIds.length > 0) {
      await client.query(
        "DELETE FROM audit_logs WHERE id NOT IN (" + 
        clientLogIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientLogIds
      );
    } else {
      await client.query("DELETE FROM audit_logs");
    }

    for (const log of clientLogs) {
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, target, detail, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           action = EXCLUDED.action,
           target = EXCLUDED.target,
           detail = EXCLUDED.detail,
           created_at = EXCLUDED.created_at`,
        [log.id, log.userId, log.action, log.target, log.detail || null, log.createdAt]
      );
    }

    // Sync enrollments
    const clientEnrollments = store.enrollments || [];
    const clientEnrollmentIds = clientEnrollments.map(e => e.id);
    if (clientEnrollmentIds.length > 0) {
      await client.query(
        "DELETE FROM enrollments WHERE id NOT IN (" + 
        clientEnrollmentIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientEnrollmentIds
      );
    } else {
      await client.query("DELETE FROM enrollments");
    }

    for (const e of clientEnrollments) {
      await client.query(
        `INSERT INTO enrollments (id, course_id, student_id, status, enrolled_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           course_id = EXCLUDED.course_id,
           student_id = EXCLUDED.student_id,
           status = EXCLUDED.status,
           enrolled_at = EXCLUDED.enrolled_at,
           completed_at = EXCLUDED.completed_at`,
        [e.id, e.courseId, e.studentId, e.status, e.enrolledAt, e.completedAt || null]
      );
    }

    // Sync transactions
    const clientTransactions = store.transactions || [];
    const clientTxIds = clientTransactions.map(t => t.id);
    if (clientTxIds.length > 0) {
      await client.query(
        "DELETE FROM transactions WHERE id NOT IN (" + 
        clientTxIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientTxIds
      );
    } else {
      await client.query("DELETE FROM transactions");
    }

    for (const t of clientTransactions) {
      await client.query(
        `INSERT INTO transactions (id, student_id, course_id, amount, status, payment_method, created_at, processed_at, processed_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           course_id = EXCLUDED.course_id,
           amount = EXCLUDED.amount,
           status = EXCLUDED.status,
           payment_method = EXCLUDED.payment_method,
           created_at = EXCLUDED.created_at,
           processed_at = EXCLUDED.processed_at,
           processed_by = EXCLUDED.processed_by,
           notes = EXCLUDED.notes`,
        [
          t.id,
          t.studentId,
          t.courseId,
          Number(t.amount) || 0,
          t.status,
          t.paymentMethod,
          t.createdAt,
          t.processedAt || null,
          t.processedBy || null,
          t.notes || null
        ]
      );
    }

    // Sync tuitionFees
    const clientTuition = store.tuitionFees || [];
    const clientTuitionIds = clientTuition.map(tf => tf.id);
    if (clientTuitionIds.length > 0) {
      await client.query(
        "DELETE FROM tuition_fees WHERE id NOT IN (" + 
        clientTuitionIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientTuitionIds
      );
    } else {
      await client.query("DELETE FROM tuition_fees");
    }

    for (const tf of clientTuition) {
      await client.query(
        `INSERT INTO tuition_fees (id, student_id, semester_id, amount, due_date, status, paid_amount, paid_at, receipt_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           semester_id = EXCLUDED.semester_id,
           amount = EXCLUDED.amount,
           due_date = EXCLUDED.due_date,
           status = EXCLUDED.status,
           paid_amount = EXCLUDED.paid_amount,
           paid_at = EXCLUDED.paid_at,
           receipt_code = EXCLUDED.receipt_code`,
        [
          tf.id,
          tf.studentId,
          tf.semesterId || null,
          Number(tf.amount) || 0,
          tf.dueDate,
          tf.status,
          Number(tf.paidAmount) || 0,
          tf.paidAt || null,
          tf.receiptCode || null
        ]
      );
    }

    // Sync advisorNotes
    const clientNotesAdvisor = store.advisorNotes || [];
    const clientNotesAdvisorIds = clientNotesAdvisor.map(n => n.id);
    if (clientNotesAdvisorIds.length > 0) {
      await client.query(
        "DELETE FROM advisor_notes WHERE id NOT IN (" + 
        clientNotesAdvisorIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientNotesAdvisorIds
      );
    } else {
      await client.query("DELETE FROM advisor_notes");
    }

    for (const n of clientNotesAdvisor) {
      await client.query(
        `INSERT INTO advisor_notes (id, advisor_id, student_id, content, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           advisor_id = EXCLUDED.advisor_id,
           student_id = EXCLUDED.student_id,
           content = EXCLUDED.content,
           type = EXCLUDED.type,
           created_at = EXCLUDED.created_at`,
        [
          n.id,
          n.advisorId || null,
          n.studentId,
           n.content,
          n.type,
          n.createdAt
        ]
      );
    }

    // Sync quizzes
    const clientQuizzes = store.quizzes || [];
    const clientQuizIds = clientQuizzes.map(q => q.id);
    if (clientQuizIds.length > 0) {
      await client.query(
        "DELETE FROM quizzes WHERE id NOT IN (" + 
        clientQuizIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientQuizIds
      );
    } else {
      await client.query("DELETE FROM quizzes");
    }

    for (const q of clientQuizzes) {
      await client.query(
        `INSERT INTO quizzes (id, course_id, lesson_id, title, passing_score, time_limit, max_attempts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           course_id = EXCLUDED.course_id,
           lesson_id = EXCLUDED.lesson_id,
           title = EXCLUDED.title,
           passing_score = EXCLUDED.passing_score,
           time_limit = EXCLUDED.time_limit,
           max_attempts = EXCLUDED.max_attempts`,
        [
          q.id,
          q.courseId,
          q.lessonId || null,
          q.title,
          Number(q.passingScore) || 70,
          Number(q.timeLimit) || 15,
          Number(q.maxAttempts) || 3
        ]
      );
    }

    // Sync questions
    const clientQuestions = store.questions || [];
    const clientQuestionIds = clientQuestions.map(qst => qst.id);
    if (clientQuestionIds.length > 0) {
      await client.query(
        "DELETE FROM questions WHERE id NOT IN (" + 
        clientQuestionIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientQuestionIds
      );
    } else {
      await client.query("DELETE FROM questions");
    }

    for (const qst of clientQuestions) {
      await client.query(
        `INSERT INTO questions (id, quiz_id, text, type, options, correct_answer)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           quiz_id = EXCLUDED.quiz_id,
           text = EXCLUDED.text,
           type = EXCLUDED.type,
           options = EXCLUDED.options,
           correct_answer = EXCLUDED.correct_answer`,
        [
          qst.id,
          qst.quizId,
          qst.text,
          qst.type,
          qst.options || [],
          qst.correctAnswer
        ]
      );
    }

    // Sync submissions
    const clientSubmissions = store.submissions || [];
    const clientSubmissionIds = clientSubmissions.map(s => s.id);
    if (clientSubmissionIds.length > 0) {
      await client.query(
        "DELETE FROM submissions WHERE id NOT IN (" + 
        clientSubmissionIds.map((_, i) => `$${i + 1}`).join(",") + ")",
        clientSubmissionIds
      );
    } else {
      await client.query("DELETE FROM submissions");
    }

    for (const sub of clientSubmissions) {
      await client.query(
        `INSERT INTO submissions (id, assignment_id, student_id, content, score, feedback, submitted_at, graded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           assignment_id = EXCLUDED.assignment_id,
           student_id = EXCLUDED.student_id,
           content = EXCLUDED.content,
           score = EXCLUDED.score,
           feedback = EXCLUDED.feedback,
           submitted_at = EXCLUDED.submitted_at,
           graded_at = EXCLUDED.graded_at`,
        [
          sub.id,
          sub.assignmentId,
          sub.studentId,
          sub.content,
          sub.score === undefined || sub.score === null ? null : Number(sub.score),
          sub.feedback || null,
          sub.submittedAt,
          sub.gradedAt || null
        ]
      );
    }

    await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    if (syncQueue.length > 0) {
      const next = syncQueue.shift();
      next!();
    } else {
      isSyncing = false;
    }
  }
}

function dashboardFromStore(store: any, user: User) {
  const scoped = limitStoreForRole(store, user);
  if (user.role === "admin" || user.role === "super_admin") {
    return {
      ...scoped,
      dashboard: {
        users: scoped.users.length,
        courses: scoped.courses.length,
        pendingCourses: scoped.courses.filter((course: any) => course.status === "pending").length,
        activeEnrollments: scoped.enrollments.filter((item: any) => item.status === "active").length
      }
    };
  }
  if (user.role === "teacher") {
    return {
      ...scoped,
      dashboard: {
        courses: scoped.courses.length,
        enrollments: scoped.enrollments.length,
        submissionsToGrade: scoped.submissions.filter((item: any) => item.score === undefined).length
      }
    };
  }
  if (user.role === "student") {
    return {
      ...scoped,
      dashboard: {
        enrolledCourses: scoped.enrollments.length,
        completedLessons: scoped.lessonProgress.filter((item: any) => item.completed).length,
        unpaidFees: scoped.tuitionFees.filter((fee: any) => fee.status !== "paid").length
      }
    };
  }
  return scoped;
}

async function initializeDatabase() {
  await runMigrations(pool);
  await usersRepository.normalizeLegacyRoles(pool);
  await seedAuthUsers(pool);
  await seedCoreLearningData(pool);
  await usersRepository.normalizeSystemUsers(pool);
  registerEventHandlers();
  startScheduler();
}

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }) : null;

app.use("/api", requireCsrf);

app.post("/api/analyze", asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code content is required." });
  if (!ai) return res.status(503).json({ error: "Gemini API Key is not configured in the workspace secrets. Please configure GEMINI_API_KEY in Settings." });
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
}));

app.get("/health", asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "ok", uptime: process.uptime() });
}));

app.post("/api/auth/login", rateLimitLogin, validateBody(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const row = await usersRepository.findAuthByEmail(pool, email) as DbUserRow | null;
  if (!row || !verifyPassword(password, row.password_hash, row.password_salt || undefined)) return res.status(401).json({ error: "Incorrect email or password." });
  if (!row.is_active) return res.status(403).json({ error: "Account inactive." });
  const user = toPublicUser(row);
  setAuthCookie(res, signToken(user));
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  setCsrfCookie(res, csrfToken);
  await auditRepository.log(pool, user.id, "authentication_login", "security", `Authenticated role ${user.role}.`);
  res.json({ user, csrfToken });
}));

app.post("/api/auth/logout", requireAuth, asyncHandler(async (req, res) => {
  const token = extractBearerToken(req);
  if (token) await safeRedis(() => redis.set(`revoked:${token}`, "1", "EX", 60 * 60 * 8), "OK");
  await audit(req, "authentication_logout", "security", "Session closed.");
  clearAuthCookie(res);
  res.status(204).send();
}));

app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));

app.post("/api/users/change-password", requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Vui lòng nhập đầy đủ mật khẩu cũ và mới." });
  
  const row = await usersRepository.findAuthByEmail(pool, req.user!.email) as DbUserRow | null;
  if (!row || !verifyPassword(currentPassword, row.password_hash, row.password_salt || undefined)) {
    return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
  }
  
  const credential = hashPassword(newPassword);
  await pool.query(
    "UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3",
    [credential.hash, credential.salt, req.user!.id]
  );
  
  await audit(req, "change_password", req.user!.id, "User updated their account password.");
  res.json({ ok: true, message: "Đổi mật khẩu thành công!" });
}));

app.patch("/api/student/profile", requireAuth, requireRole(["student"]), validateBody(schemas.updateProfile), asyncHandler(async (req, res) => {
  const { phone, dateOfBirth, gender, address, guardianName, guardianPhone } = req.body;
  const exists = (await pool.query("SELECT id FROM student_profiles WHERE user_id = $1", [req.user!.id])).rowCount;
  
  if (!exists) {
    const profileId = generateId("profile");
    const studentCode = `SV${new Date().getFullYear()}${req.user!.id.slice(-4).toUpperCase()}`;
    await pool.query(
      `INSERT INTO student_profiles (
         id, user_id, student_code, program_id, department_id, academic_year, enrollment_date,
         expected_graduation, status, gpa, total_credits_earned, phone, date_of_birth, gender,
         address, guardian_name, guardian_phone
       ) VALUES ($1, $2, $3, 'prog_se', 'dept_cs', 1, $4, $5, 'active', 0.0, 0, $6, $7, $8, $9, $10, $11)`,
      [
        profileId, req.user!.id, studentCode,
        new Date().toISOString().slice(0, 10),
        new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().slice(0, 10),
        phone || null, dateOfBirth || null, gender || null, address || null, guardianName || null, guardianPhone || null
      ]
    );
  } else {
    await pool.query(
      `UPDATE student_profiles
       SET phone = $1,
           date_of_birth = $2,
           gender = $3,
           address = $4,
           guardian_name = $5,
           guardian_phone = $6
       WHERE user_id = $7`,
      [phone || null, dateOfBirth || null, gender || null, address || null, guardianName || null, guardianPhone || null, req.user!.id]
    );
  }

  if (phone) {
    await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [phone, req.user!.id]);
  }

  await audit(req, "update_profile", req.user!.id, "Student updated their personal profile.");
  res.json({ ok: true, message: "Cập nhật hồ sơ lý lịch thành công!" });
}));

app.get("/api/store", requireAuth, asyncHandler(async (req, res) => res.json(limitStoreForRole(await storeSnapshotFromDb(pool), req.user!))));

app.get("/api/dashboard/admin", requireAuth, requireRole(["admin", "super_admin"]), asyncHandler(async (req, res) => {
  const store = await storeSnapshotFromDb(pool);
  res.json({ ...dashboardFromStore(store, req.user!), auditLogs: await auditRepository.listRecent(pool, 100) });
}));
app.get("/api/dashboard/teacher", requireAuth, requireRole(["teacher"]), asyncHandler(async (req, res) => res.json(dashboardFromStore(await storeSnapshotFromDb(pool), req.user!))));
app.get("/api/dashboard/student", requireAuth, requireRole(["student"]), asyncHandler(async (req, res) => res.json(dashboardFromStore(await storeSnapshotFromDb(pool), req.user!))));
app.get("/api/dashboard/finance", requireAuth, requireRole(["finance", "admin", "super_admin"]), asyncHandler(async (_req, res) => res.json(await financeRepository.getDashboard(pool))));
app.get("/api/dashboard/academic", requireAuth, requireRole(["academic_admin", "admin", "super_admin"]), asyncHandler(async (req, res) => res.json({ ...dashboardFromStore(await storeSnapshotFromDb(pool), req.user!), warnings: await academicsRepository.listWarnings(pool) })));
app.get("/api/dashboard/advisor", requireAuth, requireRole(["advisor"]), asyncHandler(async (req, res) => res.json(await advisorsRepository.getDashboard(pool, req.user!.id))));
app.get("/api/dashboard/parent", requireAuth, requireRole(["parent"]), resolveLinkedStudent, asyncHandler(async (req, res) => res.json(await parentRepository.getDashboard(pool, req.linkedStudentId!))));

app.get("/api/courses", requireAuth, asyncHandler(async (_req, res) => res.json(await coursesRepository.list(pool))));
app.post("/api/courses", requireAuth, requireRole(["teacher", "admin", "super_admin", "academic_admin"]), validateBody(schemas.createCourse), asyncHandler(async (req, res) => {
  const body = req.body;
  const course = await coursesRepository.create(pool, {
    title: body.title,
    description: body.description,
    teacherId: req.user!.role === "teacher" ? req.user!.id : body.teacherId || req.user!.id,
    status: "draft",
    category: body.category,
    thumbnail: body.thumbnail,
    price: body.price,
    level: body.level,
    tags: body.tags
  });
  await audit(req, "create_course", course.id, course.title);
  res.status(201).json(course);
}));
app.post("/api/courses/:id/submit", requireAuth, requireRole(["teacher", "admin", "super_admin", "academic_admin"]), asyncHandler(async (req, res) => {
  if (req.user!.role === "teacher" && !await coursesRepository.teacherOwnsCourse(pool, req.user!.id, req.params.id)) return res.status(403).json({ error: "Permission denied." });
  const course = await coursesRepository.setStatus(pool, req.params.id, "pending");
  if (!course) return res.status(404).json({ error: "Course not found." });
  await audit(req, "submit_course_approval", course.id, course.title);
  res.json(course);
}));
app.post("/api/courses/:id/publish", requireAuth, requireRole(["admin", "super_admin", "academic_admin"]), asyncHandler(async (req, res) => {
  const course = await coursesRepository.setStatus(pool, req.params.id, "published");
  if (!course) return res.status(404).json({ error: "Course not found." });
  await audit(req, "approve_course", course.id, course.title);
  res.json(course);
}));
app.post("/api/courses/:id/reject", requireAuth, requireRole(["admin", "super_admin", "academic_admin"]), validateBody(schemas.rejectCourse), asyncHandler(async (req, res) => {
  const course = await coursesRepository.setStatus(pool, req.params.id, "rejected", req.body.rejectionReason);
  if (!course) return res.status(404).json({ error: "Course not found." });
  await audit(req, "reject_course", course.id, req.body.rejectionReason);
  res.json(course);
}));

app.post("/api/lessons", requireAuth, requireRole(["teacher", "admin", "super_admin"]), validateBody(schemas.addLesson), asyncHandler(async (req, res) => {
  if (req.user!.role === "teacher" && !await coursesRepository.teacherOwnsCourse(pool, req.user!.id, req.body.courseId)) return res.status(403).json({ error: "Permission denied." });
  const lesson = await coursesRepository.addLesson(pool, req.body);
  await audit(req, "add_lesson", lesson.id, lesson.title);
  res.status(201).json(lesson);
}));

app.get("/api/enrollments", requireAuth, asyncHandler(async (req, res) => res.json(await enrollmentsRepository.listForUser(pool, req.user!))));
app.post("/api/enrollments/register", requireAuth, requireRole(["student"]), validateBody(schemas.registerEnrollment), asyncHandler(async (req, res) => {
  const course = await coursesRepository.findById(pool, req.body.courseId);
  if (!course || course.status !== "published") return res.status(404).json({ error: "Published course not found." });
  if (await enrollmentsRepository.existsForCourse(pool, req.user!.id, course.id)) return res.status(409).json({ error: "Enrollment already exists." });
  const isPaid = Number(course.price || 0) > 0;
  const enrollment = await enrollmentsRepository.register(pool, req.user!.id, course.id, isPaid);
  if (isPaid) {
    const txId = generateId("tx");
    await pool.query(
      `INSERT INTO transactions (id, student_id, course_id, amount, status, payment_method, created_at)
       VALUES ($1, $2, $3, $4, 'pending', 'Chuyển khoản Ngân hàng (QR)', $5)`,
      [txId, req.user!.id, course.id, Number(course.price), new Date().toISOString()]
    );
  }
  await audit(req, "enroll_course", course.id, course.title);
  res.status(201).json(enrollment);
}));
app.post("/api/enrollments/:id/activate", requireAuth, requireRole(["admin", "super_admin", "finance"]), asyncHandler(async (req, res) => {
  const enrollment = await enrollmentsRepository.activateEnrollment(pool, req.params.id);
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });
  await audit(req, "activate_enrollment", enrollment.id, `Activated enrollment for student ID: ${enrollment.studentId}`);
  res.json(enrollment);
}));
app.post("/api/progress/toggle", requireAuth, requireRole(["student"]), validateBody(schemas.toggleProgress), asyncHandler(async (req, res) => {
  const enrollment = await enrollmentsRepository.findStudentEnrollment(pool, req.user!.id, req.body.enrollmentId);
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });
  const progress = await enrollmentsRepository.toggleProgress(pool, req.body.enrollmentId, req.body.lessonId);
  await audit(req, "toggle_lesson_progress", req.body.lessonId, `completed=${progress.completed}`);
  res.json(progress);
}));

app.post("/api/quizzes", requireAuth, requireRole(["teacher", "admin", "super_admin"]), validateBody(schemas.createQuiz), asyncHandler(async (req, res) => {
  if (req.user!.role === "teacher" && !await coursesRepository.teacherOwnsCourse(pool, req.user!.id, req.body.courseId)) return res.status(403).json({ error: "Permission denied." });
  const quiz = await quizzesRepository.create(pool, req.body);
  await audit(req, "create_quiz", quiz.id, quiz.title);
  res.status(201).json(quiz);
}));
app.post("/api/quizzes/:id/questions", requireAuth, requireRole(["teacher", "admin", "super_admin"]), validateBody(schemas.addQuestion), asyncHandler(async (req, res) => {
  const quiz = await quizzesRepository.findById(pool, req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  if (req.user!.role === "teacher" && !await coursesRepository.teacherOwnsCourse(pool, req.user!.id, quiz.courseId)) return res.status(403).json({ error: "Permission denied." });
  const question = await quizzesRepository.addQuestion(pool, { ...req.body, quizId: req.params.id });
  await audit(req, "add_quiz_question", question.id, quiz.id);
  res.status(201).json(question);
}));
app.post("/api/quizzes/submit", requireAuth, requireRole(["student"]), validateBody(schemas.submitQuiz), asyncHandler(async (req, res) => {
  const attempt = await quizzesRepository.submitAttempt(pool, req.body.quizId, req.user!.id, req.body.answers, req.body.startedAt);
  if (!attempt) return res.status(404).json({ error: "Quiz not found." });
  await audit(req, "submit_quiz_attempt", attempt.quizId, `Score ${attempt.score}.`);
  res.status(201).json(attempt);
}));

app.post("/api/assignments", requireAuth, requireRole(["teacher", "admin", "super_admin"]), validateBody(schemas.createAssignment), asyncHandler(async (req, res) => {
  if (req.user!.role === "teacher" && !await coursesRepository.teacherOwnsCourse(pool, req.user!.id, req.body.courseId)) return res.status(403).json({ error: "Permission denied." });
  const assignment = await assignmentsRepository.create(pool, req.body);
  await audit(req, "create_assignment", assignment.id, assignment.title);
  res.status(201).json(assignment);
}));
app.post("/api/assignments/submit", requireAuth, requireRole(["student"]), validateBody(schemas.submitAssignment), asyncHandler(async (req, res) => {
  const submission = await assignmentsRepository.submit(pool, req.user!.id, req.body.assignmentId, req.body.content);
  await audit(req, "submit_assignment", submission.id, submission.assignmentId);
  res.status(201).json(submission);
}));
app.post("/api/assignments/grade", requireAuth, requireRole(["teacher", "admin", "super_admin"]), validateBody(schemas.gradeAssignment), asyncHandler(async (req, res) => {
  const submission = await assignmentsRepository.findSubmissionForGrading(pool, req.body.submissionId);
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  if (req.user!.role === "teacher" && submission.teacher_id !== req.user!.id) return res.status(403).json({ error: "Permission denied." });
  if (req.body.score > Number(submission.max_score)) return res.status(400).json({ error: "Invalid score." });
  const result = await assignmentsRepository.grade(pool, req.body.submissionId, req.body.score, req.body.feedback);
  await audit(req, "grade_assignment", req.body.submissionId, `Score ${req.body.score}.`);
  res.json(result);
}));

app.post("/api/admin/users", requireAuth, requireRole(["admin", "super_admin"]), validateBody(schemas.createUser), asyncHandler(async (req, res) => {
  const credential = hashPassword(req.body.password);
  const user: User = {
    id: generateId("user"),
    email: req.body.email,
    passwordHash: credential.hash,
    passwordSalt: credential.salt,
    name: req.body.name,
    role: req.body.role,
    isActive: true,
    phone: req.body.phone,
    linkedStudentId: req.body.linkedStudentId,
    createdAt: new Date().toISOString()
  };
  const created = await usersRepository.create(pool, user);
  await audit(req, "create_user", created.id, created.email);
  res.status(201).json(created);
}));
app.patch("/api/admin/users/:id/status", requireAuth, requireRole(["admin", "super_admin"]), validateBody(schemas.setUserActive), asyncHandler(async (req, res) => {
  const user = await usersRepository.setActive(pool, req.params.id, req.body.isActive);
  if (!user) return res.status(404).json({ error: "User not found." });
  await audit(req, "toggle_user_status", user.id, `isActive=${user.isActive}`);
  res.json(user);
}));

app.get("/api/academics/warnings", requireAuth, asyncHandler(async (req, res) => {
  const canViewAll = ["admin", "super_admin", "academic_admin", "advisor"].includes(req.user!.role);
  res.json(await academicsRepository.listWarnings(pool, canViewAll ? undefined : req.user!.id));
}));
app.post("/api/academics/warnings", requireAuth, requireRole(["academic_admin", "advisor", "admin", "super_admin"]), validateBody(schemas.createWarning), asyncHandler(async (req, res) => {
  const warning = await academicsRepository.createWarning(pool, req.body);
  await audit(req, "create_academic_warning", warning.studentId, warning.message);
  res.status(201).json(warning);
}));
app.post("/api/academics/warnings/:id/resolve", requireAuth, requireRole(["academic_admin", "advisor", "admin", "super_admin"]), asyncHandler(async (req, res) => {
  const warning = await academicsRepository.resolveWarning(pool, req.params.id);
  if (!warning) return res.status(404).json({ error: "Warning not found." });
  await audit(req, "resolve_academic_warning", warning.id, warning.studentId);
  res.json(warning);
}));
app.get("/api/advisor/students", requireAuth, requireRole(["advisor"]), asyncHandler(async (req, res) => res.json(await advisorsRepository.getAssignments(pool, req.user!.id))));
app.get("/api/advisor/at-risk", requireAuth, requireRole(["advisor"]), asyncHandler(async (req, res) => res.json(await advisorsRepository.getAtRiskStudents(pool, req.user!.id))));
app.get("/api/advisor/notes/:studentId", requireAuth, requireRole(["advisor", "academic_admin", "admin", "super_admin"]), asyncHandler(async (req, res) => res.json(await advisorsRepository.getNotes(pool, req.params.studentId))));
app.post("/api/advisor/notes", requireAuth, requireRole(["advisor"]), validateBody(schemas.advisorNote), asyncHandler(async (req, res) => {
  const note = await advisorsRepository.createNote(pool, { advisorId: req.user!.id, ...req.body });
  await audit(req, "add_advisor_note", note.student_id, note.type);
  res.status(201).json(note);
}));

app.patch("/api/advisor/student-profile/:studentId", requireAuth, requireRole(["advisor", "academic_admin", "admin", "super_admin"]), validateBody(schemas.updateStudentNotes), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  await pool.query(
    "UPDATE student_profiles SET notes = $1 WHERE user_id = $2",
    [notes, req.params.studentId]
  );
  await audit(req, "update_student_notes", req.params.studentId, "Advisor updated student academic plan/notes.");
  res.json({ ok: true, message: "Cập nhật đề xuất lộ trình thành công!" });
}));
app.post("/api/advisor/assignments", requireAuth, requireRole(["academic_admin", "admin", "super_admin"]), validateBody(schemas.advisorAssignment), asyncHandler(async (req, res) => {
  const assignment = await advisorsRepository.assignStudent(pool, req.body.advisorId, req.body.studentId, req.body.semesterId);
  res.status(assignment ? 201 : 409).json(assignment || { error: "Advisor assignment already exists." });
}));
app.delete("/api/advisor/assignments/:id", requireAuth, requireRole(["academic_admin", "admin", "super_admin"]), asyncHandler(async (req, res) => {
  const assignment = await advisorsRepository.unassignStudent(pool, req.params.id);
  if (!assignment) return res.status(404).json({ error: "Advisor assignment not found." });
  res.json(assignment);
}));

app.get("/api/parent/grades", requireAuth, requireRole(["parent"]), resolveLinkedStudent, asyncHandler(async (req, res) => res.json(await parentRepository.getGrades(pool, req.linkedStudentId!))));
app.get("/api/parent/attendance", requireAuth, requireRole(["parent"]), resolveLinkedStudent, asyncHandler(async (req, res) => res.json(await parentRepository.getAttendance(pool, req.linkedStudentId!))));
app.get("/api/parent/tuition", requireAuth, requireRole(["parent"]), resolveLinkedStudent, asyncHandler(async (req, res) => res.json(await parentRepository.getTuition(pool, req.linkedStudentId!))));
app.get("/api/parent/warnings", requireAuth, requireRole(["parent"]), resolveLinkedStudent, asyncHandler(async (req, res) => res.json(await parentRepository.getWarnings(pool, req.linkedStudentId!))));
app.get("/api/parent/notifications", requireAuth, requireRole(["parent"]), asyncHandler(async (req, res) => res.json(await parentRepository.getNotifications(pool, req.user!.id))));

app.get("/api/notifications", requireAuth, asyncHandler(async (req, res) => res.json(await notificationsRepository.listForUser(pool, req.user!.id, req.query.unreadOnly === "true"))));
// IMPORTANT: /read-all must be registered BEFORE /:id/read to avoid Express matching "read-all" as an id param
app.patch("/api/notifications/read-all", requireAuth, asyncHandler(async (req, res) => {
  await notificationsRepository.markAllRead(pool, req.user!.id);
  res.status(204).send();
}));
app.patch("/api/notifications/:id/read", requireAuth, asyncHandler(async (req, res) => {
  await notificationsRepository.markRead(pool, req.params.id, req.user!.id);
  res.status(204).send();
}));

app.post("/api/course-registrations", requireAuth, requireRole(["student"]), validateBody(schemas.courseRegistration), asyncHandler(async (req, res) => {
  const result = await courseRegistrationsRepository.register(pool, req.user!.id, req.body.sectionId);
  if ("error" in result) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.row);
}));
app.patch("/api/course-registrations/:id/drop", requireAuth, requireRole(["student"]), asyncHandler(async (req, res) => {
  const registration = await courseRegistrationsRepository.drop(pool, req.params.id, req.user!.id);
  if (!registration) return res.status(404).json({ error: "Course registration not found." });
  res.json(registration);
}));

app.post("/api/grade-appeals", requireAuth, requireRole(["student"]), validateBody(schemas.gradeAppeal), asyncHandler(async (req, res) => {
  const result = await gradeAppealsRepository.create(pool, req.user!.id, req.body);
  if ("error" in result) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.row);
}));
app.get("/api/grade-appeals", requireAuth, asyncHandler(async (req, res) => res.json(await gradeAppealsRepository.list(pool, req.user!))));
app.patch("/api/grade-appeals/:id/review", requireAuth, requireRole(["teacher"]), validateBody(schemas.gradeAppealReview), asyncHandler(async (req, res) => {
  const appeal = await gradeAppealsRepository.review(pool, req.params.id, req.body.revisedGrade);
  if (!appeal) return res.status(404).json({ error: "Grade appeal not found." });
  res.json(appeal);
}));
app.patch("/api/grade-appeals/:id/resolve", requireAuth, requireRole(["academic_admin"]), validateBody(schemas.gradeAppealResolve), asyncHandler(async (req, res) => {
  const appeal = await gradeAppealsRepository.resolve(pool, req.params.id, req.user!.id, req.body.status, req.body.resolutionNote);
  if (!appeal) return res.status(404).json({ error: "Grade appeal not found." });
  res.json(appeal);
}));
app.patch("/api/grade-appeals/:id/escalate", requireAuth, requireRole(["student"]), asyncHandler(async (req, res) => {
  const appeal = await gradeAppealsRepository.escalate(pool, req.params.id, req.user!.id);
  if (!appeal) return res.status(404).json({ error: "Rejected appeal not found or already escalated." });
  res.json(appeal);
}));

app.post("/api/leave-requests", requireAuth, requireRole(["student"]), validateBody(schemas.leaveRequest), asyncHandler(async (req, res) => res.status(201).json(await leaveRequestsRepository.create(pool, req.user!.id, req.body))));
app.get("/api/leave-requests", requireAuth, asyncHandler(async (req, res) => res.json(await leaveRequestsRepository.list(pool, req.user!))));
app.patch("/api/leave-requests/:id/approve", requireAuth, requireRole(["academic_admin"]), validateBody(schemas.reviewNote), asyncHandler(async (req, res) => {
  const request = await leaveRequestsRepository.approve(pool, req.params.id, req.user!.id, req.body.reviewNote);
  if (!request) return res.status(404).json({ error: "Leave request not found." });
  res.json(request);
}));
app.patch("/api/leave-requests/:id/reject", requireAuth, requireRole(["academic_admin"]), validateBody(schemas.reviewNote), asyncHandler(async (req, res) => {
  const request = await leaveRequestsRepository.reject(pool, req.params.id, req.user!.id, req.body.reviewNote);
  if (!request) return res.status(404).json({ error: "Leave request not found." });
  res.json(request);
}));

app.post("/api/graduation-applications", requireAuth, requireRole(["student"]), asyncHandler(async (req, res) => res.status(201).json(await graduationRepository.create(pool, req.user!.id))));
app.get("/api/graduation-applications", requireAuth, asyncHandler(async (req, res) => res.json(await graduationRepository.list(pool, req.user!))));
app.patch("/api/graduation-applications/:id/approve", requireAuth, requireRole(["academic_admin"]), validateBody(schemas.graduationApplicationReview), asyncHandler(async (req, res) => {
  const application = await graduationRepository.approve(pool, req.params.id, req.user!.id, req.body.note);
  if (!application) return res.status(404).json({ error: "Graduation application not found." });
  res.json(application);
}));
app.patch("/api/graduation-applications/:id/reject", requireAuth, requireRole(["academic_admin"]), validateBody(schemas.graduationApplicationReview), asyncHandler(async (req, res) => {
  const application = await graduationRepository.reject(pool, req.params.id, req.user!.id, req.body.note);
  if (!application) return res.status(404).json({ error: "Graduation application not found." });
  res.json(application);
}));

app.get("/api/scholarships", requireAuth, asyncHandler(async (_req, res) => res.json(await scholarshipsRepository.list(pool))));
app.post("/api/scholarships", requireAuth, requireRole(["finance", "admin", "super_admin"]), validateBody(schemas.scholarship), asyncHandler(async (req, res) => res.status(201).json(await scholarshipsRepository.create(pool, req.body))));
app.get("/api/scholarship-applications", requireAuth, asyncHandler(async (req, res) => res.json(await scholarshipsRepository.listApplications(pool, req.user!))));
app.post("/api/scholarship-applications", requireAuth, requireRole(["student"]), validateBody(schemas.scholarshipApplication), asyncHandler(async (req, res) => res.status(201).json(await scholarshipsRepository.apply(pool, req.user!.id, req.body))));
app.patch("/api/scholarship-applications/:id/approve", requireAuth, requireRole(["finance"]), validateBody(schemas.reviewNote), asyncHandler(async (req, res) => {
  const application = await scholarshipsRepository.approve(pool, req.params.id, req.user!.id, req.body.reviewNote);
  if (!application) return res.status(404).json({ error: "Scholarship application not found." });
  res.json(application);
}));
app.patch("/api/scholarship-applications/:id/reject", requireAuth, requireRole(["finance"]), validateBody(schemas.reviewNote), asyncHandler(async (req, res) => {
  const application = await scholarshipsRepository.reject(pool, req.params.id, req.user!.id, req.body.reviewNote);
  if (!application) return res.status(404).json({ error: "Scholarship application not found." });
  res.json(application);
}));

app.get("/api/academic-warnings", requireAuth, asyncHandler(async (req, res) => {
  const studentId = req.user!.role === "student" ? req.user!.id : typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(await academicsRepository.listWarnings(pool, studentId));
}));
app.patch("/api/academic-warnings/:id/resolve", requireAuth, requireRole(["advisor", "academic_admin"]), asyncHandler(async (req, res) => {
  const warning = await academicsRepository.resolveWarning(pool, req.params.id, req.user!.id);
  if (!warning) return res.status(404).json({ error: "Warning not found." });
  res.json(warning);
}));

app.post("/api/tuition/pay", requireAuth, requireRole(["finance", "admin", "super_admin"]), validateBody(schemas.payTuition), asyncHandler(async (req, res) => {
  const result = await financeRepository.payTuition(pool, req.body.feeId, req.body.paidAmount);
  if (!result) return res.status(404).json({ error: "Tuition fee not found." });
  await audit(req, "record_tuition_payment", req.body.feeId, `Paid amount ${req.body.paidAmount}.`);
  res.json(result);
}));

app.post("/api/store/sync", requireAuth, asyncHandler(async (req, res) => {
  if (!["admin", "super_admin", "academic_admin", "finance"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Permission denied." });
  }
  await syncClientStoreToDb(req.body || {});
  await audit(req, "store_sync", "store", "Client store changes synchronized into Postgres.");
  res.json({ ok: true, mode: "postgres-synchronized" });
}));

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
