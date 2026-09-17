import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// GET /api/admins - Lista de todos los admins con conteo de ventas en tiempo real
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.full_name as name,
        u.dni,
        u.email,
        u.quota as "assignedQuota",
        u.status,
        COUNT(t.id) FILTER (WHERE t.status = 'valid')::int as "totalSold"
      FROM users u
      LEFT JOIN tickets t ON t.seller_admin_id = u.id AND t.raffle_id = 'rf-024'
      WHERE u.role = 'admin'
      GROUP BY u.id, u.full_name, u.dni, u.email, u.quota, u.status
      ORDER BY "totalSold" DESC, u.full_name ASC
    `);

    const admins = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      dni: row.dni,
      email: row.email,
      assignedRafflesCount: 1,
      totalSold: row.totalSold,
      assignedQuota: row.assignedQuota || 20,
      status: row.status === 'active' ? 'activo' : 'inactivo',
      avatarInitials: getInitials(row.name),
      assignedRaffleId: 'rf-024',
    }));

    res.json(admins);
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Error al obtener la lista de administradores.' });
  }
});

// POST /api/admins - Crear nuevo admin (SuperAdmin) con UPSERT
router.post('/', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, dni, email, password } = req.body;
    if (!name || !dni) {
      return res.status(400).json({ error: 'Nombre y DNI son obligatorios.' });
    }

    const cleanDni = dni.trim();
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : `admin.${cleanDni}@rifas.pe`;
    const cleanName = name.trim().toUpperCase();
    const defaultPass = password && password.trim().length > 0 ? password.trim() : cleanDni;
    const passwordHash = await bcrypt.hash(defaultPass, 10);
    const newId = `adm-${Date.now()}`;

    const insertRes = await db.query(
      `INSERT INTO users (id, full_name, dni, email, password_hash, phone, role, status, quota, must_change_password)
       VALUES ($1, $2, $3, $4, $5, '987654321', 'admin', 'active', 20, true)
       ON CONFLICT (dni) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         status = 'active',
         must_change_password = true
       RETURNING id, full_name as name, dni, email, quota as "assignedQuota", status`,
      [newId, cleanName, cleanDni, cleanEmail, passwordHash]
    );

    const created = insertRes.rows[0] || {
      id: newId,
      name: cleanName,
      dni: cleanDni,
      email: cleanEmail,
      assignedQuota: 20,
      status: 'active',
    };

    res.status(201).json({
      id: created.id,
      name: created.name,
      dni: created.dni,
      email: created.email,
      totalSold: 0,
      assignedQuota: created.assignedQuota || 20,
      status: created.status === 'active' ? 'activo' : 'inactivo',
      avatarInitials: getInitials(created.name),
      assignedRaffleId: 'rf-024',
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Error al registrar administrador.' });
  }
});

// PUT /api/admins/:id - Actualizar admin o insertar si no existe (UPSERT)
router.put('/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, dni, email, status, password } = req.body;

    const cleanDni = dni ? dni.trim() : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanName = name ? name.trim().toUpperCase() : null;
    const cleanStatus = status ? (status === 'activo' ? 'active' : 'inactive') : null;

    let updateRes;
    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      updateRes = await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name), 
             dni = COALESCE($2, dni), 
             email = COALESCE($3, email), 
             status = COALESCE($4, status),
             password_hash = $5,
             must_change_password = false
         WHERE id = $6 OR (dni = $2 AND $2 IS NOT NULL)`,
        [cleanName, cleanDni, cleanEmail, cleanStatus, passwordHash, id]
      );
    } else {
      updateRes = await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name), 
             dni = COALESCE($2, dni), 
             email = COALESCE($3, email), 
             status = COALESCE($4, status)
         WHERE id = $5 OR (dni = $2 AND $2 IS NOT NULL)`,
        [cleanName, cleanDni, cleanEmail, cleanStatus, id]
      );
    }

    // Si no existía el usuario en BD, lo insertamos para garantizar su acceso
    if (updateRes.rowCount === 0 && cleanDni) {
      const effectivePass = password && password.trim().length > 0 ? password.trim() : cleanDni;
      const initialHash = await bcrypt.hash(effectivePass, 10);
      const newId = id && id.startsWith('adm-') ? id : `adm-${Date.now()}`;
      await db.query(
        `INSERT INTO users (id, full_name, dni, email, password_hash, phone, role, status, quota, must_change_password)
         VALUES ($1, $2, $3, $4, $5, '987654321', 'admin', $6, 20, $7)
         ON CONFLICT (dni) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           status = EXCLUDED.status,
           must_change_password = EXCLUDED.must_change_password`,
        [
          newId, 
          cleanName || 'ADMINISTRADOR', 
          cleanDni, 
          cleanEmail || `${cleanDni}@rifas.pe`, 
          initialHash, 
          cleanStatus || 'active', 
          password ? false : true
        ]
      );
    }

    res.json({ success: true, message: 'Administrador actualizado correctamente.' });
  } catch (error: any) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: 'Error al actualizar administrador.' });
  }
});

// DELETE /api/admins/:id - Eliminar admin
router.delete('/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'admin']);
    res.json({ success: true, message: 'Administrador eliminado.' });
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Error al eliminar administrador.' });
  }
});

export default router;
