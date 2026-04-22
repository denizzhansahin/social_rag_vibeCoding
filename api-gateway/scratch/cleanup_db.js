const { Client } = require('pg');

async function cleanup() {
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

    // Count null emails
    const countRes = await client.query('SELECT COUNT(*) FROM master_identities WHERE email IS NULL');
    console.log(`Found ${countRes.rows[0].count} rows with NULL email`);

    if (parseInt(countRes.rows[0].count) > 0) {
      // Delete rows with null email
      await client.query('DELETE FROM master_identities WHERE email IS NULL');
      console.log('Deleted rows with NULL email');
    }

    // Also check for empty strings just in case
    const countEmptyRes = await client.query("SELECT COUNT(*) FROM master_identities WHERE email = ''");
    console.log(`Found ${countEmptyRes.rows[0].count} rows with empty string email`);

    await client.end();
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanup();
