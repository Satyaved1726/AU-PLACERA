const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.yjcixgzqjcoinlfsqsoa:auplacements@hod@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, '../supabase/migrations/20_student_eligibility.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying migration 20_student_eligibility.sql...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Failed to apply migration:', err);
  } finally {
    await client.end();
  }
}

run();
