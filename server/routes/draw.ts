import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// POST /api/draw/execute - Ejecución oficial del sorteo con CSPRNG
router.post('/execute', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  let client: any;
  try {
    client = await db.getClient();
    const { prizeId, allowRedraw } = req.body;
    if (!prizeId) {
      return res.status(400).json({ error: 'Debe especificar el prizeId a sortear.' });
    }

    await client.query('BEGIN');
    const scope = await client.query('SELECT raffle_id FROM prizes WHERE id=$1',[prizeId]);
    if(!scope.rows.length){await client.query('ROLLBACK');return res.status(404).json({error:'Premio no encontrado.'});}
    const raffleId=scope.rows[0].raffle_id;
    await client.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[raffleId]);

    // 1. Verificar estado del premio
    const prizeRes = await client.query("SELECT * FROM prizes WHERE id = $1 FOR UPDATE", [prizeId]);
    if (prizeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Premio no encontrado.' });
    }

    const prize = prizeRes.rows[0];
    const isReDraw = Boolean(prize.winner_ticket_id);

    if (prize.winner_ticket_id && !allowRedraw) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este premio ya tiene ganador. Autorice explícitamente un nuevo sorteo.' });
    }

    // 2. Obtener tickets válidos y vendidos que aún no hayan ganado otro premio diferente a este
    const candidatesRes = await client.query(`
      SELECT 
        t.id,
        t.ticket_number as number,
        t.ticket_code as "verificationCode",
        t.buyer_name as "buyerName",
        t.buyer_phone as phone,
        t.buyer_dni as dni,
        u.full_name as "registeredBy",
        u.phone as "sellerPhone",
        u.dni as "sellerDni"
      FROM tickets t
      LEFT JOIN users u ON u.id = t.seller_admin_id
      WHERE t.raffle_id = $2 
        AND t.status = 'valid'
        AND t.id NOT IN (SELECT winner_ticket_id FROM prizes WHERE winner_ticket_id IS NOT NULL AND raffle_id = $2 AND id != $1)
    `, [prizeId, raffleId]);

    const candidates = candidatesRes.rows;
    if (candidates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No hay tickets vendidos elegibles para el sorteo.',
      });
    }

    // 3. Selección criptográficamente segura (CSPRNG)
    const winningIndex = crypto.randomInt(0, candidates.length);
    const winningTicket = candidates[winningIndex];

    const drawnAt = new Date();

    // 4. Actualizar premio con el ganador
    await client.query(
      `UPDATE prizes 
       SET winner_ticket_id = $1, winner_name = $2, winner_phone = $3, drawn_at = $4
       WHERE id = $5`,
      [winningTicket.id, winningTicket.buyerName, winningTicket.phone, drawnAt, prizeId]
    );

    // 5. Registrar en auditoría
    const auditId = `aud-${Date.now()}`;
    const auditHash = crypto.createHash('sha256').update(`DRAW_${prizeId}_${winningTicket.id}_${Date.now()}`).digest('hex');
    await client.query(
      `INSERT INTO audit_logs (id, action, performed_by, target, details, hash_signature, previous_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'GENESIS')`,
      [
        auditId,
        isReDraw ? 'RE_SORTEO_OFICIAL_CSPRNG' : 'SORTEO_OFICIAL_CSPRNG',
        req.user?.name || 'SUPERADMIN',
        prize.title,
        JSON.stringify({
          position: prize.position,
          ticketCode: winningTicket.verificationCode,
          winner: winningTicket.buyerName,
          totalEligible: candidates.length,
          drawnAt: drawnAt.toISOString(),
          isReDraw,
        }),
        auditHash,
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      winner: {
        ticketId: winningTicket.id,
        number: winningTicket.number,
        formattedNumber: `#${String(winningTicket.number).padStart(4, '0')}`,
        verificationCode: winningTicket.verificationCode,
        buyerName: winningTicket.buyerName,
        phone: winningTicket.phone,
        dni: winningTicket.dni,
        registeredBy: winningTicket.registeredBy,
        sellerPhone: winningTicket.sellerPhone,
        sellerDni: winningTicket.sellerDni,
      },
      prize: {
        id: prize.id,
        order: prize.position,
        name: prize.title,
        category: prize.category,
        drawnAt: drawnAt.toISOString(),
      },
      totalParticipants: candidates.length,
    });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error executing draw:', error);
    res.status(500).json({ error: 'Error durante la ejecución del sorteo.' });
  } finally {
    client?.release();
  }
});

export default router;
