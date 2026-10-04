import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../db';
import { AuthRequest, requireSuperAdmin } from '../middleware/authMiddleware';
import { publicUser } from '../security';
import { adminOperation, OperationError, writeAudit } from '../adminOperations';
const router = Router();
router.use(requireSuperAdmin);
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toUpperCase();
const validEmail = (email: unknown) => typeof email === 'string' && email.length <= 128 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
async function checkName(client: any, name: string, id: string, allowSameName: unknown) {
  const same = await client.query("SELECT id FROM users WHERE UPPER(REGEXP_REPLACE(TRIM(full_name),'\\s+',' ','g'))=$1 AND id<>$2 AND archived_at IS NULL", [normalizeName(name), id]);
  if (same.rowCount && allowSameName !== true) throw new OperationError(409, 'Ya existe una cuenta con ese nombre. Revise el DNI y confirme si se trata de otra persona.');
}
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT u.*, (SELECT COUNT(*)::int FROM tickets t WHERE t.seller_admin_id=u.id AND t.raffle_id=u.assigned_raffle_id AND t.status='valid') AS total_sold,
      COALESCE((SELECT SUM(price_paid) FROM tickets t WHERE t.seller_admin_id=u.id AND t.raffle_id=u.assigned_raffle_id AND t.status='valid'),0)::float AS total_collected
      FROM users u WHERE ($1::boolean OR u.archived_at IS NULL) ORDER BY u.booklet_number`, [req.query.includeArchived === 'true']);
    res.json(r.rows.map(u => ({...publicUser(u),archivedAt:u.archived_at,status:u.status==='active'?'activo':'inactivo',totalSold:u.total_sold,totalCollected:u.total_collected,assignedRafflesCount:1})));
  } catch { res.status(500).json({error:'No se pudo cargar administradores.'}); }
});
router.post('/', async (req: AuthRequest, res) => {
  const {name,dni,email,password,assignedQuota,assignedRaffleId,allowSameName} = req.body;
  if (typeof name!=='string'||!name.trim()||name.length>128||typeof dni!=='string'||!/^\d{8}$/.test(dni.trim())||(assignedQuota!==undefined&&assignedQuota!==20)) return res.status(400).json({error:'Nombre, DNI o cuota inválidos.'});
  const mail = typeof email==='string' && email.trim() ? email.trim().toLowerCase() : `admin.${dni.trim()}@rifas.pe`;
  const pass = password || dni.trim();
  if (!validEmail(mail)||typeof pass!=='string'||pass.trim().length<6||Buffer.byteLength(pass)>72) return res.status(400).json({error:'Correo o contraseña inválidos.'});
  const hash = await bcrypt.hash(pass,12);
  return adminOperation(req,res,async c => {
    const raffleId = assignedRaffleId || 'rf-024';
    if (!(await c.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[raffleId])).rowCount) throw new OperationError(400,'Rifa no encontrada.');
    await c.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const id = crypto.randomUUID(); await checkName(c,name,id,allowSameName);
    const r = await c.query(`INSERT INTO users(id,full_name,dni,email,password_hash,phone,role,status,quota,must_change_password,assigned_raffle_id)
      VALUES($1,$2,$3,$4,$5,'','admin','active',20,true,$6) RETURNING *`,[id,normalizeName(name),dni.trim(),mail,hash,raffleId]);
    await c.query('UPDATE raffles SET total_tickets=GREATEST(total_tickets,$2) WHERE id=$1',[raffleId,r.rows[0].booklet_number*20]);
    await writeAudit(c,req,'CREAR_ADMINISTRADOR',id,{name:normalizeName(name),dni:dni.trim(),raffleId,allowSameName:allowSameName===true});
    return {...publicUser(r.rows[0]),archivedAt:null,totalSold:0,totalCollected:0,assignedRafflesCount:1,status:'activo'};
  },201);
});
router.put('/:id', async (req: AuthRequest,res) => {
  const {name,dni,email,status,password,assignedQuota,assignedRaffleId,restore,allowSameName} = req.body;
  if ((assignedQuota!==undefined&&assignedQuota!==20)||(name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>128))||(dni!==undefined&&(typeof dni!=='string'||!/^\d{8}$/.test(dni.trim())))||(email!==undefined&&!validEmail(email))||(status!==undefined&&!['activo','inactivo'].includes(status))||(restore!==undefined&&typeof restore!=='boolean')) return res.status(400).json({error:'Datos inválidos.'});
  if (password && (typeof password!=='string'||password.trim().length<6||Buffer.byteLength(password)>72)) return res.status(400).json({error:'Contraseña inválida.'});
  const hash = password ? await bcrypt.hash(password,12) : null;
  return adminOperation(req,res,async c => {
    // Lock campaigns before users, matching ticket issuance and creation.
    if (assignedRaffleId && !(await c.query('SELECT id FROM raffles WHERE id=$1 FOR UPDATE',[assignedRaffleId])).rowCount) throw new OperationError(400,'Rifa no encontrada.');
    await c.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const before = (await c.query("SELECT * FROM users WHERE id=$1 AND role='admin' FOR UPDATE",[req.params.id])).rows[0];
    if (!before) throw new OperationError(404,'Administrador no encontrado.');
    if (before.archived_at && restore !== true) throw new OperationError(409,'Restaure la cuenta antes de editarla.');
    if ((name && normalizeName(name)!==normalizeName(before.full_name)) || restore===true) await checkName(c,name || before.full_name,before.id,allowSameName);
    await c.query(`UPDATE users SET full_name=COALESCE($1,full_name),dni=COALESCE($2,dni),email=COALESCE($3,email),status=COALESCE($4,status),
      password_hash=COALESCE($5,password_hash),must_change_password=CASE WHEN $5::text IS NULL THEN must_change_password ELSE true END,
      assigned_raffle_id=COALESCE($7,assigned_raffle_id),archived_at=CASE WHEN $8::boolean THEN NULL ELSE archived_at END WHERE id=$6`,
      [name?normalizeName(name):null,dni?.trim(),email?.trim().toLowerCase(),status===undefined?null:status==='activo'?'active':'inactive',hash,before.id,assignedRaffleId,restore===true]);
    if (assignedRaffleId) await c.query('UPDATE raffles SET total_tickets=GREATEST(total_tickets,$2) WHERE id=$1',[assignedRaffleId,before.booklet_number*20]);
    await writeAudit(c,req,restore?'RESTAURAR_ADMINISTRADOR':'EDITAR_ADMINISTRADOR',before.id,{before:{name:before.full_name,dni:before.dni,status:before.status,raffleId:before.assigned_raffle_id},after:{name,dni,email,status,raffleId:assignedRaffleId},passwordReset:!!hash});
    return {success:true};
  });
});
// Recoverable removal. Never delete or reassign historical tickets.
router.delete('/:id',(req: AuthRequest,res)=>adminOperation(req,res,async c=>{
  const before=(await c.query("SELECT * FROM users WHERE id=$1 AND role='admin' FOR UPDATE",[req.params.id])).rows[0];
  if (!before) throw new OperationError(404,'Administrador no encontrado.');
  if (!before.archived_at) {
    await c.query("UPDATE users SET status='inactive',archived_at=CURRENT_TIMESTAMP WHERE id=$1",[before.id]);
    const history=await c.query('SELECT COUNT(*)::int AS total FROM tickets WHERE seller_admin_id=$1',[before.id]);
    await writeAudit(c,req,'ARCHIVAR_ADMINISTRADOR',before.id,{name:before.full_name,ticketsPreserved:history.rows[0].total});
  }
  return {success:true,message:'Administrador retirado del listado. Cuenta recuperable e historial conservado.'};
}));
export default router;
