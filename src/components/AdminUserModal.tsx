import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Users, Mail, Lock, Check, Shield, Tag, Target } from 'lucide-react';
import { AdminUser, Raffle } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminToEdit?: AdminUser | null;
  raffles: Raffle[];
  onSaveAdmin: (admin: AdminUser, password?: string) => void;
}

export const AdminUserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  adminToEdit,
  raffles,
  onSaveAdmin,
}) => {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignedRaffleId, setAssignedRaffleId] = useState('');
  const [assignedQuota, setAssignedQuota] = useState('20');
  const [status, setStatus] = useState<'activo' | 'inactivo'>('activo');
  const [error, setError] = useState('');

  useEffect(() => {
    if (adminToEdit) {
      setName(adminToEdit.name);
      setDni(adminToEdit.dni || '');
      setEmail(adminToEdit.email);
      setPassword(adminToEdit.password || '');
      setAssignedRaffleId(adminToEdit.assignedRaffleId || (raffles[0]?.id ?? ''));
      setAssignedQuota(String(adminToEdit.assignedQuota || 20));
      setStatus(adminToEdit.status);
    } else {
      setName('');
      setDni('');
      setEmail('');
      setPassword('password123');
      setAssignedRaffleId(raffles[0]?.id ?? '');
      setAssignedQuota('20');
      setStatus('activo');
    }
    setError('');
  }, [adminToEdit, isOpen, raffles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del administrador es obligatorio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Ingrese un correo electrónico válido.');
      return;
    }
    if (!adminToEdit && !password.trim()) {
      setError('Defina una contraseña para el nuevo administrador.');
      return;
    }

    const quotaNum = parseInt(assignedQuota, 10);
    if (isNaN(quotaNum) || quotaNum <= 0) {
      setError('La cuota asignada de tickets debe ser un número entero mayor a 0 (ej: 20).');
      return;
    }

    const initials = name
      .trim()
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AD';

    const savedAdmin: AdminUser = {
      id: adminToEdit ? adminToEdit.id : `adm-${Date.now().toString(36)}`,
      name: name.trim(),
      dni: dni.trim() || undefined,
      email: email.trim().toLowerCase(),
      password: password.trim() || undefined,
      assignedRafflesCount: adminToEdit ? adminToEdit.assignedRafflesCount : 1,
      totalSold: adminToEdit ? adminToEdit.totalSold : 0,
      assignedQuota: quotaNum,
      status,
      avatarInitials: initials,
      assignedRaffleId,
    };

    onSaveAdmin(savedAdmin, password.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/60 backdrop-blur-xs font-['Geist',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F1115] text-[#10B981] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1115]">
                {adminToEdit ? 'Editar Administrador' : 'Nuevo Administrador'}
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Control de accesos, cuota de ventas asignada y credenciales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Nombre y DNI */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pedro Gómez Alvarado"
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] font-medium focus:outline-none focus:border-[#0F1115]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                DNI
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="8 dígitos"
                maxLength={12}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] font-mono focus:outline-none focus:border-[#0F1115]"
              />
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Correo Electrónico (Para Login) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pedro.g@rifas.pe"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Contraseña de Acceso *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={adminToEdit ? 'Dejar en blanco para mantener la actual' : '••••••••'}
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">
              {adminToEdit ? 'Modifique este campo para actualizar su contraseña.' : 'Contraseña sugerida: password123'}
            </p>
          </div>

          {/* Cuota de Venta Asignada por Superadmin (ej: 20 tickets) */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#059669]" />
              <span>Cuota / Meta de Tickets Asignada por Superadmin *</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={assignedQuota}
                onChange={(e) => setAssignedQuota(e.target.value)}
                min="1"
                placeholder="20"
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono font-bold text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">
              Cantidad de tickets que debe vender este administrador (ej: 20). Se mostrará su barra de progreso.
            </p>
          </div>

          {/* Rifa Asignada y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Rifa Principal
              </label>
              <select
                value={assignedRaffleId}
                onChange={(e) => setAssignedRaffleId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] cursor-pointer"
              >
                {raffles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Estado Operativo
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'activo' | 'inactivo')}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] cursor-pointer"
              >
                <option value="activo">● Activo (Habilitado)</option>
                <option value="inactivo">● Inactivo (Bloqueado)</option>
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="save-admin-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{adminToEdit ? 'Actualizar Admin' : 'Crear Admin'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
