import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  username: process.env.PG_USER || 'ai_user',
  password: process.env.PG_PASSWORD || 'ai_password_123',
  database: process.env.PG_DB || 'cognitive_db',
  logging: true,
});

async function run() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('Connected.');

    const users = await dataSource.query('SELECT count(*) FROM master_identities');
    console.log('Users count:', users);

    const groups = await dataSource.query('SELECT count(*) FROM groups');
    console.log('Groups count:', groups);

    const events = await dataSource.query('SELECT count(*) FROM events');
    console.log('Events count:', events);

    if (users[0].count > 0) {
        const sampleUser = await dataSource.query('SELECT id, email, role, status FROM master_identities LIMIT 1');
        console.log('Sample User:', sampleUser);
    }

    await dataSource.destroy();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
