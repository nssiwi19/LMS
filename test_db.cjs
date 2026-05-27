const dotenv = require('dotenv');
const pg = require('pg');
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

async function main() {
  console.log('Attempting to change role of user_le_tan...');
  try {
    const res = await pool.query("UPDATE users SET role = 'finance' WHERE id = 'user_le_tan' RETURNING *");
    console.log('Update success:', res.rows[0]);
    // Reset back to le_tan
    await pool.query("UPDATE users SET role = 'le_tan' WHERE id = 'user_le_tan'");
    console.log('Reset back successfully');
  } catch (e) {
    console.error('Update failed:', e.message);
  }
}

main().catch(console.error).finally(() => pool.end());
