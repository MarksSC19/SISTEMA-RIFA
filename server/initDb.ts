import { Client } from 'pg';

async function setupDatabase() {
  const adminClient = new Client({
    host: 'localhost',
    port: 5433,
    user: 'marks',
    password: '123456789',
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    // Check if database exists
    const checkDb = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'rifas_db'");
    if (checkDb.rows.length === 0) {
      console.log("Database 'rifas_db' does not exist. Creating...");
      await adminClient.query('CREATE DATABASE rifas_db');
      console.log("Database 'rifas_db' created successfully!");
    } else {
      console.log("Database 'rifas_db' already exists.");
    }
    await adminClient.end();
  } catch (err: any) {
    console.error('Error during database creation:', err.message);
    await adminClient.end().catch(() => {});
    process.exit(1);
  }
}

setupDatabase();
