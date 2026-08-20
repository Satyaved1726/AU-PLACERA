const { Client } = require('pg');

const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Print the definition of auth.jwt()
    const res = await client.query(`
      SELECT prosrc 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'auth' AND proname = 'jwt'
    `);
    
    if (res.rowCount > 0) {
      console.log('--- auth.jwt() Source Code ---');
      console.log(res.rows[0].prosrc);
    } else {
      console.log('auth.jwt() not found.');
    }
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
