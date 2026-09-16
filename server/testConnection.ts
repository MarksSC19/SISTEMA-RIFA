import { Client } from 'pg';

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'marks',
    password: '123456789',
    database: 'postgres',
  });
  try {
    await client.connect();
    console.log('SUCCESS: Connected as user "marks" on port 5433!');
    const res = await client.query('SELECT current_user, current_database(), version()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('FAILED:', err.message);
  }
}

testConnection();
