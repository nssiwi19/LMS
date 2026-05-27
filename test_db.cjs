const dotenv = require('dotenv');
const pg = require('pg');
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

const { notificationsRepository } = require('./src/server/repositories/notifications');

async function main() {
  console.log('Before marking all as read:');
  const before = await pool.query("SELECT id, user_id, message, is_read FROM notifications WHERE user_id = 'user_student'");
  console.log(before.rows);

  console.log('Running markAllRead...');
  await notificationsRepository.markAllRead(pool, 'user_student');

  console.log('After marking all as read:');
  const after = await pool.query("SELECT id, user_id, message, is_read FROM notifications WHERE user_id = 'user_student'");
  console.log(after.rows);
}

main().catch(console.error).finally(() => pool.end());
