import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const schemaPath = path.resolve('server/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (process.env.DATABASE_URL) {
    console.log('Connecting to cloud PostgreSQL via DATABASE_URL...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    });

    await client.connect();
    console.log('Applying schema.sql to database...');
    await client.query(schemaSql);
    console.log('Schema applied successfully!');

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables in database:', tables.rows.map(r => r.table_name));
    await client.end();
    return;
  }

  // Localhost fallback
  console.log(`Connecting to local PostgreSQL on port ${process.env.DB_PORT || '5433'}...`);
  const rootClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789',
    database: 'postgres',
  });

  await rootClient.connect();

  const dbName = process.env.DB_NAME || 'rifas_db';
  const checkDb = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
  if (checkDb.rows.length === 0) {
    console.log(`Creating database '${dbName}'...`);
    await rootClient.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database '${dbName}' created successfully.`);
  } else {
    console.log(`Database '${dbName}' already exists.`);
  }
  await rootClient.end();

  const dbClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789',
    database: dbName,
  });

  await dbClient.connect();
  console.log(`Applying schema to '${dbName}'...`);
  await dbClient.query(schemaSql);
  console.log('Schema applied successfully!');

  const tables = await dbClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables in database:', tables.rows.map(r => r.table_name));

  await dbClient.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
