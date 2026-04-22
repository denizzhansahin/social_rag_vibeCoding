const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://ai_user:ai_password_123@127.0.0.1:5432/cognitive_db"
});

async function runFix() {
  try {
    await client.connect();
    console.log('Connected to cognitive_db');

    // 1. Drop old table
    console.log('Dropping old matching table if exists...');
    await client.query('DROP TABLE IF EXISTS ai_matching_results CASCADE');

    // 2. Clear old constraints (just in case they were on other tables)
    // Done by drop cascade

    // 3. Recreate table with correct schema
    console.log('Creating matching table with UUID and matched_at...');
    await client.query(`
      CREATE TABLE ai_matching_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_a_id UUID NOT NULL,
        user_b_id UUID NOT NULL,
        similarity_score FLOAT NOT NULL,
        matched_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_pairs UNIQUE (user_a_id, user_b_id)
      )
    `);

    console.log('✅ Database schema harmonized successfully.');

  } catch (err) {
    console.error('❌ Error fixing schema:', err);
  } finally {
    await client.end();
  }
}

runFix();
