import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldAlert, KeyRound, Check, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { AuthUser } from '../types';

interface Props {
  isOpen: boolean;
  currentUser: AuthUser;
  onPasswordChanged: (updatedUser: AuthUser) => void;
  onLogout?: () => void;
}

export const MustChangePasswordModal: React.FC<Props> = ({
  isOpen,
  currentUser,
  onPasswordChanged,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState(currentUser.dni || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword.trim()) {
      setErrorMsg('Debe ingresar su contraseña actual (su número de DNI).');
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword.trim() === currentUser.dni) {
      setErrorMsg('La nueva contraseña no puede ser igual a su número de DNI.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Verifique e intente nuevamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.changePassword(currentPassword.trim(), newPassword.trim(), currentUser.dni);
      if (response && response.token) {
        localStorage.setItem('rifas_jwt_token', response.token);
      }
      const updated: AuthUser = (response && response.user) ? response.user : {
        ...currentUser,
        mustChangePassword: false,
      };
      try {
        localStorage.setItem('rifas_auth_user', JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      onPasswordChanged(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar contraseña. Verifique que su contraseña actual coincida.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F1115] to-[#1F2937] text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/20">
                  Seguridad Obligatoria · Primer Ingreso
                </span>
                <h2 className="text-lg font-bold tracking-tight text-white mt-1">
                  Actualice su Contraseña
                </h2>
              </div>
            </div>
            <p className="text-xs text-gray-300 mt-2.5 leading-relaxed">
              Hola <strong>{currentUser.name}</strong>. Por política de seguridad institucional, su contraseña temporal (su número de DNI) debe ser sustituida por una clave personal para habilitar su panel de ventas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current password (DNI) */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Contraseña Temporal Actual (Número de DNI)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su DNI actual"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F1115] transition-all"
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Su contraseña por defecto es su DNI: <span className="font-mono font-medium text-gray-600">{currentUser.dni}</span>
              </span>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Nueva Contraseña Personal (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F1115] transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors cursor-pointer"
                  title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Check className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F1115] transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors cursor-pointer"
                  title={showConfirmPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#0F1115] hover:bg-black text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Guardando nueva contraseña...</span>
                ) : (
                  <>
                    <span>Establecer Clave y Acceder al Panel</span>
                    <ArrowRight className="w-4 h-4 text-[#10B981]" />
                  </>
                )}
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('rifas_auth_user');
                      localStorage.removeItem('rifas_jwt_token');
                    } catch { }
                    onLogout();
                  }}
                  className="w-full mt-2 py-2 text-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Cancelar y Volver al Login
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
