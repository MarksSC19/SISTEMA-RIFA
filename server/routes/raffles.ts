import { Router } from 'express';
import db from '../db';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware';
const router=Router();
router.get('/',requireAuth,async(req,res)=>{
 try{const r=await db.query(`SELECT r.id,r.code,r.name AS title,r.description,r.status,r.ticket_price::float AS "ticketPrice",r.total_tickets AS "totalTickets",(SELECT COUNT(*)::int FROM tickets WHERE raffle_id=r.id AND status='valid') AS "soldTickets",COALESCE(r.draw_date_text,TO_CHAR(r.draw_date AT TIME ZONE 'America/Lima','DD/MM/YYYY HH24:MI:SS'),'') AS "drawDate",r.currency,r.assigned_admin AS "assignedAdmin" FROM raffles r ORDER BY r.created_at`);res.json(r.rows);}catch{res.status(500).json({error:'No se pudo cargar rifas.'});}
});
async function save(req:any,res:any,create:boolean){
 const {title,description,status,ticketPrice,totalTickets,code,drawDate,currency,assignedAdmin}=req.body;
 if(typeof title!=='string'||!title.trim()||title.length>128||typeof code!=='string'||!code.trim()||code.length>16||!['activa','cerrada','sorteo','borrador'].includes(status)||!Number.isFinite(ticketPrice)||ticketPrice<=0||!Number.isInteger(totalTickets)||totalTickets<20|| (drawDate!==undefined&&(typeof drawDate!=='string'||drawDate.length>64)))return res.status(400).json({error:'Datos de rifa inválidos.'});
 try {
   const max=await db.query('SELECT COALESCE(MAX(booklet_number)*20,620) AS needed FROM users');
   if(totalTickets<Number(max.rows[0].needed))return res.status(400).json({error:'El total debe incluir todos los talonarios: '+max.rows[0].needed+' números.'});
   const params=[title.trim(),description||'',status,ticketPrice,totalTickets,code,drawDate||'',currency||'S/',assignedAdmin||'Coordinación General',create?req.body.id:req.params.id];
   if(create){if(typeof req.body.id!=='string'||req.body.id.length>64)return res.status(400).json({error:'Identificador inválido.'});await db.query('INSERT INTO raffles(name,description,status,ticket_price,total_tickets,code,draw_date_text,currency,assigned_admin,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',params);}
   else{const r=await db.query('UPDATE raffles SET name=$1,description=$2,status=$3,ticket_price=$4,total_tickets=$5,code=$6,draw_date_text=$7,currency=$8,assigned_admin=$9 WHERE id=$10 RETURNING id',params);if(!r.rowCount)return res.status(404).json({error:'Rifa no encontrada.'});}
   res.status(create?201:200).json({success:true});
 }catch(e:any){res.status(e.code==='23505'?409:500).json({error:e.code==='23505'?'Código de rifa duplicado.':'No se pudo guardar la rifa.'});}
}
router.post('/',requireSuperAdmin,(req,res)=>save(req,res,true));router.put('/:id',requireSuperAdmin,(req,res)=>save(req,res,false));
router.delete('/:id',requireSuperAdmin,async(req,res)=>{
 if(req.params.id==='rf-024')return res.status(409).json({error:'La rifa oficial conserva su historial. Puede cerrarla.'});
 try{const r=await db.query('DELETE FROM raffles WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM tickets WHERE raffle_id=$1) AND NOT EXISTS(SELECT 1 FROM users WHERE assigned_raffle_id=$1) RETURNING id',[req.params.id]);if(!r.rowCount)return res.status(409).json({error:'Rifa no encontrada o con ventas/administradores asignados.'});res.json({success:true});}catch{res.status(500).json({error:'No se pudo eliminar la rifa.'});}
});export default router;
