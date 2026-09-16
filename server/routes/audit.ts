import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// GET /api/audit - Listado de logs de auditoría criptográfica
router.get('/', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        action,
        performed_by as "performedBy",
        target,
        details,
        hash_signature as "hashSignature",
        previous_hash as "previousHash",
        created_at as timestamp,
        TO_CHAR(created_at, 'HH24:MI:SS') as "timeFormatted"
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Error al consultar registros de auditoría.' });
  }
});

export default router;
