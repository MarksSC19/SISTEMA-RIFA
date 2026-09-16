import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// GET /api/tickets - Listar tickets
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sellerId, search } = req.query;
    let query = `
      SELECT 
        t.id,
        t.ticket_number as number,
        ('#' || LPAD(t.ticket_number::text, 4, '0')) as "formattedNumber",
        t.ticket_code as "verificationCode",
        t.raffle_id as "raffleId",
        t.buyer_name as "buyerName",
        t.buyer_dni as dni,
        t.buyer_phone as phone,
        t.payment_method as "paymentMethod",
        t.payment_reference as "paymentReference",
        t.price_paid as price,
        t.status,
        (t.status = 'valid') as "isValid",
        t.sold_at as timestamp,
        TO_CHAR(t.sold_at, 'HH24:MI') as "timeFormatted",
        u.full_name as "registeredBy",
        t.seller_admin_id as "sellerAdminId",
        t.verification_hash as "verificationHash"
      FROM tickets t
      LEFT JOIN users u ON u.id = t.seller_admin_id
      WHERE t.raffle_id = 'rf-024'
    `;
    const params: any[] = [];

    if (sellerId) {
      params.push(sellerId);
      query += ` AND t.seller_admin_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.buyer_name ILIKE $${params.length} OR t.buyer_dni ILIKE $${params.length} OR t.ticket_code ILIKE $${params.length})`;
    }

    query += ' ORDER BY t.ticket_number DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error listing tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets.' });
  }
});

// POST /api/tickets - Registrar venta de ticket con validación de cuota de 20
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const client = await db.getClient();
  try {
    const { buyerName, dni, phone, paymentMethod, paymentReference } = req.body;
    const sellerId = req.body.sellerAdminId || req.user?.id;

    if (!buyerName || !dni || !phone) {
      return res.status(400).json({ error: 'Nombre del comprador, DNI y Celular son requeridos.' });
    }

    await client.query('BEGIN');

    const quantity = Math.max(1, parseInt(req.body.quantity || '1', 10));

    // 1. Validar cuota del administrador (Máximo 20 tickets vendidos)
    const quotaCheck = await client.query(
      `SELECT COUNT(*)::int as count FROM tickets WHERE seller_admin_id = $1 AND raffle_id = 'rf-024' AND status = 'valid'`,
      [sellerId]
    );
    const currentSold = quotaCheck.rows[0].count;
    if (currentSold + quantity > 20) {
      await client.query('ROLLBACK');
      const remaining = 20 - currentSold;
      return res.status(400).json({
        error: `Cuota insuficiente: este administrador solo puede vender ${remaining} ticket(s) más para alcanzar su meta de 20 (intentó emitir ${quantity}).`,
      });
    }

    // 2. Obtener siguiente número correlativo base (1 a 620)
    const maxNumResult = await client.query(
      `SELECT COALESCE(MAX(ticket_number), 0) as max_num FROM tickets WHERE raffle_id = 'rf-024'`
    );
    let currentNumber = maxNumResult.rows[0].max_num;
    if (currentNumber + quantity > 620) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Capacidad total de la rifa alcanzada (620 tickets vendidos).' });
    }

    const createdList = [];

    for (let i = 0; i < quantity; i++) {
      currentNumber += 1;
      const nextNumber = currentNumber;
      const ticketId = `t-${Date.now()}-${nextNumber}-${i}`;
      const codeRandomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `TK-024-${nextNumber}-${codeRandomPart}`;

      // 3. Generar hash criptográfico SHA-256 de autenticidad
      const hashData = `${nextNumber}|${dni.trim()}|${sellerId}|${Date.now()}-${i}`;
      const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

      // 4. Insertar ticket
      const insertTicket = await client.query(
        `INSERT INTO tickets (
          id, ticket_number, ticket_code, raffle_id, seller_admin_id,
          buyer_name, buyer_phone, buyer_dni, payment_method, payment_reference,
          price_paid, verification_hash, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 10.00, $11, 'valid')
        RETURNING *`,
        [
          ticketId,
          nextNumber,
          ticketCode,
          'rf-024',
          sellerId,
          buyerName.trim().toUpperCase(),
          phone.trim(),
          dni.trim(),
          paymentMethod || 'efectivo',
          paymentReference ? paymentReference.trim() : null,
          verificationHash,
        ]
      );

      createdList.push(insertTicket.rows[0]);
    }

    // 5. Registrar en auditoría
    const auditId = `aud-${Date.now()}`;
    const auditHash = crypto.createHash('sha256').update(`EMIT_TICKETS_${createdList[0].ticket_code}_QTY_${quantity}`).digest('hex');
    await client.query(
      `INSERT INTO audit_logs (id, action, performed_by, target, details, hash_signature, previous_hash)
       VALUES ($1, 'EMISIÓN_TICKETS_MULTIPLE', $2, $3, $4, $5, 'GENESIS')`,
      [
        auditId,
        req.user?.name || 'ADMIN',
        `Lote de ${quantity} ticket(s)`,
        JSON.stringify({ buyer: buyerName, dni, seller: sellerId, quantity, numbers: createdList.map(t => t.ticket_number) }),
        auditHash,
      ]
    );

    await client.query('COMMIT');

    const mappedList = createdList.map(created => ({
      id: created.id,
      number: created.ticket_number,
      formattedNumber: `#${String(created.ticket_number).padStart(4, '0')}`,
      verificationCode: created.ticket_code,
      raffleId: created.raffle_id,
      buyerName: created.buyer_name,
      dni: created.buyer_dni,
      phone: created.buyer_phone,
      paymentMethod: created.payment_method,
      price: created.price_paid,
      isValid: true,
      timestamp: created.sold_at,
      timeFormatted: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      registeredBy: req.user?.name || 'ADMIN',
      sellerAdminId: created.seller_admin_id,
      verificationHash: created.verification_hash,
    }));

    res.status(201).json({
      ...mappedList[0],
      createdTickets: mappedList,
      quantity,
      totalPaid: quantity * 10,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating tickets:', error);
    res.status(500).json({ error: 'Error al emitir los tickets en la base de datos.' });
  } finally {
    client.release();
  }
});

// PUT /api/tickets/:id - Modificar datos del comprador
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { buyerName, dni, phone } = req.body;

    await db.query(
      `UPDATE tickets 
       SET buyer_name = COALESCE($1, buyer_name), 
           buyer_dni = COALESCE($2, buyer_dni), 
           buyer_phone = COALESCE($3, buyer_phone)
       WHERE id = $4`,
      [buyerName ? buyerName.trim().toUpperCase() : null, dni ? dni.trim() : null, phone ? phone.trim() : null, id]
    );

    res.json({ success: true, message: 'Ticket actualizado exitosamente.' });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Error al actualizar el ticket.' });
  }
});

// DELETE /api/tickets/:id - Anular ticket
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE tickets SET status = 'cancelled' WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Ticket anulado correctamente.' });
  } catch (error: any) {
    console.error('Error cancelling ticket:', error);
    res.status(500).json({ error: 'Error al anular el ticket.' });
  }
});

export default router;
