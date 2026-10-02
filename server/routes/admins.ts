import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from '../db';
import { requireSuperAdmin } from '../middleware/authMiddleware';
import { publicUser } from '../security';
const router = Router();
router.use(requireSuperAdmin);
router.get('/', async (req, res) => {
  try {
    const r = await db.query(`SELECT u.*, (SELECT COUNT(*)::int FROM tickets t WHERE t.seller_admin_id=u.id AND t.raffle_id=u.assigned_raffle_id AND t.status='valid') AS total_sold FROM users u ORDER BY u.booklet_number`);
    res.json(r.rows.map(u => ({ ...publicUser(u), status: u.status === 'active' ? 'activo' : 'inactivo', totalSold: u.total_sold, assignedRafflesCount: 1 })));
  } catch { res.status(500).json({ error: 'No se pudo cargar administradores.' }); }
});
router.post('/', async (req, res) => {
  try {
    const { name, dni, email, password, assignedQuota, assignedRaffleId } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 128 || typeof dni !== 'string' || !/^\d{8}$/.test(dni.trim()) || (assignedQuota !== undefined && assignedQuota !== 20)) return res.status(400).json({ error: 'Nombre, DNI o cuota inválidos. Cada talonario tiene 20 números.' });
    const mail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : 'admin.'+dni.trim()+'@rifas.pe';
    const pass = password || dni.trim();
    if (typeof pass !== 'string' || pass.trim().length < 6 || Buffer.byteLength(pass)>72) return res.status(400).json({ error: 'Contraseña inválida.' });
    if (assignedRaffleId && !(await db.query('SELECT id FROM raffles WHERE id=$1',[assignedRaffleId])).rowCount) return res.status(400).json({error:'Rifa no encontrada.'});
    const r = await db.query(`WITH created AS (
      INSERT INTO users (id, full_name, dni, email, password_hash, phone, role, status, quota, must_change_password, assigned_raffle_id)
      VALUES ($1,$2,$3,$4,$5,'','admin','active',20,true,$6) RETURNING *
    ), resized AS (
      UPDATE raffles SET total_tickets = GREATEST(total_tickets, (SELECT booklet_number * 20 FROM created))
      WHERE id = $6 RETURNING id
    ) SELECT * FROM created`, [crypto.randomUUID(),name.trim().toUpperCase(),dni.trim(),mail,await bcrypt.hash(pass,12),assignedRaffleId || 'rf-024']);
    res.status(201).json({ ...publicUser(r.rows[0]), totalSold:0, assignedRafflesCount:1, status:'activo' });
  } catch (e: any) { res.status(e.code==='23505'?409:500).json({ error: e.code==='23505'?'DNI o correo ya registrado.':'No se pudo crear el administrador.' }); }
});
router.put('/:id', async (req,res) => {
  try {
    const { name, dni, email, status, password, assignedQuota, assignedRaffleId } = req.body;
    if ((assignedQuota !== undefined && assignedQuota !== 20) || (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length>128)) || (dni !== undefined && (typeof dni !== 'string' || !/^\d{8}$/.test(dni))) || (email !== undefined && (typeof email !== 'string' || !email.includes('@') || email.length>128)) || (status !== undefined && !['activo','inactivo'].includes(status))) return res.status(400).json({ error: 'Datos inválidos. La cuota fija del talonario es 20.' });
    if (password && (typeof password !== 'string' || password.length<6 || Buffer.byteLength(password)>72)) return res.status(400).json({ error: 'Contraseña inválida.' });
    if (assignedRaffleId && !(await db.query('SELECT id FROM raffles WHERE id=$1',[assignedRaffleId])).rowCount) return res.status(400).json({error:'Rifa no encontrada.'});
    const hash = password ? await bcrypt.hash(password,12) : null;
    const r = await db.query(`UPDATE users SET assigned_raffle_id=COALESCE($7,assigned_raffle_id),full_name=COALESCE($1,full_name), dni=COALESCE($2,dni), email=COALESCE($3,email), status=COALESCE($4,status), password_hash=COALESCE($5,password_hash), must_change_password=CASE WHEN $5::text IS NULL THEN must_change_password ELSE true END
      WHERE id=$6 AND role='admin' RETURNING id`,[name?.trim().toUpperCase(),dni,email?.trim().toLowerCase(),status===undefined?null:status==='activo'?'active':'inactive',hash,req.params.id,assignedRaffleId]);
    if (!r.rowCount) return res.status(404).json({ error:'Administrador no encontrado.' });
    res.json({success:true});
  } catch(e:any) { res.status(e.code==='23505'?409:500).json({error:e.code==='23505'?'DNI o correo ya registrado.':'No se pudo actualizar el administrador.'}); }
});
// Preserve ownership/history: "delete" disables an operator instead of losing tickets.
router.delete('/:id',async(req,res)=>{
  try { const r=await db.query("UPDATE users SET status='inactive' WHERE id=$1 AND role='admin' RETURNING id",[req.params.id]); if(!r.rowCount)return res.status(404).json({error:'Administrador no encontrado.'}); res.json({success:true,message:'Administrador desactivado. Historial conservado.'}); }
  catch{res.status(500).json({error:'No se pudo desactivar.'});}
});
export default router;
