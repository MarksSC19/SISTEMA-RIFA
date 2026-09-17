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

// Lista de 31 administradores oficiales de la organización
const SEED_ADMIN_LIST = [
  { n: 1, name: 'HANSSEL JHARETH LLANCARI MUJE', dni: '74765137', email: 'hanssel.llancari@rifas.pe' },
  { n: 2, name: 'JHEYSON RYAM JORGE VASQUEZ', dni: '70905188', email: 'jheyson.jorge@rifas.pe' },
  { n: 3, name: 'LYAM SIDNNEY RENGIFO GOZAR', dni: '72795283', email: 'lyam.rengifo@rifas.pe' },
  { n: 4, name: 'FREDDY ALONSO JESUS RAMOS GUZMAN', dni: '71745804', email: 'freddy.ramos@rifas.pe' },
  { n: 5, name: 'KEYRA CLAUDIA RICAPA CONDOR', dni: '72741502', email: 'keyra.ricapa@rifas.pe' },
  { n: 6, name: 'JHON BRAYAN FELIX YAPIAS', dni: '74602585', email: 'jhon.felix@rifas.pe' },
  { n: 7, name: 'DANTUN MIGUEL NUNEZ ROMERO', dni: '71694983', email: 'dantun.nunez@rifas.pe' },
  { n: 8, name: 'YULIANA ESTEFANY GARAGATI SALAZAR', dni: '76564148', email: 'yuliana.garagati@rifas.pe' },
  { n: 9, name: 'KLUIVERT SEVERO BRICENO BARZOLA', dni: '74898956', email: 'kluivert.briceno@rifas.pe' },
  { n: 10, name: 'ALEJANDRA ANTONELLA GALINDO GASTELU', dni: '75510293', email: 'alejandra.galindo@rifas.pe' },
  { n: 11, name: 'LUIS GUILLERMO PARRA TICZE', dni: '72809187', email: 'luis.parra@rifas.pe' },
  { n: 12, name: 'SHIRLEY MISLETH MEZA CELIS', dni: '75701962', email: 'shirley.meza@rifas.pe' },
  { n: 13, name: 'RISTOL CAMILO SANCHEZ RAMOS', dni: '73868636', email: 'ristol.sanchez@rifas.pe' },
  { n: 14, name: 'JOSE BERNARDO VALENCIA PEREZ', dni: '73997851', email: 'jose.valencia@rifas.pe' },
  { n: 15, name: 'ALEXANDER ZARATE CARIRE', dni: '70240574', email: 'alexander.zarate@rifas.pe' },
  { n: 16, name: 'ESTEFANY DARIA SEDANO HURTADO', dni: '75315104', email: 'estefany.sedano@rifas.pe' },
  { n: 17, name: 'JAYRO FREDDY ORIHUELA CHAVEZ', dni: '74960683', email: 'jayro.orihuela@rifas.pe' },
  { n: 18, name: 'JAIME BRANDON FLORES LOZANO', dni: '77801287', email: 'jaime.flores@rifas.pe' },
  { n: 19, name: 'EVELIN ROMERO ROMANI', dni: '60906074', email: 'evelin.romero@rifas.pe' },
  { n: 20, name: 'MEDALY ANGELINE RAMIREZ AYBAR', dni: '71780194', email: 'medaly.ramirez@rifas.pe' },
  { n: 21, name: 'KEVIN FRANK AQUINO MARTINEZ', dni: '77801288', email: 'kevin.aquino@rifas.pe' },
  { n: 22, name: 'JENIFER ABIGAIL APOLINARIO LAUREANO', dni: '75075018', email: 'jenifer.apolinario@rifas.pe' },
  { n: 23, name: 'ROSA VALERIA NAUPARI SALVADOR', dni: '72095575', email: 'rosa.naupari@rifas.pe' },
  { n: 24, name: 'ELISANGHELA MERCEDES ROBLADILLO BELTRAN', dni: '71247028', email: 'elisanghela.robladillo@rifas.pe' },
  { n: 25, name: 'BEYONCE ELIZABETH HUAMAN TORRES', dni: '77529113', email: 'beyonce.huaman@rifas.pe' },
  { n: 26, name: 'NOHELY GIANNELA ALIAGA HUARACA', dni: '70916278', email: 'nohely.aliaga@rifas.pe' },
  { n: 27, name: 'JASMIN NICOL MORALES SINCHITULLO', dni: '72740540', email: 'jasmin.morales@rifas.pe' },
  { n: 28, name: 'MARICIELO KATHERINE LLACZA ROJA', dni: '74395059', email: 'maricielo.llacza@rifas.pe' },
  { n: 29, name: 'SURIMANA QUINTO MENDOZA', dni: '73523144', email: 'surimana.quinto@rifas.pe' },
  { n: 30, name: 'DANITZA LESLY MELENDREZ HERRERA', dni: '75020702', email: 'danitza.melendrez@rifas.pe' },
  { n: 31, name: 'JHOVANNY BRYANJ SANABRIA BERROCAL', dni: '70401427', email: 'jhovanny.sanabria@rifas.pe' },
];

// Verificación e inicialización de la base de datos
async function initDatabaseState() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sincronización incondicional de los 31 administradores oficiales
    console.log('🔄 Sincronizando catálogo completo de los 31 administradores en PostgreSQL...');
    for (const adm of SEED_ADMIN_LIST) {
      const adminId = `adm-${adm.n}`;
      const isSuper = adm.dni === '70905188';
      const initialHash = await bcrypt.hash(adm.dni, 10); // Contraseña inicial es su DNI
      await db.query(
        `INSERT INTO users (id, email, password_hash, full_name, dni, phone, role, status, quota, must_change_password)
         VALUES ($1, $2, $3, $4, $5, '987654321', $6, 'active', 20, $7)
         ON CONFLICT (dni) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           status = 'active'`,
        [adminId, adm.email, initialHash, adm.name, adm.dni, isSuper ? 'super_admin' : 'admin', !isSuper]
      );
    }

    // Asegurar también DNI 72970575 por si se ingresó con esta variante
    const hash729 = await bcrypt.hash('72970575', 10);
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, dni, phone, role, status, quota, must_change_password)
       VALUES ('adm-23-alt', 'rosa.naupari.alt@rifas.pe', $1, 'ROSA VALERIA NAUPARI SALVADOR', '72970575', '987654321', 'admin', 'active', 20, true)
       ON CONFLICT (dni) DO UPDATE SET status = 'active'`,
      [hash729]
    );

    // Asegurar actualización de datos del ticket #0023 en PostgreSQL
    await db.query(`
      UPDATE tickets 
      SET buyer_name = 'VICTOR RAUL GAGO VARGAS', 
          buyer_dni = '43908736' 
      WHERE ticket_number = 23 OR ticket_code = 'TK-024-23-5861B2'
    `);
    console.log('✓ Catálogo de administradores y boletos sincronizados con éxito en PostgreSQL.');
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
