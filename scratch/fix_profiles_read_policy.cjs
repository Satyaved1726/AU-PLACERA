const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Drop existing restrictive select policies if they exist (to avoid clutter)
    // and create a permissive read-all policy for authenticated users.
    await client.query(`
      DROP POLICY IF EXISTS "Anyone authenticated can read all profiles" ON public.profiles;
      CREATE POLICY "Anyone authenticated can read all profiles" ON public.profiles
        FOR SELECT TO authenticated
        USING (true);
    `);
    console.log('Permissive profiles SELECT policy created successfully.');
  } catch (err) {
    console.error('Failed to update RLS policies:', err);
  } finally {
    await client.end();
  }
}

run();
