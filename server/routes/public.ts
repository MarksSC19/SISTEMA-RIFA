import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/public/verify/:code - Verificación pública de boletos vía QR o código
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const rawCode = req.params.code.trim();

    const result = await db.query(
      `SELECT 
        t.id,
        t.ticket_number as number,
        ('#' || LPAD(t.ticket_number::text, 4, '0')) as "formattedNumber",
        t.ticket_code as "verificationCode",
        t.buyer_name as "buyerName",
        t.buyer_dni as dni,
        t.buyer_phone as phone,
        t.payment_method as "paymentMethod",
        t.price_paid as price,
        t.status,
        t.sold_at as timestamp,
        t.verification_hash as "verificationHash",
        u.full_name as "registeredBy",
        r.name as "raffleName",
        p.title as "wonPrize",
        p.position as "wonPrizePosition"
      FROM tickets t
      LEFT JOIN users u ON u.id = t.seller_admin_id
      LEFT JOIN raffles r ON r.id = t.raffle_id
      LEFT JOIN prizes p ON p.winner_ticket_id = t.id
      WHERE LOWER(t.ticket_code) = LOWER($1) 
         OR LOWER(t.id) = LOWER($1)
         OR t.buyer_dni = $1
         OR ('#' || LPAD(t.ticket_number::text, 4, '0')) = $1
         OR t.ticket_number::text = $1
      ORDER BY t.ticket_number ASC`,
      [rawCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'Código de boleto o DNI no encontrado. No se registran tickets con esos datos en la base de datos oficial.',
      });
    }

    const t = result.rows[0];

    // Buscar TODOS los tickets de este comprador por su DNI
    const allBuyerTicketsRes = await db.query(
      `SELECT 
        ticket_number as number,
        ('#' || LPAD(ticket_number::text, 4, '0')) as "formattedNumber",
        ticket_code as "verificationCode",
        status,
        sold_at as "issuedAt"
       FROM tickets 
       WHERE buyer_dni = $1 AND raffle_id = 'rf-024'
       ORDER BY ticket_number ASC`,
      [t.dni]
    );

    // Mask buyer name slightly for privacy while allowing verification (e.g., "JUAN P****")
    const nameParts = t.buyerName.split(' ');
    const maskedName = nameParts
      .map((part: string, idx: number) => {
        if (idx === 0) return part;
        if (part.length <= 2) return part;
        return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
      })
      .join(' ');

    res.json({
      valid: t.status === 'valid',
      ticket: {
        number: t.number,
        formattedNumber: t.formattedNumber,
        verificationCode: t.verificationCode,
        buyerName: t.buyerName,
        maskedBuyerName: maskedName,
        dni: t.dni || 'N/D',
        rawDni: t.dni,
        raffleName: t.raffleName || 'Rifa Graduación Administración',
        registeredBy: t.registeredBy,
        issuedAt: t.timestamp,
        verificationHash: t.verificationHash,
        status: t.status === 'valid' ? 'VÁLIDO Y CERTIFICADO' : 'ANULADO',
        wonPrize: t.wonPrize ? `${t.wonPrizePosition}° Lugar: ${t.wonPrize}` : null,
      },
      buyerAllTickets: allBuyerTicketsRes.rows,
      totalBuyerTickets: allBuyerTicketsRes.rows.length,
    });
  } catch (error: any) {
    console.error('Public verify error:', error);
    res.status(500).json({ error: 'Error al consultar la validez del boleto.' });
  }
});

// GET /api/public/summary - Métricas públicas oficiales
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const statsRes = await db.query(`
      SELECT 
        COUNT(t.id) FILTER (WHERE t.status = 'valid')::int as "totalSold",
        620 as "totalQuota",
        (COUNT(t.id) FILTER (WHERE t.status = 'valid') * 10.00)::numeric as "totalAmount",
        COUNT(p.id) FILTER (WHERE p.winner_ticket_id IS NOT NULL)::int as "drawnPrizesCount",
        7 as "totalPrizesCount"
      FROM raffles r
      LEFT JOIN tickets t ON t.raffle_id = r.id
      LEFT JOIN prizes p ON p.raffle_id = r.id
      WHERE r.id = 'rf-024'
      GROUP BY r.id
    `);

    res.json(statsRes.rows[0] || { totalSold: 0, totalQuota: 620, totalAmount: 0 });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener resumen público.' });
  }
});

export default router;
