import db from './db';

async function audit() {
  console.log('--- AUDITORÍA DE BASE DE DATOS (POSTGRESQL :5433) ---');
  
  // 1. Usuarios
  const usersRes = await db.query('SELECT count(*)::int as total, role FROM users GROUP BY role');
  console.log('Usuarios por rol:', usersRes.rows);

  const superAdmin = await db.query('SELECT id, email, full_name, role, must_change_password FROM users WHERE role = $1', ['super_admin']);
  console.log('Super Admin:', superAdmin.rows[0]);

  const adminStats = await db.query(
    'SELECT count(*)::int as total_admins, avg(quota)::int as avg_quota, sum(case when must_change_password then 1 else 0 end)::int as pending_pass_change FROM users WHERE role = $1', 
    ['admin']
  );
  console.log('Estadísticas de admins:', adminStats.rows[0]);

  // 2. Tickets
  const ticketsRes = await db.query('SELECT count(*)::int as total_tickets FROM tickets');
  console.log('Tickets registrados en BD:', ticketsRes.rows[0]);

  // 3. Premios
  const prizesRes = await db.query('SELECT position, title, winner_name, drawn_at FROM prizes ORDER BY position ASC');
  console.log(`Premios en catálogo (${prizesRes.rowCount} premios):`);
  prizesRes.rows.forEach(p => console.log(`  ${p.position}° Lugar: ${p.title} (Ganador: ${p.winner_name || 'Pendiente de Sorteo'})`));

  // 4. Rifa activa
  const rafflesRes = await db.query('SELECT code, name, total_tickets, ticket_price, status FROM raffles');
  console.log('Rifa configurada:', rafflesRes.rows[0]);

  console.log('--- FIN AUDITORÍA ---');
  process.exit(0);
}

audit().catch(err => {
  console.error('Error durante auditoría:', err);
  process.exit(1);
});
