import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the Postgres/Supabase backend.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30, // Tăng kích thước connection pool lên 30 để phục vụ song song tốt hơn
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

export type Queryable = Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">;
