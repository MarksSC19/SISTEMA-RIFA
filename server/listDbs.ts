import { Client } from 'pg';

async function listDatabases() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'marks',
    password: '123456789',
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT datname, pg_catalog.pg_get_userbyid(datdba) as owner FROM pg_database');
    console.log('Databases:', res.rows);
    await client.end();
  } catch (err: any) {
    console.error('Error listing databases:', err.message);
    await client.end().catch(() => {});
  }
}

listDatabases();
