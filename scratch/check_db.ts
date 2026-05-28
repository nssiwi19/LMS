import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const years = await pool.query("SELECT * FROM academic_years");
  console.log("--- Academic Years in DB ---");
  console.log(years.rows);

  const semesters = await pool.query("SELECT * FROM semesters");
  console.log("--- Semesters in DB ---");
  console.log(semesters.rows);

  const departments = await pool.query("SELECT * FROM departments");
  console.log("--- Departments in DB ---");
  console.log(departments.rows);

  const programs = await pool.query("SELECT * FROM programs");
  console.log("--- Programs in DB ---");
  console.log(programs.rows);

  const warnings = await pool.query("SELECT * FROM academic_warnings");
  console.log("--- Academic Warnings in DB ---");
  console.log(warnings.rows);
}

main().catch(console.error).finally(() => pool.end());
