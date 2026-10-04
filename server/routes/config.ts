import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';
import { adminOperation, OperationError, writeAudit } from '../adminOperations';

const router = Router();

// GET /api/config
router.get('/', async (req, res: Response) => {
  try {
    const result = await db.query('SELECT key, value FROM system_config');
    const configMap: Record<string, string> = {};
    for (const row of result.rows) {
      configMap[row.key] = row.value;
    }
    res.json({
      organizationName: configMap.organizationName || 'Plataforma Oficial de Rifas Junín',
      currencyName: configMap.currencyName || 'Soles',
      currencySymbol: configMap.currencySymbol || 'S/',
      supportPhone: configMap.supportPhone || '+51 987 654 321',
      receiptMessage: configMap.receiptMessage || '¡Gracias por apoyar nuestra causa! Este comprobante digital certifica su participación válida.',
    });
  } catch (error: any) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Error al obtener la configuración del sistema.' });
  }
});

// PUT /api/config (SuperAdmin)
router.put('/', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  return adminOperation(req,res,async c=> {
    const { organizationName, currencyName, currencySymbol, supportPhone, receiptMessage } = req.body;
    const entries = [
      ['organizationName', organizationName],
      ['currencyName', currencyName],
      ['currencySymbol', currencySymbol],
      ['supportPhone', supportPhone],
      ['receiptMessage', receiptMessage],
    ];
    if(entries.some(([,val])=>val!==undefined&&(typeof val!=='string'||val.length>2000)))throw new OperationError(400,'Configuración inválida.');
    const before=(await c.query('SELECT key,value FROM system_config FOR UPDATE')).rows;

    for (const [key, val] of entries) {
      if (val !== undefined) {
        await c.query(
          `INSERT INTO system_config (key, value, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, val]
        );
      }
    }

    await writeAudit(c,req,'EDITAR_CONFIGURACION','Plataforma',{before,after:req.body});
    return { success: true, message: 'Configuración actualizada.' };
  });
});

export default router;
