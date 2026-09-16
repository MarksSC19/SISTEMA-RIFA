import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import adminsRoutes from './routes/admins';
import prizesRoutes from './routes/prizes';
import ticketsRoutes from './routes/tickets';
import drawRoutes from './routes/draw';
import publicRoutes from './routes/public';
import configRoutes from './routes/config';
import auditRoutes from './routes/audit';
import db from './db';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API ${req.method}] ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.query('SELECT NOW() as time, count(*)::int as total_tickets FROM tickets');
    res.json({
      status: 'ok',
      version: '1.4.1',
      environment: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      postgresConnected: true,
      postgresPort: process.env.DB_PORT || '5433',
      totalTicketsInDb: dbTest.rows[0].total_tickets,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      version: '1.4.1',
      postgresConnected: false,
      message: err.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/prizes', prizesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/draw', drawRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/config', configRoutes);
app.use('/api/audit', auditRoutes);

// Servir frontend compilado en producción
const distPath = path.resolve('dist');
app.use(express.static(distPath));

// Fallback SPA (Single Page Application)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Si dist no existe aún (durante desarrollo), enviar respuesta informativa
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>RIFAS - Backend Operativo</title></head>
          <body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#fff;text-align:center;">
            <h1 style="color:#10b981;">Plataforma RIFAS 2026 - Backend Operativo</h1>
            <p>El servidor API está conectado y corriendo en el puerto <strong>${PORT}</strong> con PostgreSQL (5433).</p>
            <p>Ejecute <code>npm run build</code> para compilar el frontend de producción.</p>
            <p><a href="/api/health" style="color:#38bdf8;">Comprobar Estado API (/api/health)</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Verificación e inicialización de credenciales maestras (One-time check)
async function initDatabaseState() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const initCheck = await db.query(
      "SELECT value FROM system_config WHERE key = 'v14_passwords_initialized'"
    );

    if (initCheck.rows.length === 0) {
      console.log('🔄 Inicializando credenciales base limpias para Superadmin (70905188) y Hanssel (74765137)...');
      const jheysonHash = await bcrypt.hash('70905188', 10);
      const hansselHash = await bcrypt.hash('74765137', 10);

      // Superadmin Jheyson: contraseña inicial es su DNI (70905188)
      await db.query(
        "UPDATE users SET password_hash = $1, role = 'super_admin', must_change_password = false WHERE dni = '70905188'",
        [jheysonHash]
      );

      // Admin Hanssel: contraseña inicial es su DNI (74765137), requiere cambio al primer login
      await db.query(
        "UPDATE users SET password_hash = $1, must_change_password = true WHERE dni = '74765137'",
        [hansselHash]
      );

      await db.query(
        "INSERT INTO system_config (key, value) VALUES ('v14_passwords_initialized', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'"
      );
      console.log('✓ Credenciales iniciales listas para pruebas.');
    }
  } catch (err) {
    console.error('Error en initDatabaseState:', err);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVIDOR RIFAS 2026 EN PRODUCCIÓN LISTO`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🗄️  PostgreSQL: puerto ${process.env.DB_PORT || '5433'} (DB: ${process.env.DB_NAME || 'rifas_db'})`);
  console.log(`⚙️  Modo: ${process.env.NODE_ENV || 'production'}`);
  console.log(`=======================================================`);
  await initDatabaseState();
});

export default app;
