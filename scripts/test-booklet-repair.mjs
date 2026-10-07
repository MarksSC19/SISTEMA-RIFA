import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();const schema=fs.readFileSync('server/schema.sql','utf8');
await db.exec(schema);
await db.exec(`INSERT INTO raffles(id,code,name) VALUES('rf-024','024','TEST');
INSERT INTO users(id,email,password_hash,full_name,dni,phone,role,booklet_number) VALUES
('adm-31','j@test','unchanged','J','11111111','999999999','admin',31),
('rosa-test','r@test','unchanged','R','22222222','999999999','admin',34),
('new-test','n@test','unchanged','N','33333333','999999999','admin',36);
INSERT INTO tickets(id,ticket_number,ticket_code,raffle_id,seller_admin_id,buyer_name,buyer_phone,buyer_dni,payment_method,verification_hash)
SELECT 't'||n,n,'QR'||n,'rf-024',CASE WHEN n<=612 THEN 'rosa-test' ELSE 'adm-31' END,'BUYER','999999999','44444444','efectivo','hash'||n FROM generate_series(601,620) n;
INSERT INTO tickets(id,ticket_number,ticket_code,raffle_id,seller_admin_id,buyer_name,buyer_phone,buyer_dni,payment_method,verification_hash,status)
VALUES('reserved',721,'OLDQR','rf-024','rosa-test','OLD','999999999','44444444','efectivo','oldhash','cancelled');`);
const before=(await db.query('SELECT * FROM tickets ORDER BY id')).rows;
await db.exec('BEGIN');await db.exec(schema);await db.exec('COMMIT');
const users=(await db.query('SELECT id,booklet_number,password_hash FROM users ORDER BY id')).rows;
assert.equal(users.find(u=>u.id==='adm-31').booklet_number,38); // cancelled 721 skips block 37
assert.equal(users.find(u=>u.id==='rosa-test').booklet_number,34);
assert.equal(users.find(u=>u.id==='new-test').booklet_number,36);
assert(users.every(u=>u.password_hash==='unchanged'));
assert.deepEqual((await db.query('SELECT * FROM tickets ORDER BY id')).rows,before);
assert.equal((await db.query('SELECT total_tickets FROM raffles')).rows[0].total_tickets,760);
await db.exec('BEGIN');await db.exec(schema);await db.exec('COMMIT');
assert.deepEqual((await db.query('SELECT id,booklet_number,password_hash FROM users ORDER BY id')).rows,users);
assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='CONTINUACION_TALONARIO'")).rows[0].n,1);
await db.close();console.log('Booklet repair: historical QR preserved, cancelled block skipped, quota unchanged, repeatable migration passed.');

