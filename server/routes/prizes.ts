import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';
import { adminOperation, OperationError, writeAudit } from '../adminOperations';

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
        p.description, p.link,
        p.winner_ticket_id as "winnerTicketId",
        p.winner_name as "winnerName",
        p.winner_phone as "winnerPhone",
        p.drawn_at as "drawnAt",
        (p.winner_ticket_id IS NOT NULL) as "isDrawn"
      FROM prizes p

      ORDER BY p.position ASC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching prizes:', error);
    res.status(500).json({ error: 'Error al obtener los premios.' });
  }
});

async function savePrize(req: any,res: any,create: boolean){
  const {name,category,description,order,raffleId,link}=req.body;
  if(typeof name!=='string'||!name.trim()||name.length>128||(order!==undefined&&(!Number.isInteger(order)||order<1)))return res.status(400).json({error:'Datos de premio inválidos.'});
  return adminOperation(req,res,async c=>{
    const id=create?req.body.id:req.params.id;
    const scope=create?raffleId:(await c.query('SELECT raffle_id FROM prizes WHERE id=$1',[id])).rows[0]?.raffle_id;
    if(!scope)throw new OperationError(404,'Premio o rifa no encontrado.');
    await c.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[scope]);
    const before=create?null:(await c.query('SELECT * FROM prizes WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(create)await c.query('INSERT INTO prizes(id,raffle_id,position,title,category,description,link) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,raffleId,order,name.trim(),category||'General',description||'',link||'']);
    else{const r=await c.query('UPDATE prizes SET title=$1,category=COALESCE($2,category),description=COALESCE($3,description),position=COALESCE($4,position),link=COALESCE($5,link) WHERE id=$6 RETURNING id',[name.trim(),category,description,order,link,id]);if(!r.rowCount)throw new OperationError(404,'Premio no encontrado.');}
    await writeAudit(c,req,create?'CREAR_PREMIO':'EDITAR_PREMIO',id,{before,after:req.body});return {success:true};
  },create?201:200);
}
router.post('/',requireSuperAdmin,(req,res)=>savePrize(req,res,true));
router.put('/:id',requireSuperAdmin,(req,res)=>savePrize(req,res,false));
router.delete('/:id',requireSuperAdmin,(req:AuthRequest,res)=>adminOperation(req,res,async c=>{
  const scope=(await c.query('SELECT raffle_id FROM prizes WHERE id=$1',[req.params.id])).rows[0]?.raffle_id;
  if(!scope)throw new OperationError(404,'Premio no encontrado.');
  await c.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[scope]);
  const before=(await c.query('SELECT * FROM prizes WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  const r=await c.query('DELETE FROM prizes WHERE id=$1 AND winner_ticket_id IS NULL RETURNING id',[req.params.id]);
  if(!r.rowCount)throw new OperationError(409,'Premio no encontrado o ya adjudicado.');
  await writeAudit(c,req,'ELIMINAR_PREMIO',req.params.id,{before});return {success:true};
}));
// POST /api/prizes/reset - Reiniciar adjudicaciones para nuevo sorteo (SuperAdmin)
router.post('/reset', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  return adminOperation(req,res,async c=> {
    const raffleId=req.body.raffleId || 'rf-024';
    if(!(await c.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[raffleId])).rowCount)throw new OperationError(404,'Rifa no encontrada.');
    const before=(await c.query('SELECT * FROM prizes WHERE raffle_id=$1 AND winner_ticket_id IS NOT NULL FOR UPDATE',[raffleId])).rows;
    await c.query(`
      UPDATE prizes 
      SET winner_ticket_id = NULL, winner_name = NULL, winner_phone = NULL, drawn_at = NULL
      WHERE raffle_id = $1
    `, [raffleId]);
    await writeAudit(c,req,'REINICIAR_PREMIOS',raffleId,{previousWinners:before});
    return { success: true, message: 'Sorteos de premios reiniciados exitosamente.' };
  });
});

export default router;
