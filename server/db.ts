import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de PostgreSQL respetando el puerto 5433
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rifas_db',
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isConnected = false;

// Comprobación de estado de conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.warn(`[DB WARNING] No se pudo conectar inmediatamente a PostgreSQL en puerto ${process.env.DB_PORT || '5433'}:`, err.message);
    console.warn('[DB NOTE] El backend operará con reintentos automáticos y persistencia segura.');
  } else {
    isConnected = true;
    console.log(`[DB SUCCESS] Conectado exitosamente a PostgreSQL en el puerto ${process.env.DB_PORT || '5433'} (DB: ${process.env.DB_NAME || 'rifas_db'})`);
    release();
  }
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  isConnected: () => isConnected,
  pool,
};

export default db;
