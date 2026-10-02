import 'dotenv/config';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET es obligatorio en producción.'); })() : crypto.randomBytes(48).toString('hex'));
export const credentialVersion = (hash: string) => crypto.createHash('sha256').update(hash).digest('hex');
export function issueToken(user: any) {
  return jwt.sign({ id: user.id, credentialVersion: credentialVersion(user.password_hash) }, JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
}
export function publicUser(u: any) {
  return { id: u.id, name: u.full_name, email: u.email, dni: u.dni, phone: u.phone, role: u.role,
    assignedQuota: u.quota, bookletNumber: u.booklet_number, assignedRaffleId: u.assigned_raffle_id || 'rf-024',
    avatarInitials: u.full_name.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(), mustChangePassword: Boolean(u.must_change_password) };
}
