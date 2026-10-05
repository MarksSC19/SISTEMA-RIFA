import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import db from '../server/db';
import auth from '../server/routes/auth';
import tickets from '../server/routes/tickets';
import admins from '../server/routes/admins';
import prizes from '../server/routes/prizes';
import draw from '../server/routes/draw';
import publicRoutes from '../server/routes/public';
import raffles from '../server/routes/raffles';
import config from '../server/routes/config';
import { getAdminBooklet, getAdminAvailableNumbers } from '../src/utils/ticketQuota';
import {adminMetrics,activeSellers} from '../src/utils/adminMetrics';

const pg = new PGlite();
await pg.exec(fs.readFileSync('server/schema.sql', 'utf8'));
await pg.exec(fs.readFileSync('server/schema.sql', 'utf8')); // migration is repeatable
let failAudit=false;
const query = async (sql: string, params?: any[]) => {
  if(failAudit&&sql.startsWith('INSERT INTO audit_logs')){failAudit=false;throw new Error('Simulated audit failure');}
  const r = await pg.query(sql, params);
  return { rows: r.rows, rowCount: r.affectedRows || r.rows.length } as any;
};
db.query = query;
// PGlite has one connection. Serialize complete transactions in the adapter.
let tail = Promise.resolve();
db.getClient = async () => {
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  return { query, release } as any;
};
const hash = await bcrypt.hash('Temp2026!', 4);
for (const [id, dni, role, booklet] of [['adm-1', '11111111', 'admin', 1], ['adm-2', '22222222', 'super_admin', 2], ['adm-3', '33333333', 'admin', 3]]) {
  await query(`INSERT INTO users(id,email,password_hash,full_name,dni,phone,role,quota,must_change_password,booklet_number) VALUES($1,$2,$3,$4,$5,'999999999',$6,20,$7,$8)`, [id, id+'@example.com',hash,'TEST '+id,dni,role,id==='adm-1',booklet]);
}
await query("INSERT INTO raffles(id,code,name,total_tickets,status) VALUES('rf-024','024','PRUEBA',620,'activa')");
for(let i=1;i<=3;i++)await query("INSERT INTO prizes(id,raffle_id,position,title,category) VALUES($1,'rf-024',$2,$3,'prueba')",['p'+i,i,'Premio '+i]);
const app=express(); app.use(express.json());
app.use('/api/auth',auth); app.use('/api/tickets',tickets); app.use('/api/admins',admins); app.use('/api/prizes',prizes); app.use('/api/draw',draw); app.use('/api/public',publicRoutes); app.use('/api/raffles',raffles); app.use('/api/config',config);
const server=app.listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+(server.address() as any).port;
let checks=0;
async function request(method:string,path:string,body?:any,token?:string,expected=200){
  const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();assert.equal(r.status,expected,JSON.stringify({path,data}));checks++;return data;
}
try {
  const login = (dni:string,password='Temp2026!')=>request('POST','/auth/login',{identifier:dni,password});
  const a=await login('11111111'); const b=await login('33333333');const s=await login('22222222');
  await request('POST','/auth/login',{identifier:'88888888',password:'88888888'},undefined,401);
  await request('PUT','/auth/profile',{dni:'11111111',name:'HACK',email:'hack@example.com'},undefined,401);
  await request('POST','/auth/change-password',{dni:'11111111',currentPassword:'11111111',newPassword:'New2026!'},undefined,401);
  await request('GET','/tickets',undefined,a.token,403);
  await request('POST','/auth/change-password',{currentPassword:'11111111',newPassword:'New2026!'},a.token,400);
  await request('POST','/auth/change-password',{newPassword:'New2026!'},a.token,400);
  const changed=await request('POST','/auth/change-password',{currentPassword:'Temp2026!',newPassword:'New2026!'},a.token);
  assert.equal(changed.user.mustChangePassword,false);assert.equal(changed.user.assignedQuota,20);
  await request('GET','/auth/me',undefined,a.token,401);
  await request('POST','/auth/login',{identifier:'11111111',password:'11111111'},undefined,401);
  await request('POST','/auth/login',{identifier:'11111111',password:'Temp2026!'},undefined,401);
  const a2=await login('11111111','New2026!');
  await request('GET','/admins',undefined,a2.token,403);
  const buyer={buyerName:'COMPRADOR PRUEBA',dni:'44444444',phone:'999999999',paymentMethod:'efectivo'};
  await request('POST','/tickets',{...buyer,sellerAdminId:'adm-3'},a2.token,403);
  for(const quantity of [0,-1,1.5,'dos',21])await request('POST','/tickets',{...buyer,quantity},a2.token,400);
  const issued=await request('POST','/tickets',{...buyer,quantity:20},a2.token,201);
  assert.deepEqual(issued.createdTickets.map((t:any)=>t.number),Array.from({length:20},(_,i)=>i+1));
  await request('POST','/tickets',buyer,a2.token,400);
  const id=issued.id;
  await request('PUT','/tickets/'+id,{...buyer,buyerName:'AJENO'},b.token,404);
  await request('DELETE','/tickets/'+id,undefined,b.token,404);
  const edited=await request('PUT','/tickets/'+id,{...buyer,buyerName:'CORREGIDO'},s.token);
  assert.equal(edited.ticket.buyerName,'CORREGIDO');assert.equal(edited.ticket.sellerAdminId,'adm-1');
  await request('DELETE','/tickets/'+id,undefined,a2.token);
  await request('POST','/tickets',buyer,a2.token,400); // cancelled numbers never reused
  const list=await request('GET','/tickets?sellerId=adm-1',undefined,b.token);assert.equal(list.length,0);
  const all=await request('GET','/tickets',undefined,s.token);assert.equal(all.length,20);
  const summary=await request('GET','/public/summary');assert.equal(summary.totalSold,19);assert.equal(Number(summary.totalAmount),190);assert.equal(summary.totalPrizesCount,3);
  const winner=await request('POST','/draw/execute',{prizeId:'p1'},s.token);
  await request('POST','/draw/execute',{prizeId:'p1'},s.token,409);
  await request('DELETE','/tickets/'+winner.winner.ticketId,undefined,s.token,404);
  const verify=await request('GET','/public/verify/'+issued.verificationCode);assert.equal(verify.valid,false);
  assert.notEqual(verify.ticket.buyerName,'CORREGIDO');assert.equal(verify.ticket.dni,'****4444');assert.equal(verify.ticket.rawDni,undefined);
  assert.equal(verify.buyerAllTickets.length,1);
  await request('GET','/public/verify/1',undefined,undefined,404);
  await request('GET','/public/verify/44444444',undefined,undefined,404);
  const privateVerify=await request('GET','/public/verify/44444444',undefined,s.token);
  assert.equal(privateVerify.ticket.dni,'44444444');
  await request('GET','/public/verify/'+issued.verificationCode,undefined,b.token,404);
  const roster=await request('GET','/admins',undefined,s.token);assert.equal(roster.length,3);assert.equal(roster[0].bookletNumber,1);
  await request('POST','/admins',{name:'DUPLICADO',dni:'11111111',email:'new@example.com'},s.token,409);
  const n=await request('POST','/admins',{name:'NUEVO',dni:'55555555',email:'new@example.com'},s.token,201);assert.ok(n.bookletNumber>31);
  await request('PUT','/admins/adm-1',{name:'RENOMBRADO',dni:'66666666'},s.token);
  const after=await query("SELECT * FROM users WHERE id='adm-1'");assert.equal(after.rows[0].booklet_number,1);assert.ok(await bcrypt.compare('New2026!',after.rows[0].password_hash));
  await request('DELETE','/admins/adm-3',undefined,s.token);
  assert.ok(!(await request('GET','/admins',undefined,s.token)).some((u:any)=>u.id==='adm-3'));
  assert.ok((await request('GET','/admins?includeArchived=true',undefined,s.token)).find((u:any)=>u.id==='adm-3').archivedAt);
  await request('GET','/tickets',undefined,b.token,401);
  await request('PUT','/config',{organizationName:'NUEVA ORGANIZACIÓN'},s.token);
  assert.equal((await request('GET','/config')).organizationName,'NUEVA ORGANIZACIÓN');
  const rf=(await request('GET','/raffles',undefined,s.token))[0];
  await request('PUT','/raffles/rf-024',{...rf,status:'cerrada',ticketPrice:10,totalTickets:n.bookletNumber*20},s.token);
  await request('POST','/tickets',buyer,s.token,409);
  const newRaffle={id:'rf-test',code:'TEST',title:'Campaña de prueba',description:'PRUEBA',status:'activa',ticketPrice:12,totalTickets:n.bookletNumber*20,drawDate:'01/12/2026 20:00:00',currency:'S/',assignedAdmin:'TEST'};
  await request('POST','/raffles',newRaffle,s.token,201);
  await request('PUT','/raffles/rf-test',{...newRaffle,title:'Campaña corregida'},s.token);
  assert.equal((await request('GET','/raffles',undefined,s.token)).find((r:any)=>r.id==='rf-test').title,'Campaña corregida');
  const newPrize={id:'p-test',raffleId:'rf-test',order:1,name:'Nuevo premio',category:'Prueba',description:'Prueba'};
  await request('POST','/prizes',newPrize,s.token,201);
  await request('PUT','/prizes/p-test',{...newPrize,name:'Premio corregido'},s.token);
  await request('POST','/prizes',{...newPrize,id:'p-duplicate'},s.token,409);
  await request('PUT','/admins/'+n.id,{assignedRaffleId:'rf-test'},s.token);
  const nl=await login('55555555','55555555');
  await request('POST','/auth/change-password',{currentPassword:'55555555',newPassword:'Operador2026!'},nl.token);
  const nt=(await login('55555555','Operador2026!')).token;
  await request('POST','/tickets',{...buyer,raffleId:'rf-024'},nt,409); // closed campaign
  const newSale=await request('POST','/tickets',{...buyer,raffleId:'rf-test'},nt,201);
  assert.equal(newSale.number,(n.bookletNumber-1)*20+1);assert.equal(newSale.totalPaid,12);
  const secondDraw=await request('POST','/draw/execute',{prizeId:'p-test'},s.token);
  assert.equal(secondDraw.winner.ticketId,newSale.id); // candidates isolated by campaign
  await request('DELETE','/prizes/p-test',undefined,s.token,409);
  await request('POST','/prizes/reset',{raffleId:'rf-test'},s.token);
  assert.equal((await request('GET','/prizes')).find((p:any)=>p.id==='p1').isDrawn,true);
  await request('DELETE','/prizes/p-test',undefined,s.token);
  await request('DELETE','/raffles/rf-test',undefined,s.token,409); // history preserved
  const emptyRaffle={...newRaffle,id:'rf-empty',code:'EMPTY'};
  await request('POST','/raffles',emptyRaffle,s.token,201);
  await request('DELETE','/raffles/rf-empty',undefined,s.token);
  const oldToken=nt;
  const profile=await request('PUT','/auth/profile',{name:'Perfil actualizado',email:'changed@example.com',phone:'999999999',currentPassword:'Operador2026!',newPassword:'Perfil2026!'},nt);
  await request('GET','/auth/me',undefined,oldToken,401);
  assert.equal(profile.user.name,'Perfil actualizado');
  const logs=await query("SELECT previous_hash FROM audit_logs ORDER BY created_at,id");
  assert.ok(logs.rows.length>2);assert.ok(logs.rows.some((r:any)=>r.previous_hash!=='GENESIS'));
  assert.equal(getAdminBooklet('unknown').adminNumber,0);
  const booklet=getAdminBooklet(n.id,n.bookletNumber);assert.equal(booklet.startNumber,(n.bookletNumber-1)*20+1);
  assert.equal(getAdminAvailableNumbers(getAdminBooklet('adm-1'),all).length,0);
  // Archive a seller with history, including a cancelled ticket. All rows survive.
  await request('DELETE','/admins/adm-1',undefined,s.token);
  assert.equal((await query("SELECT COUNT(*)::int AS n FROM tickets WHERE seller_admin_id='adm-1'")).rows[0].n,20);
  assert.ok(!(await request('GET','/admins',undefined,s.token)).some((u:any)=>u.id==='adm-1'));
  await request('PUT','/admins/adm-1',{name:'IGNORED'},s.token,409);
  await request('PUT','/admins/adm-1',{restore:true,status:'inactivo'},s.token);
  assert.equal((await request('GET','/admins',undefined,s.token)).find((u:any)=>u.id==='adm-1').archivedAt,null);
  await request('DELETE','/admins/adm-2',undefined,s.token,404); // supervisor cannot delete own account
  await request('POST','/admins',{name:'  renombrado  ',dni:'99999999',email:'other@example.com'},s.token,409);
  const homonym=await request('POST','/admins',{name:'RENOMBRADO',dni:'99999999',email:'other@example.com',allowSameName:true},s.token,201);
  const defaultAdmin=await request('POST','/admins',{name:'DEFAULT CAMPAIGN',dni:'88888888',email:'default@example.com'},s.token,201);
  assert.ok((await query("SELECT total_tickets FROM raffles WHERE id='rf-024'")).rows[0].total_tickets>=defaultAdmin.bookletNumber*20);
  const small={...newRaffle,id:'rf-small',code:'SMALL',totalTickets:20};
  await request('POST','/raffles',small,s.token,201); // unrelated users don't inflate a new campaign
  await request('POST','/prizes',{...newPrize,id:'p-small',raffleId:'rf-small'},s.token,201);
  await request('PUT','/admins/'+defaultAdmin.id,{assignedRaffleId:'rf-small'},s.token);
  assert.ok((await query("SELECT total_tickets FROM raffles WHERE id='rf-small'")).rows[0].total_tickets>=defaultAdmin.bookletNumber*20);
  const defaultLogin=await login('88888888','88888888');
  const defaultChanged=await request('POST','/auth/change-password',{currentPassword:'88888888',newPassword:'Different2026!'},defaultLogin.token);
  const firstPrice=await request('POST','/tickets',{...buyer,raffleId:'rf-small'},defaultChanged.token,201);assert.equal(firstPrice.price,12);
  await request('PUT','/raffles/rf-small',{...small,totalTickets:defaultAdmin.bookletNumber*20,ticketPrice:15},s.token);
  const secondPrice=await request('POST','/tickets',{...buyer,raffleId:'rf-small'},defaultChanged.token,201);assert.equal(secondPrice.price,15);
  // Historical sales outside the new range consume the same quota and retain their codes.
  await query('UPDATE tickets SET ticket_number=1001 WHERE id=$1',[firstPrice.id]);
  await query('UPDATE tickets SET ticket_number=1002 WHERE id=$1',[secondPrice.id]);
  await request('POST','/tickets',{...buyer,raffleId:'rf-small',quantity:19},defaultChanged.token,400);
  const historicalSales=await request('GET','/tickets?raffleId=rf-small',undefined,defaultChanged.token);
  assert.equal(historicalSales.length,2);
  assert.deepEqual(historicalSales.map((t:any)=>t.verificationCode).sort(),[firstPrice.verificationCode,secondPrice.verificationCode].sort());
  await query('UPDATE tickets SET ticket_number=$1 WHERE id=$2',[firstPrice.number,firstPrice.id]);
  await query('UPDATE tickets SET ticket_number=$1 WHERE id=$2',[secondPrice.number,secondPrice.id]);
  // A repeat buyer gets distinct persistent tickets, including after login and migration.
  assert.notEqual(firstPrice.id,secondPrice.id);
  assert.notEqual(firstPrice.verificationCode,secondPrice.verificationCode);
  const passwordBefore=(await query('SELECT password_hash,must_change_password FROM users WHERE id=$1',[defaultAdmin.id])).rows[0];
  await request('POST','/auth/login',{identifier:'88888888',password:'88888888'},undefined,401);
  assert.deepEqual((await query('SELECT password_hash,must_change_password FROM users WHERE id=$1',[defaultAdmin.id])).rows[0],passwordBefore);
  await pg.exec(fs.readFileSync('server/schema.sql','utf8'));
  assert.deepEqual((await query('SELECT password_hash,must_change_password FROM users WHERE id=$1',[defaultAdmin.id])).rows[0],passwordBefore);
  const relogged=await login('88888888','Different2026!');
  assert.equal(relogged.user.mustChangePassword,false);
  const repeatBuyerTickets=await request('GET','/tickets?raffleId=rf-small',undefined,relogged.token);
  assert.deepEqual(repeatBuyerTickets.map((t:any)=>t.verificationCode).sort(),[firstPrice.verificationCode,secondPrice.verificationCode].sort());
  const sellerMetrics=(await request('GET','/admins',undefined,s.token)).find((u:any)=>u.id===defaultAdmin.id);
  assert.equal(sellerMetrics.totalCollected,27);assert.equal(sellerMetrics.totalSold,2);
  await request('PUT','/raffles/rf-small',{...small,totalTickets:20},s.token,400);
  await request('POST','/draw/execute',{prizeId:'p-small',allowRedraw:'false'},s.token,400);
  await request('PUT','/raffles/rf-small',{...small,totalTickets:defaultAdmin.bookletNumber*20,status:'borrador'},s.token);
  await request('POST','/draw/execute',{prizeId:'p-small'},s.token,409);
  const dashboardAdmins=[{...sellerMetrics,name:'SAME'},{...homonym,name:'SAME',assignedRaffleId:'rf-small',status:'inactivo'}];
  const dashboard=adminMetrics(dashboardAdmins,[firstPrice,secondPrice,{...firstPrice,id:'cancelled',status:'cancelled',isValid:false}], 'rf-small');
  assert.equal(dashboard[0].totalSold,2);assert.equal(dashboard[0].totalCollected,27);assert.equal(dashboard[1].totalSold,0);
  assert.equal(activeSellers(dashboard).length,1);
  // Reassignment retains the original campaign's historical sales metrics.
  const historyDashboard=adminMetrics([{...sellerMetrics,assignedRaffleId:'rf-024'}],[firstPrice,secondPrice],'rf-small');
  assert.equal(historyDashboard[0].totalCollected,27);
  const persistedActions=(await query('SELECT action,details FROM audit_logs')).rows;
  for(const action of ['CREAR_ADMINISTRADOR','EDITAR_ADMINISTRADOR','ARCHIVAR_ADMINISTRADOR','RESTAURAR_ADMINISTRADOR','EDITAR_CONFIGURACION','CREAR_RIFA','EDITAR_RIFA','ELIMINAR_RIFA','CREAR_PREMIO','EDITAR_PREMIO','ELIMINAR_PREMIO','REINICIAR_PREMIOS']) assert.ok(persistedActions.some((a:any)=>a.action===action),action);
  assert.ok(persistedActions.find((a:any)=>a.action==='REINICIAR_PREMIOS').details.includes(newSale.id));
  assert.ok(!JSON.stringify(persistedActions).includes('password_hash'));
  // Audit and account mutation must either both commit or both roll back.
  failAudit=true;
  await request('DELETE','/admins/'+homonym.id,undefined,s.token,500);
  assert.equal((await query('SELECT archived_at FROM users WHERE id=$1',[homonym.id])).rows[0].archived_at,null);
  // Known historical alternate is recoverably retired only when it has no tickets.
  const historicalName='ROSA VALERIA NAUPARI SALVADOR';
  await query(`INSERT INTO users(id,email,password_hash,full_name,dni,phone,role) VALUES('historical-original','historical@example.com',$1,$2,'72095575','','admin'),('adm-23-alt','rosa.naupari.alt@rifas.pe',$1,$2,'72970575','','admin')`,[hash,historicalName]);
  await pg.exec(fs.readFileSync('server/schema.sql','utf8'));
  const retired=(await query("SELECT * FROM users WHERE id='adm-23-alt'")).rows[0];assert.ok(retired.archived_at);assert.equal(retired.status,'inactive');
  await pg.exec(fs.readFileSync('server/schema.sql','utf8'));
  assert.equal((await query("SELECT COUNT(*)::int AS n FROM audit_logs WHERE id='migration-retire-rosa-alt'")).rows[0].n,1);
  await query("UPDATE users SET archived_at=NULL WHERE id='adm-23-alt'");
  await query(`INSERT INTO tickets(id,ticket_number,ticket_code,raffle_id,seller_admin_id,buyer_name,buyer_phone,buyer_dni,payment_method,verification_hash,status) VALUES('historical-cancelled',600,'HISTORY-TEST','rf-small','adm-23-alt','HISTORY','999999999','44444444','efectivo','TEST','cancelled')`);
  await pg.exec(fs.readFileSync('server/schema.sql','utf8'));
  assert.equal((await query("SELECT archived_at FROM users WHERE id='adm-23-alt'")).rows[0].archived_at,null);
  assert.equal((await query("SELECT status FROM tickets WHERE id='historical-cancelled'")).rows[0].status,'cancelled');
  const capacity=(await query("SELECT total_tickets FROM raffles WHERE id='rf-024'")).rows[0].total_tickets;
  const assignedMaximum=(await query("SELECT MAX(booklet_number)*20 AS needed FROM users WHERE assigned_raffle_id='rf-024' AND archived_at IS NULL")).rows[0].needed;
  assert.ok(capacity>=assignedMaximum);assert.ok((await query("SELECT total_tickets FROM raffles WHERE id='rf-small'")).rows[0].total_tickets>=600);
  console.log('PASS: '+checks+' comprobaciones HTTP + migración repetible, numeración, cuotas y persistencia.');
} finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close();await db.pool.end(); }
