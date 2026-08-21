const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');
    const res = await client.query("SELECT id, opportunity_title, original_content FROM public.posts WHERE original_content ILIKE '%Naveen%'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
