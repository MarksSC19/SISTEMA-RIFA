import { Client } from 'pg';

async function testPostgresUser() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '123456789',
    database: 'postgres',
  });
  try {
    await client.connect();
    console.log('SUCCESS: user "postgres" with password "123456789" connected!');
    const res = await client.query('SELECT current_user');
    console.log(res.rows);
    await client.end();
  } catch (err: any) {
    console.log('FAILED:', err.message);
  }
}

testPostgresUser();
