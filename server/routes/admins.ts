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

// GET /api/admins - Lista de los 31 admins con conteo de ventas en tiempo real
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

// POST /api/admins - Crear nuevo admin (SuperAdmin)
router.post('/', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, dni, email, password } = req.body;
    if (!name || !dni || !email) {
      return res.status(400).json({ error: 'Nombre, DNI y Correo son obligatorios.' });
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);
    const newId = `adm-${Date.now()}`;

    await db.query(
      `INSERT INTO users (id, full_name, dni, email, password_hash, phone, role, status, quota)
       VALUES ($1, $2, $3, $4, $5, '987654321', 'admin', 'active', 20)`,
      [newId, name.trim().toUpperCase(), dni.trim(), email.trim().toLowerCase(), passwordHash]
    );

    res.status(201).json({
      id: newId,
      name: name.trim().toUpperCase(),
      dni: dni.trim(),
      email: email.trim().toLowerCase(),
      totalSold: 0,
      assignedQuota: 20,
      status: 'activo',
      avatarInitials: getInitials(name),
      assignedRaffleId: 'rf-024',
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El DNI o correo ya se encuentra registrado.' });
    }
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Error al registrar administrador.' });
  }
});

// PUT /api/admins/:id - Actualizar admin
router.put('/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, dni, email, status, password } = req.body;

    let query = 'UPDATE users SET full_name = COALESCE($1, full_name), dni = COALESCE($2, dni), email = COALESCE($3, email), status = COALESCE($4, status)';
    const params: any[] = [
      name ? name.trim().toUpperCase() : null,
      dni ? dni.trim() : null,
      email ? email.trim().toLowerCase() : null,
      status ? (status === 'activo' ? 'active' : 'inactive') : null,
    ];

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      query += `, password_hash = $5, must_change_password = false WHERE id = $6 OR dni = $7`;
      params.push(passwordHash, id, dni ? dni.trim() : id);
    } else {
      query += ` WHERE id = $5 OR dni = $6`;
      params.push(id, dni ? dni.trim() : id);
    }

    await db.query(query, params);
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
