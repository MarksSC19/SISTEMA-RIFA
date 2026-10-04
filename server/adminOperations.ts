import crypto from 'node:crypto';
import db from './db';
import { AuthRequest } from './middleware/authMiddleware';
export class OperationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function writeAudit(client: any, req: AuthRequest, action: string, target: string, details: unknown) {
  await client.query('LOCK TABLE audit_logs IN EXCLUSIVE MODE');
  const previous = await client.query('SELECT hash_signature FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 1');
  const previousHash = previous.rows[0]?.hash_signature || 'GENESIS';
  const id = crypto.randomUUID(); const actor = req.user?.name || 'MIGRACION'; const payload = JSON.stringify(details);
  const signature = crypto.createHash('sha256').update(JSON.stringify({id,action,actor,target,payload,previousHash})).digest('hex');
  await client.query('INSERT INTO audit_logs(id,action,performed_by,target,details,hash_signature,previous_hash) VALUES($1,$2,$3,$4,$5,$6,$7)', [id,action,actor,target,payload,signature,previousHash]);
}
export async function adminOperation(req: AuthRequest, res: any, work: (client: any) => Promise<unknown>, status = 200) {
  let client: any;
  try {
    client = await db.getClient(); await client.query('BEGIN');
    const result = await work(client); await client.query('COMMIT'); res.status(status).json(result);
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    const code = error instanceof OperationError ? error.status : ['23505','23503'].includes(error.code) ? 409 : 500;
    res.status(code).json({error: error instanceof OperationError ? error.message : code === 409 ? 'Datos duplicados o referencias inválidas.' : 'No se pudo guardar la operación.'});
  } finally { client?.release(); }
}
