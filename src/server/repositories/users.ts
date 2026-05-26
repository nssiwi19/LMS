import { Queryable } from "../db";
import { DbUserRow, normalizeRole, toPublicUser } from "../mappers";
import { User } from "../../types";

export const usersRepository = {
  async normalizeLegacyRoles(db: Queryable) {
    await db.query(`
      UPDATE users SET role = 'finance' WHERE role = 'ke_toan';
      UPDATE users SET role = 'academic_admin' WHERE role IN ('quan_ly_hoc_vu', 'academic');
    `);
  },

  async normalizeSystemUsers(db: Queryable) {
    const systemUsers = [
      ["finance@e16.local", "Nguyễn Văn Kế Toán"],
      ["le_tan@e16.local", "Lê Thị Lễ Tân"],
      ["academic@e16.local", "Trần Văn Học Vụ"],
      ["advisor@e16.local", "Phạm Cố Vấn (Cố vấn Học tập)"]
    ];

    for (const [email, name] of systemUsers) {
      await db.query(
        "UPDATE users SET name = $1 WHERE lower(email) = $2",
        [name, email]
      );
    }
  },

  async count(db: Queryable) {
    return Number((await db.query("SELECT COUNT(*) AS count FROM users")).rows[0].count);
  },

  async findAuthByEmail(db: Queryable, email: string) {
    return (await db.query<DbUserRow>("SELECT * FROM users WHERE lower(email) = $1", [email.toLowerCase()])).rows[0] || null;
  },

  async findById(db: Queryable, id: string) {
    const row = (await db.query<DbUserRow>("SELECT * FROM users WHERE id = $1", [id])).rows[0];
    return row ? toPublicUser(row) : null;
  },

  async list(db: Queryable) {
    return (await db.query<DbUserRow>("SELECT * FROM users ORDER BY created_at DESC")).rows.map(toPublicUser);
  },

  async create(db: Queryable, user: User) {
    await db.query(
      `INSERT INTO users (id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [user.id, user.email.toLowerCase(), user.passwordHash, user.passwordSalt || null, user.name, normalizeRole(user.role), user.isActive, user.phone || null, user.linkedStudentId || null, user.createdAt]
    );
    return { ...user, passwordHash: "" };
  },

  async seed(db: Queryable, users: User[]) {
    for (const user of users) {
      await db.query(
        `INSERT INTO users (id, email, password_hash, password_salt, name, role, is_active, phone, linked_student_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email.toLowerCase(), user.passwordHash, user.passwordSalt || null, user.name, normalizeRole(user.role), user.isActive, user.phone || null, user.linkedStudentId || null, user.createdAt]
      );
    }
  },

  async setActive(db: Queryable, id: string, isActive: boolean) {
    const row = (await db.query<DbUserRow>("UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *", [isActive, id])).rows[0];
    return row ? toPublicUser(row) : null;
  }
};
