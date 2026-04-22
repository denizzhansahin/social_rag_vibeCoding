const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ai_user',
    password: 'ai_password_123',
    database: 'cognitive_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'master_identities'
    `);
    console.log('Columns in master_identities:', JSON.stringify(res.rows, null, 2));

    const rowCount = await client.query('SELECT COUNT(*) FROM master_identities');
    console.log('Row count in master_identities:', rowCount.rows[0].count);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
