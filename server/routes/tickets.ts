import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
const router=Router();
router.use(requireAuth);
const columns=`t.id,t.ticket_number AS number,('#'||LPAD(t.ticket_number::text,4,'0')) AS "formattedNumber",
 t.ticket_code AS "verificationCode",t.raffle_id AS "raffleId",t.buyer_name AS "buyerName",t.buyer_dni AS dni,
 t.buyer_phone AS phone,t.payment_method AS "paymentMethod",t.payment_reference AS "paymentReference",
 t.price_paid::float AS price,t.status,(t.status='valid') AS "isValid",t.sold_at AS timestamp,
 TO_CHAR(t.sold_at AT TIME ZONE 'America/Lima','HH12:MI AM') AS "timeFormatted",
 (SELECT full_name FROM users WHERE id=t.seller_admin_id) AS "registeredBy",t.seller_admin_id AS "sellerAdminId",t.verification_hash AS "verificationHash"`;
function buyerValid(b:any){return typeof b.buyerName==='string' && b.buyerName.trim().length>0 && b.buyerName.length<=128 && typeof b.dni==='string' && /^\d{8}$/.test(b.dni.trim()) && typeof b.phone==='string' && /^\d{9}$/.test(b.phone.trim());}
async function audit(client:any,req:AuthRequest,action:string,target:string,detail:any){
 await client.query('LOCK TABLE audit_logs IN EXCLUSIVE MODE');
 const previous=await client.query('SELECT hash_signature FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 1');
 const previousHash=previous.rows[0]?.hash_signature || 'GENESIS';
 const id=crypto.randomUUID(); const details=JSON.stringify(detail); const actor=req.user!.name;
 const hash=crypto.createHash('sha256').update(JSON.stringify({id,action,actor,target,details,previousHash})).digest('hex');
 await client.query('INSERT INTO audit_logs(id,action,performed_by,target,details,hash_signature,previous_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,action,actor,target,details,hash,previousHash]);
}
async function transaction(req:AuthRequest,res:any,work:(client:any)=>Promise<any>){
 let client:any;
 try {client=await db.getClient();await client.query('BEGIN');await work(client);}
 catch(e:any){if(client)await client.query('ROLLBACK');res.status(e.code==='23505'?409:503).json({error:e.code==='23505'?'El número de boleto ya fue emitido. Actualice el talonario.':'No se pudo guardar la operación. Intente nuevamente.'});}
 finally{client?.release();}
}
router.get('/',async(req:AuthRequest,res)=>{
 try{
  const params:any[]=[]; const filters=['1=1'];
  const seller=req.user!.role==='super_admin'?req.query.sellerId:req.user!.id;
  if(seller){params.push(seller);filters.push('t.seller_admin_id = $'+params.length);}
  if(typeof req.query.raffleId==='string'){params.push(req.query.raffleId);filters.push('t.raffle_id = $'+params.length);}
  if(typeof req.query.search==='string'){params.push('%'+req.query.search+'%');filters.push('(t.buyer_name ILIKE $'+params.length+' OR t.buyer_dni ILIKE $'+params.length+' OR t.ticket_code ILIKE $'+params.length+')');}
  const result=await db.query('SELECT '+columns+' FROM tickets t WHERE '+filters.join(' AND ')+' ORDER BY t.ticket_number DESC',params);res.json(result.rows);
 }catch{res.status(503).json({error:'No se pudo cargar el talonario.'});}
});
router.post('/',async(req:AuthRequest,res)=>{
 const b=req.body;const quantity=b.quantity??1;
 if(!buyerValid(b)||!Number.isInteger(quantity)||quantity<1||quantity>20||(b.paymentMethod&&!['yape','plin','efectivo','transferencia'].includes(b.paymentMethod))||(b.paymentReference!==undefined&&(typeof b.paymentReference!=='string'||b.paymentReference.length>64)))return res.status(400).json({error:'Nombre, DNI de 8 dígitos, celular de 9 dígitos, pago o cantidad (1 a 20) inválidos.'});
 if(req.user!.role!=='super_admin'&&b.sellerAdminId&&b.sellerAdminId!==req.user!.id)return res.status(403).json({error:'No puede emitir boletos de otro administrador.'});
 const sellerId=req.user!.role==='super_admin'?(b.sellerAdminId||req.user!.id):req.user!.id;
 const raffleId=b.raffleId||'rf-024';
 return transaction(req,res,async c=>{
  const stop=async(status:number,error:string)=>{await c.query('ROLLBACK');res.status(status).json({error});};
  const raffle=(await c.query('SELECT * FROM raffles WHERE id=$1 FOR SHARE',[raffleId])).rows[0];
  if(!raffle||raffle.status!=='activa')return stop(409,'La rifa no está abierta a ventas.');
  const seller=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[sellerId])).rows[0];
  if(!seller||seller.status!=='active'||seller.archived_at||!seller.booklet_number||seller.assigned_raffle_id!==raffleId)return stop(400,'Administrador inactivo, no asignado a la rifa o sin talonario.');
  const start=(seller.booklet_number-1)*20+1;const end=seller.booklet_number*20;
  if(end>raffle.total_tickets)return stop(409,'Amplíe el total de números de la rifa para incluir este talonario.');
  const used=await c.query('SELECT ticket_number FROM tickets WHERE raffle_id=$1 AND ticket_number BETWEEN $2 AND $3',[raffleId,start,end]);
  const occupied=new Set(used.rows.map((r:any)=>r.ticket_number));const free=Array.from({length:20},(_,i)=>start+i).filter(n=>!occupied.has(n));
  const sold=(await c.query("SELECT COUNT(*)::int AS count FROM tickets WHERE raffle_id=$1 AND seller_admin_id=$2 AND status='valid'",[raffleId,sellerId])).rows[0].count;
  const remaining=Math.max(0,Number(seller.quota)-Number(sold));
  if(quantity>remaining)return stop(400,'Cuota insuficiente: quedan '+remaining+' boletos por vender, contando las ventas anteriores.');
  if(quantity>free.length)return stop(400,'Talonario insuficiente: quedan '+free.length+' números sin emitir.');
  const created=[];
  for(const number of free.slice(0,quantity)){
   const id=crypto.randomUUID();const code='TK-'+number+'-'+crypto.randomBytes(6).toString('hex').toUpperCase();
   const hash=crypto.createHash('sha256').update(id+'|'+code+'|'+raffleId+'|'+seller.id+'|'+b.dni.trim()).digest('hex');
   await c.query(`INSERT INTO tickets(id,ticket_number,ticket_code,raffle_id,seller_admin_id,buyer_name,buyer_phone,buyer_dni,payment_method,payment_reference,price_paid,verification_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[id,number,code,raffleId,seller.id,b.buyerName.trim().toUpperCase(),b.phone.trim(),b.dni.trim(),b.paymentMethod||'efectivo',b.paymentReference||null,raffle.ticket_price,hash]);
   created.push((await c.query('SELECT '+columns+' FROM tickets t WHERE id=$1',[id])).rows[0]);
  }
  await audit(c,req,'EMISION_TICKETS',raffleId,{seller:seller.id,numbers:created.map(t=>t.number)});
  await c.query('COMMIT');res.status(201).json({...created[0],createdTickets:created,quantity,totalPaid:quantity*Number(raffle.ticket_price)});
 });
});
router.post('/recover-legacy',async(req:AuthRequest,res)=>{
 if(req.user!.role!=='super_admin')return res.status(403).json({error:'Solo el supervisor puede recuperar comprobantes.'});
 const {sellerAdminId,raffleId,receipts}=req.body;
 if(typeof sellerAdminId!=='string'||typeof raffleId!=='string'||!Array.isArray(receipts)||!receipts.length||receipts.length>20)return res.status(400).json({error:'Indique vendedor, campaña y entre 1 y 20 comprobantes.'});
 const codes=new Set(),numbers=new Set();
 for(const r of receipts){
  if(!r||!Number.isInteger(r.number)||r.number<1||typeof r.verificationCode!=='string'||!new RegExp('^RF-'+r.number+'[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$').test(r.verificationCode)||typeof r.buyerName!=='string'||!r.buyerName.trim()||r.buyerName.length>128||typeof r.dni!=='string'||!/^\d{8}$/.test(r.dni)||typeof r.phone!=='string'||(r.phone!==''&&!/^\d{9}$/.test(r.phone))||typeof r.issuedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(r.issuedAt)||!Number.isFinite(Date.parse(r.issuedAt))||Date.parse(r.issuedAt)>Date.now()||typeof r.price!=='number'||r.price<=0||r.price>100000||codes.has(r.verificationCode)||numbers.has(r.number))return res.status(400).json({error:'Comprobante inválido o repetido. Revise código original, número, comprador, DNI, fecha, monto y celular (puede quedar vacío si se desconoce).'});
  codes.add(r.verificationCode);numbers.add(r.number);
 }
 return transaction(req,res,async c=>{
  const stop=async(error:string)=>{await c.query('ROLLBACK');res.status(409).json({error});};
  const raffle=(await c.query('SELECT * FROM raffles WHERE id=$1 FOR UPDATE',[raffleId])).rows[0];
  if(!raffle||!['activa','cerrada'].includes(raffle.status)||(await c.query('SELECT id FROM prizes WHERE raffle_id=$1 AND winner_ticket_id IS NOT NULL',[raffleId])).rowCount)return stop('No se recuperan ventas durante o después del sorteo.');
  const seller=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[sellerAdminId])).rows[0];
  if(!seller||seller.archived_at||seller.status!=='active'||seller.assigned_raffle_id!==raffleId)return stop('Vendedor inactivo o no asignado a la campaña.');
  const pending=[];const recovered=[];
  for(const r of receipts){
   if(r.number>raffle.total_tickets)return stop('Número fuera de la capacidad de la campaña.');
   const existing=(await c.query('SELECT * FROM tickets WHERE LOWER(ticket_code)=LOWER($1) OR (raffle_id=$2 AND ticket_number=$3)',[r.verificationCode,raffleId,r.number])).rows;
   if(existing.length){const t=existing[0];if(existing.length!==1||t.ticket_code!==r.verificationCode||t.ticket_number!==r.number||t.raffle_id!==raffleId||t.seller_admin_id!==sellerAdminId||t.buyer_dni!==r.dni||t.buyer_name!==r.buyerName.trim().toUpperCase()||t.status!=='valid'||Number(t.price_paid)!==r.price||new Date(t.sold_at).getTime()!==Date.parse(r.issuedAt))return stop('Conflicto: '+r.verificationCode+'. No se modificó ningún boleto.');recovered.push(t.id);}else pending.push(r);
  }
  const sold=Number((await c.query("SELECT COUNT(*)::int AS count FROM tickets WHERE seller_admin_id=$1 AND raffle_id=$2 AND status='valid'",[sellerAdminId,raffleId])).rows[0].count);
  if(sold+pending.length>seller.quota)return stop('La recuperación excedería la cuota del vendedor.');
  for(const r of pending){const id=crypto.randomUUID();const hash=crypto.createHash('sha256').update(id+'|'+r.verificationCode+'|'+raffleId+'|'+sellerAdminId+'|'+r.dni).digest('hex');
   await c.query(`INSERT INTO tickets(id,ticket_number,ticket_code,raffle_id,seller_admin_id,buyer_name,buyer_phone,buyer_dni,payment_method,price_paid,verification_hash,sold_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'efectivo',$9,$10,$11)`,[id,r.number,r.verificationCode,raffleId,sellerAdminId,r.buyerName.trim().toUpperCase(),r.phone,r.dni,r.price,hash,r.issuedAt]);recovered.push(id);
  }
  if(pending.length)await audit(c,req,'RECUPERAR_COMPROBANTES_LOCALES',raffleId,{seller:sellerAdminId,source:'Comprobantes aportados y conciliados por supervisor',receipts:pending.map(r=>({code:r.verificationCode,number:r.number,issuedAt:r.issuedAt,price:r.price,missingPhone:r.phone===''})),recoveredAt:new Date().toISOString()});
  await c.query('COMMIT');res.json({success:true,created:pending.length,alreadyPresent:receipts.length-pending.length,codes:receipts.map(r=>r.verificationCode)});
 });
});
router.put('/:id',async(req:AuthRequest,res)=>{
 if(!buyerValid(req.body))return res.status(400).json({error:'Nombre, DNI de 8 dígitos y celular de 9 dígitos requeridos.'});
 return transaction(req,res,async c=>{
  const scope=await c.query('SELECT raffle_id FROM tickets WHERE id=$1',[req.params.id]);
  if(!scope.rows.length){await c.query('ROLLBACK');return res.status(404).json({error:'Boleto no encontrado.'});}
  await c.query('SELECT id FROM raffles WHERE id=$1 FOR SHARE',[scope.rows[0].raffle_id]);
  const b=req.body;
  const result=await c.query(`UPDATE tickets SET buyer_name=$1,buyer_dni=$2,buyer_phone=$3 WHERE id=$4 AND ($5='super_admin' OR seller_admin_id=$6) RETURNING *`,[b.buyerName.trim().toUpperCase(),b.dni.trim(),b.phone.trim(),req.params.id,req.user!.role,req.user!.id]);
  if(!result.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Boleto no encontrado o sin permisos.'});}
  await c.query('UPDATE prizes SET winner_name=$1,winner_phone=$2 WHERE winner_ticket_id=$3',[b.buyerName.trim().toUpperCase(),b.phone.trim(),req.params.id]);
  await audit(c,req,'ACTUALIZAR_TICKET',req.params.id,{buyerName:b.buyerName.trim().toUpperCase(),dni:b.dni.trim(),phone:b.phone.trim()});
  const ticket=(await c.query('SELECT '+columns+' FROM tickets t WHERE id=$1',[req.params.id])).rows[0];
  await c.query('COMMIT');res.json({success:true,ticket});
 });
});
router.delete('/:id',async(req:AuthRequest,res)=>transaction(req,res,async c=>{
 const scope=await c.query('SELECT raffle_id FROM tickets WHERE id=$1',[req.params.id]);
 if(!scope.rows.length){await c.query('ROLLBACK');return res.status(404).json({error:'Boleto no encontrado.'});}
 await c.query('SELECT id FROM raffles WHERE id=$1 FOR SHARE',[scope.rows[0].raffle_id]);
 const r=await c.query(`UPDATE tickets SET status='cancelled' WHERE id=$1 AND ($2='super_admin' OR seller_admin_id=$3) AND id NOT IN(SELECT winner_ticket_id FROM prizes WHERE winner_ticket_id IS NOT NULL) RETURNING id`,[req.params.id,req.user!.role,req.user!.id]);
 if(!r.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Boleto no encontrado, premiado o sin permisos.'});}
 await audit(c,req,'ANULAR_TICKET',req.params.id,{status:'cancelled'});await c.query('COMMIT');res.json({success:true});
}));
export default router;
