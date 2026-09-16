import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('Connecting to PostgreSQL on port 5433 as user postgres...');
  const rootClient = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '123456789',
    database: 'postgres',
  });

  await rootClient.connect();

  // Create database if not exists
  const checkDb = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = 'rifas_db'");
  if (checkDb.rows.length === 0) {
    console.log("Creating database 'rifas_db'...");
    await rootClient.query('CREATE DATABASE rifas_db');
    console.log("Database 'rifas_db' created successfully.");
  } else {
    console.log("Database 'rifas_db' already exists.");
  }
  await rootClient.end();

  // Connect to rifas_db and apply schema
  console.log("Connecting to 'rifas_db' to apply schema...");
  const dbClient = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '123456789',
    database: 'rifas_db',
  });

  await dbClient.connect();
  const schemaPath = path.resolve('server/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await dbClient.query(schemaSql);
  console.log('Schema applied successfully to rifas_db!');

  // Verify created tables
  const tables = await dbClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables in rifas_db:', tables.rows.map(r => r.table_name));

  await dbClient.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
