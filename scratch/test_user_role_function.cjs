const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Check role function for superadmin
    const saUser = await client.query("SELECT id FROM auth.users WHERE email = 'superadmin@anurag.edu.in'");
    const saId = saUser.rows[0]?.id;
    if (saId) {
      const saRoleRes = await client.query("SELECT public.get_user_role($1)", [saId]);
      console.log('superadmin role via function:', saRoleRes.rows[0]);
    } else {
      console.log('superadmin user not found');
    }

    // Check role function for padmini
    const padminiUser = await client.query("SELECT id FROM auth.users WHERE email = 'padmini@anurag.edu.in'");
    const padminiId = padminiUser.rows[0]?.id;
    if (padminiId) {
      const padminiRoleRes = await client.query("SELECT public.get_user_role($1)", [padminiId]);
      console.log('padmini role via function:', padminiRoleRes.rows[0]);
    } else {
      console.log('padmini user not found');
    }

  } catch (err) {
    console.error('Failed to query:', err);
  } finally {
    await client.end();
  }
}

run();
