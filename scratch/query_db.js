const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    const usersRes = await client.query('SELECT id, email, role FROM auth.users LIMIT 10');
    console.log('--- auth.users ---');
    console.log(usersRes.rows);

    const profilesRes = await client.query('SELECT id, email, role, status, oia_eligible FROM public.profiles LIMIT 10');
    console.log('--- public.profiles ---');
    console.log(profilesRes.rows);
  } catch (err) {
    console.error('Failed to query:', err);
  } finally {
    await client.end();
  }
}

run();
