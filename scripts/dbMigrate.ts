import dotenv from "dotenv";
import pg from "pg";
import { runMigrations } from "../src/dbMigrations";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

runMigrations(pool)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .finally(() => pool.end());
