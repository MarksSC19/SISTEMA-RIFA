import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// GET /api/prizes - Listar los 7 premios oficiales
router.get('/', async (req, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.raffle_id as "raffleId",
        p.position as "order",
        p.title as name,
        p.category,
        p.description,
        p.winner_ticket_id as "winnerTicketId",
        p.winner_name as "winnerName",
        p.winner_phone as "winnerPhone",
        p.drawn_at as "drawnAt",
        (p.winner_ticket_id IS NOT NULL) as "isDrawn"
      FROM prizes p
      WHERE p.raffle_id = 'rf-024'
      ORDER BY p.position ASC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Error al obtener los premios.' });
  }
});

// PUT /api/prizes/:id - Modificar premio (SuperAdmin)
router.put('/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;

    await db.query(
      `UPDATE prizes 
       SET title = COALESCE($1, title), 
           category = COALESCE($2, category), 
           description = COALESCE($3, description)
       WHERE id = $4`,
      [name, category, description, id]
    );

    res.json({ success: true, message: 'Premio actualizado.' });
  } catch (error: any) {
    console.error('Error updating prize:', error);
    res.status(500).json({ error: 'Error al actualizar el premio.' });
  }
});

// POST /api/prizes/reset - Reiniciar adjudicaciones para nuevo sorteo (SuperAdmin)
router.post('/reset', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await db.query(`
      UPDATE prizes 
      SET winner_ticket_id = NULL, winner_name = NULL, winner_phone = NULL, drawn_at = NULL
      WHERE raffle_id = 'rf-024'
    `);
    res.json({ success: true, message: 'Sorteos de premios reiniciados exitosamente.' });
  } catch (error: any) {
    console.error('Error resetting prizes:', error);
    res.status(500).json({ error: 'Error al reiniciar los premios.' });
  }
});

export default router;
