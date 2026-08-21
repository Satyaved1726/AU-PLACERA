const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Set default value for created_by column in digital_announcements table
    await client.query(`
      ALTER TABLE public.digital_announcements 
      ALTER COLUMN created_by SET DEFAULT auth.uid()
    `);
    console.log('Database schema updated: digital_announcements.created_by now defaults to auth.uid()');
  } catch (err) {
    console.error('Failed to update database schema:', err);
  } finally {
    await client.end();
  }
}

run();
