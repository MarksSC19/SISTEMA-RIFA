import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { AuthRequest, requireSignedIn } from '../middleware/authMiddleware';
import { issueToken, publicUser } from '../security';
const router = Router();
const attempts=new Map<string,{count:number;until:number}>();
router.use('/login',(req,res,next)=>{
  const key=(req.ip || '')+'|'+String(req.body.identifier || req.body.email || '').toLowerCase();
  const now=Date.now();
  for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
  const v=attempts.get(key)||{count:0,until:now+600000};
  if(v.count>=20){res.setHeader('Retry-After',Math.ceil((v.until-now)/1000));return res.status(429).json({error:'Demasiados intentos. Espere unos minutos.'});}
  if(attempts.size>10000)return res.status(503).json({error:'Intente nuevamente más tarde.'});
  v.count++;attempts.set(key,v);next();
});
router.post('/login', async (req, res) => {
  const identifier = req.body.identifier ?? req.body.email;
  const password = req.body.password;
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) return res.status(400).json({ error: 'DNI o correo y contraseña requeridos.' });
  try {
    const result = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER($1) OR TRIM(dni) = $1', [identifier.trim()]);
    const u = result.rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Credenciales inválidas.' });
    if (u.status !== 'active') return res.status(403).json({ error: 'Usuario inactivo.' });
    res.json({ token: issueToken(u), user: publicUser(u) });
  } catch { res.status(500).json({ error: 'No se pudo iniciar sesión.' }); }
});
router.get('/me', requireSignedIn, async (req: AuthRequest, res) => {
  try { const r = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]); res.json({ user: publicUser(r.rows[0]) }); }
  catch { res.status(503).json({ error: 'No se pudo cargar el usuario.' }); }
});
async function updateAccount(req: AuthRequest, res: Response, profile: boolean) {
  try {
    const { currentPassword, newPassword, name, email, phone } = req.body;
    const r = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
    const u = r.rows[0];
    const changing = !profile || (newPassword !== undefined && newPassword !== '');
    if (profile && (typeof name !== 'string' || !name.trim() || name.length > 128 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 128 || (phone !== undefined && (typeof phone !== 'string' || phone.length > 32)))) return res.status(400).json({ error: 'Nombre, correo o teléfono inválidos.' });
    if (u.must_change_password && !changing) return res.status(403).json({ error: 'Debe cambiar su contraseña temporal.' });
    let hash = u.password_hash;
    if (changing) {
      if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6 || Buffer.byteLength(newPassword) > 72) return res.status(400).json({ error: 'Ingrese la contraseña actual y una nueva clave de al menos 6 caracteres (máximo 72 bytes).' });
      if (!(await bcrypt.compare(currentPassword, u.password_hash))) return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
      if (newPassword === currentPassword || newPassword.trim() === u.dni) return res.status(400).json({ error: 'La nueva clave debe ser diferente de la actual y de su DNI.' });
      hash = await bcrypt.hash(newPassword, 12);
    }
    const updated = await db.query('UPDATE users SET full_name = $1, email = $2, phone = $3, password_hash = $4, must_change_password = $5 WHERE id = $6 AND password_hash = $7 RETURNING *',
      [profile ? name.trim() : u.full_name, profile ? email.trim().toLowerCase() : u.email, profile ? (phone ?? '').trim() : u.phone, hash, changing ? false : u.must_change_password, u.id, u.password_hash]);
    if (!updated.rowCount) return res.status(409).json({ error: 'La cuenta cambió. Inicie sesión nuevamente.' });
    res.json({ success: true, token: issueToken(updated.rows[0]), user: publicUser(updated.rows[0]) });
  } catch (e: any) { res.status(e.code === '23505' ? 409 : 500).json({ error: e.code === '23505' ? 'El correo ya está registrado.' : 'No se pudo actualizar la cuenta.' }); }
}
router.post('/change-password', requireSignedIn, (req: AuthRequest, res) => updateAccount(req, res, false));
router.put('/profile', requireSignedIn, (req: AuthRequest, res) => updateAccount(req, res, true));
export default router;
