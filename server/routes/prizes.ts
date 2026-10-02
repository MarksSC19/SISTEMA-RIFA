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
  try{
    if(create){await db.query('INSERT INTO prizes(id,raffle_id,position,title,category,description,link) VALUES($1,$2,$3,$4,$5,$6,$7)',[req.body.id,raffleId,order,name.trim(),category||'General',description||'',link||'']);}
    else{const r=await db.query('UPDATE prizes SET title=$1,category=COALESCE($2,category),description=COALESCE($3,description),position=COALESCE($4,position),link=COALESCE($5,link) WHERE id=$6 RETURNING id',[name.trim(),category,description,order,link,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Premio no encontrado.'});}
    res.status(create?201:200).json({success:true});
  }catch(e:any){res.status(['23505','23503'].includes(e.code)?409:500).json({error:'Posición duplicada, rifa inexistente o datos de premio inválidos.'});}
}
router.post('/',requireSuperAdmin,(req,res)=>savePrize(req,res,true));
router.put('/:id',requireSuperAdmin,(req,res)=>savePrize(req,res,false));
router.delete('/:id',requireSuperAdmin,async(req,res)=>{
  try{const r=await db.query('DELETE FROM prizes WHERE id=$1 AND winner_ticket_id IS NULL RETURNING id',[req.params.id]);if(!r.rowCount)return res.status(409).json({error:'Premio no encontrado o ya adjudicado.'});res.json({success:true});}catch{res.status(500).json({error:'No se pudo eliminar el premio.'});}
});
// POST /api/prizes/reset - Reiniciar adjudicaciones para nuevo sorteo (SuperAdmin)
router.post('/reset', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await db.query(`
      UPDATE prizes 
      SET winner_ticket_id = NULL, winner_name = NULL, winner_phone = NULL, drawn_at = NULL
      WHERE raffle_id = $1
    `, [req.body.raffleId || 'rf-024']);
    res.json({ success: true, message: 'Sorteos de premios reiniciados exitosamente.' });
  } catch (error: any) {
    console.error('Error resetting prizes:', error);
    res.status(500).json({ error: 'Error al reiniciar los premios.' });
  }
});

export default router;
