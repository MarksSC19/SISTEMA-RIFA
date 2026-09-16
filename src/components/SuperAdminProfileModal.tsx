import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Phone, Lock, Check, AlertCircle, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';
import { AuthUser } from '../types';
import api from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onProfileUpdated?: (updatedUser: AuthUser) => void;
}

export const SuperAdminProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(currentUser?.name || 'JHEYSON RYAM JORGE VASQUEZ');
  const [email, setEmail] = useState(currentUser?.email || 'jheyson.jorge@rifas.pe');
  const [phone, setPhone] = useState(currentUser?.phone || '987654321');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Nombre y correo electrónico son requeridos.');
      return;
    }

    if (newPassword.trim()) {
      if (!currentPassword) {
        setErrorMessage('Debe ingresar su contraseña actual para confirmar el cambio.');
        return;
      }
      if (newPassword.trim().length < 6) {
        setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('La confirmación de la nueva contraseña no coincide.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dni: currentUser?.dni || '70905188',
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });

      setSuccessMessage('¡Perfil y credenciales actualizados exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (res.token) {
        localStorage.setItem('rifas_jwt_token', res.token);
      }
      if (res.user) {
        try {
          localStorage.setItem('rifas_auth_user', JSON.stringify(res.user));
        } catch {}
        if (onProfileUpdated) {
          onProfileUpdated(res.user);
        }
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Error al actualizar el perfil. Verifique su contraseña actual.');
    }
  };

  return (
    <div id="superadmin-profile-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/60 backdrop-blur-xs font-['Geist',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F1115] text-[#10B981] flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1115] uppercase tracking-wide">
                Perfil de Superadministrador
              </h3>
              <p className="text-[11px] text-[#6B7280]">Gestión de cuenta y credenciales maestras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Datos Personales */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
              1. Información Personal
            </span>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F1115]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F1115]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Celular / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F1115]"
                  />
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <span className="text-[#6B7280]">Documento de Identidad (DNI):</span>
              <span className="font-mono font-bold text-[#0F1115]">{currentUser?.dni || '70905188'}</span>
            </div>
          </div>

          {/* Cambio de Contraseña */}
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
              2. Actualizar Contraseña (Opcional)
            </span>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese contraseña actual si desea cambiarla"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F1115]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F1115]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Confirmar Nueva Clave
                </label>
                <div className="relative">
                  <Check className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita nueva clave"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F1115]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#374151] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
