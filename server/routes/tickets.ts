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

    // 1. Identificar el administrador y su número de talonario exclusivo (1 a 31)
    const userRes = await client.query(
      `SELECT id, dni, role, full_name FROM users WHERE id = $1 OR dni = $1 LIMIT 1`,
      [sellerId]
    );
    const sellerUser = userRes.rows[0];

    const ADMIN_DNI_MAP: { [dni: string]: number } = {
      '74765137': 1, '70905188': 2, '72795283': 3, '71745804': 4,
      '72741502': 5, '74602585': 6, '71694983': 7, '76564148': 8,
      '74898956': 9, '75510293': 10, '72809187': 11, '75701962': 12,
      '73868636': 13, '73997851': 14, '70240574': 15, '75315104': 16,
      '74960683': 17, '77801287': 18, '60906074': 19, '71780194': 20,
      '77801288': 21, '75075018': 22, '72095575': 23, '71247028': 24,
      '77529113': 25, '70916278': 26, '72740540': 27, '74395059': 28,
      '73523144': 29, '75020702': 30, '70401427': 31,
    };

    let adminN = 2; // Por defecto Jheyson (Admin 2)
    const admMatch = String(sellerId).match(/adm-(\d+)/i);
    if (admMatch) {
      adminN = parseInt(admMatch[1], 10);
    } else if (sellerUser && sellerUser.dni && ADMIN_DNI_MAP[sellerUser.dni]) {
      adminN = ADMIN_DNI_MAP[sellerUser.dni];
    } else if (ADMIN_DNI_MAP[String(sellerId)]) {
      adminN = ADMIN_DNI_MAP[String(sellerId)];
    }
    adminN = Math.max(1, Math.min(31, adminN));

    // 2. Calcular rango de talonario único: 20 números por administrador
    const startNum = (adminN - 1) * 20 + 1;
    const endNum = adminN * 20;

    // 3. Buscar números ya emitidos dentro del talonario de este administrador
    const occupiedCheck = await client.query(
      `SELECT ticket_number FROM tickets 
       WHERE raffle_id = 'rf-024' 
         AND ticket_number BETWEEN $1 AND $2 
         AND status = 'valid'
       ORDER BY ticket_number ASC`,
      [startNum, endNum]
    );
    const occupiedNumbers = new Set<number>(occupiedCheck.rows.map(r => r.ticket_number));
    const availableNumbers: number[] = [];
    for (let n = startNum; n <= endNum; n++) {
      if (!occupiedNumbers.has(n)) {
        availableNumbers.push(n);
      }
    }

    if (availableNumbers.length < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Talonario insuficiente: a este administrador solo le quedan ${availableNumbers.length} ticket(s) en su talonario asignado (#${String(startNum).padStart(4, '0')} al #${String(endNum).padStart(4, '0')}). Intentó emitir ${quantity}.`,
      });
    }

    const assignedNumbers = availableNumbers.slice(0, quantity);
    const actualSellerId = sellerUser?.id || sellerId;
    const createdList = [];

    for (let i = 0; i < quantity; i++) {
      const nextNumber = assignedNumbers[i];
      const ticketId = `t-${Date.now()}-${nextNumber}-${i}`;
      const codeRandomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `TK-024-${nextNumber}-${codeRandomPart}`;

      // 4. Generar hash criptográfico SHA-256 de autenticidad inmutable
      const hashData = `${nextNumber}|${dni.trim()}|${actualSellerId}|${Date.now()}-${i}`;
      const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

      // 5. Insertar ticket en la base de datos
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
          actualSellerId,
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
