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

const pg = new PGlite();
await pg.exec(fs.readFileSync('server/schema.sql', 'utf8'));
await pg.exec(fs.readFileSync('server/schema.sql', 'utf8')); // migration is repeatable
const query = async (sql: string, params?: any[]) => {
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
  const roster=await request('GET','/admins',undefined,s.token);assert.equal(roster.length,3);assert.equal(roster[0].bookletNumber,1);
  await request('POST','/admins',{name:'DUPLICADO',dni:'11111111',email:'new@example.com'},s.token,409);
  const n=await request('POST','/admins',{name:'NUEVO',dni:'55555555',email:'new@example.com'},s.token,201);assert.ok(n.bookletNumber>31);
  await request('PUT','/admins/adm-1',{name:'RENOMBRADO',dni:'66666666'},s.token);
  const after=await query("SELECT * FROM users WHERE id='adm-1'");assert.equal(after.rows[0].booklet_number,1);assert.ok(await bcrypt.compare('New2026!',after.rows[0].password_hash));
  await request('DELETE','/admins/adm-3',undefined,s.token);
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
  console.log('PASS: '+checks+' comprobaciones HTTP + migración repetible, numeración, cuotas y persistencia.');
} finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close();await db.pool.end(); }
