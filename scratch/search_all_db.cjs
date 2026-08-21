const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // 1. Search in columns default values
    const defaultsRes = await client.query(`
      SELECT table_schema, table_name, column_name, column_default 
      FROM information_schema.columns 
      WHERE column_default ILIKE '%Naveen%' OR column_default ILIKE '%Naveenetha%'
    `);
    console.log('--- Matching Column Defaults ---');
    console.log(defaultsRes.rows);

    // 2. Search in all functions and triggers source code
    const procsRes = await client.query(`
      SELECT proname, prosrc 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE prosrc ILIKE '%Naveen%' OR prosrc ILIKE '%Naveenetha%'
    `);
    console.log('--- Matching pg_proc (Functions) ---');
    console.log(procsRes.rows);

    // 3. Search in all trigger definitions
    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement 
      FROM information_schema.triggers 
      WHERE action_statement ILIKE '%Naveen%' OR action_statement ILIKE '%Naveenetha%'
    `);
    console.log('--- Matching Triggers ---');
    console.log(triggersRes.rows);

    // 4. Search in profiles table for any text column containing the name
    const profilesWildRes = await client.query(`
      SELECT * FROM public.profiles 
      WHERE full_name ILIKE '%Naveenetha%' 
         OR email ILIKE '%Naveenetha%'
         OR designation ILIKE '%Naveenetha%'
    `);
    console.log('--- Matching Profiles (Designation/Name) ---');
    console.log(profilesWildRes.rows);

  } catch (err) {
    console.error('Failed to search database:', err);
  } finally {
    await client.end();
  }
}

run();
