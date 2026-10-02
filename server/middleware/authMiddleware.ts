import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';
import { JWT_SECRET, credentialVersion } from '../security';
export interface AuthRequest extends Request { user?: { id: string; email: string; role: 'super_admin' | 'admin'; name: string; mustChangePassword: boolean }; }
export async function requireSignedIn(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Inicie sesión.' });
  let decoded: any;
  try { decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'Sesión inválida o expirada.' }); }
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const u = result.rows[0];
    if (!u || u.status !== 'active' || decoded.credentialVersion !== credentialVersion(u.password_hash)) return res.status(401).json({ error: 'Sesión revocada. Inicie sesión nuevamente.' });
    req.user = { id: u.id, email: u.email, role: u.role, name: u.full_name, mustChangePassword: u.must_change_password };
    next();
  } catch { res.status(503).json({ error: 'No se pudo validar la sesión.' }); }
}
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  return requireSignedIn(req, res, () => {
    if (req.user?.mustChangePassword) return res.status(403).json({ error: 'Cambie su contraseña temporal antes de operar.' });
    next();
  });
}
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Requiere Superadministrador.' });
    next();
  });
}
