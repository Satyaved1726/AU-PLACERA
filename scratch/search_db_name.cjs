const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Search profiles table
    const profilesRes = await client.query("SELECT * FROM public.profiles WHERE full_name ILIKE '%Naveen%' OR email ILIKE '%Naveen%'");
    console.log('--- profiles matching Naveen ---');
    console.log(profilesRes.rows);

    // Search posts table
    const postsRes = await client.query("SELECT * FROM public.posts LIMIT 5");
    console.log('--- posts sample ---');
    console.log(postsRes.rows);

  } catch (err) {
    console.error('Failed to search:', err);
  } finally {
    await client.end();
  }
}

run();
