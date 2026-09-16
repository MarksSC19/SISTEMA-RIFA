import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { INITIAL_PRIZES, INITIAL_RAFFLES } from '../src/mockData';

dotenv.config();

const RAW_ADMIN_DATA = [
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

async function seed() {
  const client = new Client(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5433', 10),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '123456789',
          database: process.env.DB_NAME || 'rifas_db',
        }
  );

  await client.connect();
  console.log('Connected to rifas_db for seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Asegurar columna must_change_password
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;`);

  // PROTECCIÓN DE BASE DE DATOS: No formatear tickets para preservar ventas existentes
  // await client.query(`TRUNCATE TABLE tickets CASCADE;`);

  // 1. System Config
  const configs = [
    ['organizationName', 'Plataforma Oficial de Rifas Junín'],
    ['currencyName', 'Soles'],
    ['currencySymbol', 'S/'],
    ['supportPhone', '+51 987 654 321'],
    ['receiptMessage', '¡Gracias por apoyar nuestra causa! Este comprobante digital certifica su participación válida.'],
  ];
  for (const [key, val] of configs) {
    await client.query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }
  console.log('✓ System config seeded');

  // 2. Raffle rf-024 (Rifa Graduación Administración)
  const raffle = INITIAL_RAFFLES[0];
  await client.query(
    `INSERT INTO raffles (id, code, name, description, ticket_price, total_tickets, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET 
       name = $3, description = $4, ticket_price = $5, total_tickets = $6, status = $7`,
    [raffle.id, raffle.code, raffle.title, raffle.description, raffle.ticketPrice, raffle.totalTickets, raffle.status]
  );
  console.log('✓ Raffle rf-024 seeded');

  // 3. Limpiar cualquier usuario anterior superadmin huérfano para evitar conflictos de email
  await client.query(`DELETE FROM users WHERE id = 'usr-superadmin' OR email = 'marksdelmissolano@gmail.com';`);

  // 4. 31 Admins - Jheyson Ryam Jorge Vasquez (DNI: 70905188) es el Superadministrador Oficial
  for (const adm of RAW_ADMIN_DATA) {
    const adminId = `adm-${adm.n}`;
    const initialPassHash = await bcrypt.hash(adm.dni, 10); // Contraseña inicial es su DNI
    const isSuper = adm.dni === '70905188'; // Jheyson Ryam Jorge Vasquez es Superadmin
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, dni, phone, role, status, quota, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET 
         email = $2, password_hash = $3, full_name = $4, dni = $5, role = $7, quota = $9, must_change_password = $10`,
      [adminId, adm.email, initialPassHash, adm.name, adm.dni, '987654321', isSuper ? 'super_admin' : 'admin', 'active', 20, !isSuper]
    );
  }
  console.log('✓ 31 Administradores registrados en BD.');
  console.log('✓ Superadministrador Oficial: JHEYSON RYAM JORGE VASQUEZ (DNI: 70905188, email: jheyson.jorge@rifas.pe)');

  // 5. 7 Official Prizes
  for (const prz of INITIAL_PRIZES) {
    await client.query(
      `INSERT INTO prizes (id, raffle_id, position, title, category, description, winner_ticket_id, winner_name, winner_phone, drawn_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, NULL)
       ON CONFLICT (id) DO UPDATE SET 
         title = $4, category = $5, description = $6, position = $3, winner_ticket_id = NULL, winner_name = NULL, drawn_at = NULL`,
      [prz.id, prz.raffleId, prz.order, prz.name, prz.category, prz.description]
    );
  }
  console.log('✓ 7 Official prizes seeded in position order 1 to 7 (pendientes de sorteo)');

  await client.end();
  console.log('🎉 Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
