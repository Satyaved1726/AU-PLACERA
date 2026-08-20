const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    const res = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = crypt('admin12345', gen_salt('bf', 10)) 
      WHERE email = 'padmini@anurag.edu.in'
    `);
    console.log('Password reset result:', res.rowCount, 'rows updated.');
  } catch (err) {
    console.error('Failed to reset password:', err);
  } finally {
    await client.end();
  }
}

run();
