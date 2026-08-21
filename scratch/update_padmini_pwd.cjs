const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');
    const res = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = crypt('padmini@1726', gen_salt('bf', 10)) 
      WHERE email = 'padmini@anurag.edu.in'
    `);
    console.log('Password update result:', res.rowCount, 'rows updated.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
