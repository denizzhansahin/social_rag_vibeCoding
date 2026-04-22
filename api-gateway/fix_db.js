const { Client } = require('pg');
const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'ai_user',
  password: 'ai_password_123',
  database: 'cognitive_db',
});
client.connect().then(async () => {
    try {
        await client.query('ALTER TABLE ai_matching_results ADD CONSTRAINT unique_user_pairs UNIQUE(user_a_id, user_b_id)');
        console.log("Success: Unique constraint added.");
    } catch(err) {
        console.error("Error or already exists:", err.message);
    } finally {
        await client.end();
    }
});
