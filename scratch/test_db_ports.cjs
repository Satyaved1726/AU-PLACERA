const { Client } = require('pg');

async function test(host, port) {
  const connectionString = `postgresql://postgres.yjcixgzqjcoinlfsqsoa:auplacements@hod@${host}:${port}/postgres`;
  const client = new Client({ connectionString });
  try {
    console.log(`Trying to connect to ${host}:${port}...`);
    await client.connect();
    console.log(`Success connecting to ${host}:${port}!`);
    const res = await client.query('SELECT current_database()');
    console.log('Query result:', res.rows);
    return true;
  } catch (err) {
    console.error(`Failed connecting to ${host}:${port}:`, err.message);
    return false;
  } finally {
    await client.end();
  }
}

async function run() {
  const hosts = [
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-eu-west-1.pooler.supabase.com',
    'aws-0-us-west-2.pooler.supabase.com',
    'aws-0-eu-west-2.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com',
    'aws-0-ap-northeast-1.pooler.supabase.com',
    'aws-0-ca-central-1.pooler.supabase.com'
  ];
  for (const host of hosts) {
    const ok = await test(host, 6543);
    if (ok) {
      console.log('ACTIVE REGION IDENTIFIED:', host);
      break;
    }
  }
}

run();
