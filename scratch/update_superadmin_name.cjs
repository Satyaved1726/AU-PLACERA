const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');
    const res = await client.query(`
      UPDATE public.profiles 
      SET full_name = 'Super Admin' 
      WHERE email = 'superadmin@anurag.edu.in'
    `);
    console.log('Profile update result:', res.rowCount, 'rows updated.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
