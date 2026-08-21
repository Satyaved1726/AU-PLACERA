const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');
    const res = await client.query("SELECT id, email, raw_user_meta_data FROM auth.users");
    res.rows.forEach(row => {
      console.log(`Email: ${row.email}`);
      console.log('Metadata:', JSON.stringify(row.raw_user_meta_data, null, 2));
      console.log('-------------------------------------------');
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
