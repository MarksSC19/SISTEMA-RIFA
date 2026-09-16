import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_jwt_key_rifas_2026';

// Helper for avatar initials
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const identifier = req.body.identifier || req.body.email;
    const password = req.body.password;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identificador (email o DNI) y contraseña requeridos.' });
    }

    const result = await db.query(
      'SELECT id, email, password_hash, full_name, dni, phone, role, status, quota, must_change_password FROM users WHERE LOWER(email) = LOWER($1) OR dni = $1',
      [identifier.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Usuario no registrado.' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Usuario inactivo. Contacte al Superadministrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        dni: user.dni,
        phone: user.phone,
        role: user.role,
        assignedQuota: user.quota,
        avatarInitials: getInitials(user.full_name),
        assignedRaffleId: 'rf-024',
        mustChangePassword: Boolean(user.must_change_password),
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor durante el inicio de sesión.' });
  }
});

// POST /api/auth/change-password - Cambio obligatorio de contraseña
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, dni } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch {
        // Token inválido o expirado, recurrir a búsqueda por DNI
      }
    }

    let userRes;
    if (userId) {
      userRes = await db.query(
        'SELECT id, email, full_name, dni, phone, role, password_hash, must_change_password FROM users WHERE id = $1',
        [userId]
      );
    } else if (dni) {
      userRes = await db.query(
        'SELECT id, email, full_name, dni, phone, role, password_hash, must_change_password FROM users WHERE dni = $1',
        [dni.trim()]
      );
    } else {
      return res.status(400).json({ error: 'Debe proporcionar su DNI o iniciar sesión.' });
    }

    if (!userRes || userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos.' });
    }

    const user = userRes.rows[0];

    // Validación segura: aceptar hash actual o validar contra su DNI si es primer ingreso
    const isHashMatch = await bcrypt.compare(currentPassword, user.password_hash);
    const isDniMatch = Boolean(user.must_change_password) && currentPassword.trim() === user.dni;

    if (!isHashMatch && !isDniMatch) {
      return res.status(400).json({ error: 'La contraseña actual (su DNI) es incorrecta.' });
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 10);
    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [newHash, user.id]
    );

    // Generar nuevo token JWT con estado actualizado
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.',
      token: newToken,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        dni: user.dni,
        phone: user.phone,
        role: user.role,
        assignedQuota: 20,
        avatarInitials: getInitials(user.full_name),
        assignedRaffleId: 'rf-024',
        mustChangePassword: false,
      },
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      'SELECT id, email, full_name, dni, phone, role, status, quota, must_change_password FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        dni: user.dni,
        phone: user.phone,
        role: user.role,
        assignedQuota: user.quota,
        avatarInitials: getInitials(user.full_name),
        assignedRaffleId: 'rf-024',
        mustChangePassword: Boolean(user.must_change_password),
      },
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// PUT /api/auth/profile - Actualizar perfil y/o contraseña de usuario autenticado
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const { name, email, phone, currentPassword, newPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y correo electrónico son requeridos.' });
    }

    // Verificar si el usuario desea cambiar su contraseña
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Debe ingresar su contraseña actual para establecer una nueva clave.' });
      }
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }

      const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
      }

      const newHash = await bcrypt.hash(newPassword.trim(), 10);
      await db.query(
        'UPDATE users SET full_name = $1, email = $2, phone = $3, password_hash = $4, must_change_password = false WHERE id = $5',
        [name.trim(), email.trim(), phone?.trim() || '', newHash, decoded.id]
      );
    } else {
      await db.query(
        'UPDATE users SET full_name = $1, email = $2, phone = $3 WHERE id = $4',
        [name.trim(), email.trim(), phone?.trim() || '', decoded.id]
      );
    }

    const updatedUserRes = await db.query(
      'SELECT id, email, full_name, dni, phone, role, quota, must_change_password FROM users WHERE id = $1',
      [decoded.id]
    );
    const u = updatedUserRes.rows[0];

    res.json({
      success: true,
      message: 'Perfil y credenciales actualizados exitosamente.',
      user: {
        id: u.id,
        name: u.full_name,
        email: u.email,
        dni: u.dni,
        phone: u.phone,
        role: u.role,
        assignedQuota: u.quota,
        avatarInitials: getInitials(u.full_name),
        assignedRaffleId: 'rf-024',
        mustChangePassword: Boolean(u.must_change_password),
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error interno al actualizar el perfil.' });
  }
});

export default router;
