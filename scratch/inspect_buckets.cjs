const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    const bucketsRes = await client.query('SELECT * FROM storage.buckets');
    console.log('--- storage.buckets ---');
    console.log(bucketsRes.rows);

  } catch (err) {
    console.error('Failed to query buckets:', err);
  } finally {
    await client.end();
  }
}

run();
