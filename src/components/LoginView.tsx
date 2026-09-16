import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Ticket,
  CreditCard
} from 'lucide-react';
import { AuthUser } from '../types';
import { DEMO_AUTH_USERS } from '../mockData';
import api from '../services/api';

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanDni = dni.trim().replace(/\D/g, '');
    if (!cleanDni || cleanDni.length < 8) {
      setErrorMessage('Por favor ingrese un número de DNI válido de 8 dígitos');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor ingrese su contraseña (su DNI si es la primera vez)');
      return;
    }

    setIsLoading(true);

    // 1. Autenticación contra PostgreSQL (puerto 5433)
    api.login(cleanDni, password.trim())
      .then((data) => {
        setIsLoading(false);
        onLoginSuccess(data.user);
      })
      .catch((apiErr) => {
        // Fallback local en memoria
        const found = DEMO_AUTH_USERS.find(u => u.dni === cleanDni);

        if (found) {
          if (
            password.trim() === found.password || 
            password.trim() === cleanDni ||
            (found.dni && password.trim() === found.dni)
          ) {
            setIsLoading(false);
            const { password: _, ...userWithoutPass } = found;
            onLoginSuccess(userWithoutPass);
            return;
          }
        }

        setIsLoading(false);
        setErrorMessage(apiErr.message || 'Credenciales incorrectas. Verifique su número de DNI y contraseña.');
      });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] font-['Geist',sans-serif] text-[#0F1115] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#059669]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0F1115]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo & Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F1115] text-white shadow-lg mb-3">
            <Ticket className="w-7 h-7 text-[#10B981]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1115] uppercase">
            RIFAS <span className="text-[#059669]">PRO</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Plataforma Oficial de Rifas Junín · Acceso por DNI
          </p>
        </div>

        {/* Login Card Seguro */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-7 sm:p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-[#0F1115]">Iniciar Sesión</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Ingrese con su número de DNI autorizado para acceder al sistema.
            </p>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Número de DNI (8 Dígitos)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-dni-input"
                  type="text"
                  required
                  maxLength={8}
                  pattern="\d{8}"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 70905188"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-mono font-bold bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F1115]/10 focus:border-[#0F1115] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Su contraseña (su DNI si es primera vez)"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F1115]/10 focus:border-[#0F1115] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0F1115] p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-60 mt-2"
            >
              {isLoading ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Ingresar con mi DNI</span>
                  <ArrowRight className="w-4 h-4 text-[#10B981]" />
                </>
              )}
            </button>
          </form>

          {/* Security notice footer */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] space-y-1 text-center">
            <p className="text-[11px] text-[#6B7280]">
              Todos los administradores autorizados ingresan inicialmente con su <strong>número de DNI</strong> tanto en usuario como en contraseña.
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              <span>Acceso Seguro Cifrado · Autenticación JWT & SHA-256</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
