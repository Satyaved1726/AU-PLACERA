const { Client } = require('pg');

const connectionString = 'postgresql://postgres.yjcixgzqjcoinlfsqsoa:auplacements@hod@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Find the UUID of padmini@anurag.edu.in
    const findRes = await client.query(`
      SELECT id, full_name, email, role FROM public.profiles 
      WHERE email = 'padmini@anurag.edu.in'
    `);

    if (findRes.rows.length === 0) {
      console.error('Error: Admin user padmini@anurag.edu.in not found in database.');
      return;
    }

    const userId = findRes.rows[0].id;
    console.log(`Found admin user ID: ${userId}`);

    // 2. Update auth.users encrypted password
    console.log('Updating password in auth.users...');
    const authRes = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = crypt('sravanth@1726', gen_salt('bf', 10)) 
      WHERE id = $1
    `, [userId]);
    console.log('Password updated successfully in auth.users:', authRes.rowCount, 'rows.');

    // 3. Update public.profiles (email and full_name).
    // Note: The on_profile_updated trigger will automatically sync email and metadata back to auth.users.
    console.log('Updating email and full_name in public.profiles...');
    const profileRes = await client.query(`
      UPDATE public.profiles 
      SET email = 'sravanth@anurag.edu.in', full_name = 'Sravanth' 
      WHERE id = $1
    `, [userId]);
    console.log('Profile updated successfully:', profileRes.rowCount, 'rows.');

    // 4. Verify the updates
    const verifyRes = await client.query(`
      SELECT id, email, raw_user_meta_data->>'full_name' as meta_name FROM auth.users WHERE id = $1
    `, [userId]);
    console.log('Verification auth.users:', verifyRes.rows);

    const verifyProfile = await client.query(`
      SELECT id, email, full_name FROM public.profiles WHERE id = $1
    `, [userId]);
    console.log('Verification public.profiles:', verifyProfile.rows);

  } catch (err) {
    console.error('Failed to perform admin update:', err);
  } finally {
    await client.end();
  }
}

run();
