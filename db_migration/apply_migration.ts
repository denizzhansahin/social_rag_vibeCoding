import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from api-gateway
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DB,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sqlPath = path.join(__dirname, '014_role_sync_and_core_objects.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Running migration 014...');
    const res = await client.query(sql);
    
    // Multiple results might come back due to multiple statements
    if (Array.isArray(res)) {
      res.forEach(r => {
        if (r.rows && r.rows[0]) console.log('Result:', r.rows[0]);
      });
    } else {
      console.log('Result:', res.rows[0]);
    }

    console.log('✨ Migration applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
