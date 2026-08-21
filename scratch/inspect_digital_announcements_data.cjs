const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');
    const res = await client.query("SELECT id, title, created_by, created_at FROM public.digital_announcements LIMIT 10");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
