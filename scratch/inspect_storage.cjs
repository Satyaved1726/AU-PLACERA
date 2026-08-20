const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // 1. Inspect RLS status on storage tables
    const tablesRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'storage'
    `);
    console.log('--- Storage Tables RLS Status ---');
    console.log(tablesRes.rows);

    // 2. Query all policies on storage schema
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'storage'
    `);
    console.log('--- Storage Policies ---');
    policiesRes.rows.forEach(policy => {
      console.log(`Table: ${policy.tablename} | Policy: ${policy.policyname} | Command: ${policy.cmd}`);
      console.log(`  Roles: ${policy.roles}`);
      console.log(`  USING: ${policy.qual}`);
      console.log(`  WITH CHECK: ${policy.with_check}`);
      console.log('----------------------------------------------------');
    });

  } catch (err) {
    console.error('Failed to query:', err);
  } finally {
    await client.end();
  }
}

run();
