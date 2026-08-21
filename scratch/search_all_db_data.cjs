const { Client } = require('pg');
const connectionString = 'postgresql://postgres:auplacements@hod@db.yjcixgzqjcoinlfsqsoa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Find all text columns in all public tables
    const columnsRes = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('text', 'character varying', 'user-defined')
    `);

    for (const row of columnsRes.rows) {
      const { table_name, column_name } = row;
      try {
        const checkRes = await client.query(`
          SELECT COUNT(*) 
          FROM public."${table_name}" 
          WHERE CAST("${column_name}" AS TEXT) ILIKE '%Naveen%'
        `);
        const count = parseInt(checkRes.rows[0].count, 10);
        if (count > 0) {
          console.log(`Found match in Table: ${table_name} | Column: ${column_name} | Count: ${count}`);
          const dataRes = await client.query(`
            SELECT * 
            FROM public."${table_name}" 
            WHERE CAST("${column_name}" AS TEXT) ILIKE '%Naveen%'
            LIMIT 5
          `);
          console.log(dataRes.rows);
        }
      } catch (e) {
        // Ignore column cast errors or invalid types
      }
    }

  } catch (err) {
    console.error('Database search failed:', err);
  } finally {
    await client.end();
  }
}

run();
