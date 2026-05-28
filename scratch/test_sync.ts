import dotenv from "dotenv";
import pg from "pg";
import { getInitialStore } from "../src/store";
import { generateId } from "../src/server/ids";
import { User, LMSDataStore } from "../src/types";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

import { denormalizeRole } from "../src/server/mappers";

const safeDateStr = (d: any) => {
  if (!d) return null;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

let isSyncing = false;
const syncQueue: (() => void)[] = [];

async function syncClientStoreToDb(store: Partial<LMSDataStore>) {
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
              Boolean(user.isActive),
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

      // Sync academic_years
      if (store.academicYears !== undefined) {
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
      }

      // Sync semesters
      if (store.semesters !== undefined) {
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
      }

      // Sync departments
      if (store.departments !== undefined) {
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
      }

      // Sync programs
      if (store.programs !== undefined) {
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
      }

      await client.query("COMMIT");
      console.log("Sync succeeded and committed!");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    isSyncing = false;
  }
}

import { storeSnapshotFromDb } from "../src/server/repositories/storeSnapshot";

async function main() {
  console.log("Loading store snapshot from DB...");
  const dbStore = await storeSnapshotFromDb(pool);
  
  // Clone it
  const store = JSON.parse(JSON.stringify(dbStore));
  
  // Test adding a Year
  store.academicYears.push({
    id: generateId("ay"),
    name: "2026-2027",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    isCurrent: false
  });

  console.log("Running syncClientStoreToDb...");
  await syncClientStoreToDb(store);
}

main().catch(console.error).finally(() => pool.end());
