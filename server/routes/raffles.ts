import { Router } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware';
import { adminOperation, OperationError, writeAudit } from '../adminOperations';
const router=Router();
router.get('/',requireAuth,async(req,res)=>{
 try{const r=await db.query(`SELECT r.id,r.code,r.name AS title,r.description,r.status,r.ticket_price::float AS "ticketPrice",r.total_tickets AS "totalTickets",(SELECT COUNT(*)::int FROM tickets WHERE raffle_id=r.id AND status='valid') AS "soldTickets",COALESCE(r.draw_date_text,TO_CHAR(r.draw_date AT TIME ZONE 'America/Lima','DD/MM/YYYY HH24:MI:SS'),'') AS "drawDate",r.currency,r.assigned_admin AS "assignedAdmin" FROM raffles r ORDER BY r.created_at`);res.json(r.rows);}catch{res.status(500).json({error:'No se pudo cargar rifas.'});}
});
async function save(req:any,res:any,create:boolean){
 const {title,description,status,ticketPrice,totalTickets,code,drawDate,currency,assignedAdmin}=req.body;
 if(typeof title!=='string'||!title.trim()||title.length>128||typeof code!=='string'||!code.trim()||code.length>16||!['activa','cerrada','sorteo','borrador'].includes(status)||!Number.isFinite(ticketPrice)||ticketPrice<=0||!Number.isInteger(totalTickets)||totalTickets<20|| (drawDate!==undefined&&(typeof drawDate!=='string'||drawDate.length>64)))return res.status(400).json({error:'Datos de rifa inválidos.'});
 return adminOperation(req,res,async c => {
   const id=create?req.body.id:req.params.id;
   if(typeof id!=='string'||!id||id.length>64)throw new OperationError(400,'Identificador inválido.');
   const before=create?null:(await c.query('SELECT * FROM raffles WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!create&&!before)throw new OperationError(404,'Rifa no encontrada.');
   const max=await c.query(`SELECT GREATEST(COALESCE((SELECT MAX(booklet_number)*20 FROM users WHERE assigned_raffle_id=$1 AND archived_at IS NULL),20),COALESCE((SELECT MAX(ticket_number) FROM tickets WHERE raffle_id=$1),20)) AS needed`,[id]);
   if(totalTickets<Number(max.rows[0].needed))throw new OperationError(400,'El total debe incluir los talonarios y boletos de esta rifa: '+max.rows[0].needed+' números.');
   const params=[title.trim(),description||'',status,ticketPrice,totalTickets,code,drawDate||'',currency||'S/',assignedAdmin||'Coordinación General',create?req.body.id:req.params.id];
   if(create)await c.query('INSERT INTO raffles(name,description,status,ticket_price,total_tickets,code,draw_date_text,currency,assigned_admin,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',params);
   else await c.query('UPDATE raffles SET name=$1,description=$2,status=$3,ticket_price=$4,total_tickets=$5,code=$6,draw_date_text=$7,currency=$8,assigned_admin=$9 WHERE id=$10',params);
   await writeAudit(c,req,create?'CREAR_RIFA':'EDITAR_RIFA',id,{before,after:req.body});
   return {success:true};
 },create?201:200);
}
router.post('/',requireSuperAdmin,(req,res)=>save(req,res,true));router.put('/:id',requireSuperAdmin,(req,res)=>save(req,res,false));
router.delete('/:id',requireSuperAdmin,async(req,res)=>{
 if(req.params.id==='rf-024')return res.status(409).json({error:'La rifa oficial conserva su historial. Puede cerrarla.'});
 return adminOperation(req,res,async c=>{
   const before=(await c.query('SELECT * FROM raffles WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
   const r=await c.query('DELETE FROM raffles WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM tickets WHERE raffle_id=$1) AND NOT EXISTS(SELECT 1 FROM users WHERE assigned_raffle_id=$1) RETURNING id',[req.params.id]);
   if(!r.rowCount)throw new OperationError(409,'Rifa no encontrada o con ventas/administradores asignados.');
   await writeAudit(c,req,'ELIMINAR_RIFA',req.params.id,{before});return {success:true};
 });
});export default router;
