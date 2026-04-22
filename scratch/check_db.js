const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/vizyon_kampi"
});

async function check() {
  try {
    await client.connect();
    
    // Check master_identities
    const users = await client.query('SELECT count(*) FROM master_identities');
    console.log(`Total Users: ${users.rows[0].count}`);
    
    // Check matching results
    const matches = await client.query('SELECT count(*) FROM ai_matching_results');
    console.log(`Total Matches: ${matches.rows[0].count}`);
    
    if (parseInt(matches.rows[0].count) > 0) {
      const sample = await client.query('SELECT * FROM ai_matching_results LIMIT 5');
      console.log('Sample Matches:', JSON.stringify(sample.rows, null, 2));
    } else {
      console.log('No matches found in ai_matching_results table.');
    }
    
    // Check for specific IDs from the user's logs if possible
    // User ID: 318bfd6e-6ef6-4741-a7fd-bf19e5410f42
    const targetId = '318bfd6e-6ef6-4741-a7fd-bf19e5410f42';
    const userCheck = await client.query('SELECT id, email, role, has_completed_onboarding FROM master_identities WHERE id = $1', [targetId]);
    console.log('User 318bfd6e Check:', JSON.stringify(userCheck.rows, null, 2));

    const matchCheck = await client.query('SELECT * FROM ai_matching_results WHERE user_a_id = $1 OR user_b_id = $1', [targetId]);
    console.log('Matches for User 318bfd6e:', JSON.stringify(matchCheck.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

check();
