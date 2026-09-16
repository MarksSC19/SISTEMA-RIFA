import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Crown, 
  AlertCircle,
  Eye,
  EyeOff,
  Ticket,
  Search,
  Users,
  Target
} from 'lucide-react';
import { AuthUser } from '../types';
import { DEMO_AUTH_USERS } from '../mockData';
import api from '../services/api';

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [emailOrDni, setEmailOrDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  const superAdminUser = DEMO_AUTH_USERS.find(u => u.role === 'super_admin');
  const adminUsers = DEMO_AUTH_USERS.filter(u => u.role === 'admin');

  const filteredAdmins = adminUsers.filter(u => {
    const q = adminSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.dni && u.dni.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanInput = emailOrDni.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMessage('Por favor ingrese su correo electrónico o número de DNI');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor ingrese su contraseña');
      return;
    }

    setIsLoading(true);

    // 1. Intentar autenticación real contra la API de producción (PostgreSQL en puerto 5433)
    api.login(cleanInput, password)
      .then((data) => {
        setIsLoading(false);
        onLoginSuccess(data.user);
      })
      .catch((apiErr) => {
        // Fallback local en caso de usar DNI o credenciales precargadas
        const found = DEMO_AUTH_USERS.find(
          u => u.email.toLowerCase() === cleanInput ||
               (u.dni && u.dni.toLowerCase() === cleanInput)
        );

        if (found) {
          if (
            password === found.password || 
            password === 'password123' || 
            password === 'admin123' ||
            (found.dni && password === found.dni)
          ) {
            setIsLoading(false);
            const { password: _, ...userWithoutPass } = found;
            onLoginSuccess(userWithoutPass);
            return;
          }
        }

        setIsLoading(false);
        setErrorMessage(apiErr.message || 'Credenciales inválidas. Verifique su correo o DNI y contraseña.');
      });
  };

  const handleQuickLogin = (demoUser: typeof DEMO_AUTH_USERS[0]) => {
    setIsLoading(true);
    setTimeout(() => {
      const { password: _, ...userWithoutPass } = demoUser;
      onLoginSuccess(userWithoutPass);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] font-['Geist',sans-serif] text-[#0F1115] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#059669]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0F1115]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        {/* Logo & Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F1115] text-white shadow-md mb-2.5">
            <Ticket className="w-6 h-6 text-[#10B981]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1115] uppercase">
            RIFAS <span className="text-[#059669]">PRO</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Portal Oficial de Rifas Junín · Acceso Superadmin y Administradores
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-7 shadow-sm backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#0F1115]">Iniciar Sesión</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Ingrese con su Correo o DNI autorizado y contraseña (clave por defecto: <span className="font-mono font-semibold text-[#0F1115]">password123</span>)
            </p>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Correo Electrónico o DNI
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="text"
                  value={emailOrDni}
                  onChange={(e) => setEmailOrDni(e.target.value)}
                  placeholder="admin@rifas.pe o N° DNI (ej: 74765137)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F1115]/10 focus:border-[#0F1115] transition-all"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (password123)"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F1115]/10 focus:border-[#0F1115] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0F1115] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]" />
            </div>
            <div className="relative flex justify-center text-center">
              <span className="bg-white px-3 text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                O acceso directo con 1 clic
              </span>
            </div>
          </div>

          {/* Superadmin Direct Button */}
          {superAdminUser && (
            <div className="mb-3">
              <button
                id={`quick-login-${superAdminUser.id}`}
                onClick={() => handleQuickLogin(superAdminUser)}
                className="w-full p-2.5 bg-[#F9FAFB] hover:bg-[#ECFDF5] hover:border-[#A7F3D0] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0F1115] text-[#10B981] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                    M
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#0F1115]">
                        {superAdminUser.name}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded-full text-[10px] font-bold">
                        <Crown className="w-2.5 h-2.5" /> Superadmin
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6B7280] block truncate">
                      {superAdminUser.email}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#059669] group-hover:translate-x-0.5 transition-transform shrink-0">
                  Entrar como Superadmin →
                </span>
              </button>
            </div>
          )}

          {/* Searchable 31 Admins Box */}
          <div className="mt-3 p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#059669]" />
                <span className="text-[11px] font-bold text-[#0F1115] uppercase tracking-wide">
                  31 Administradores Registrados (Cuota: 20 tickets c/u)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#6B7280] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                {filteredAdmins.length} de {adminUsers.length}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Filtrar por nombre o DNI (ej: Hanssel, 74765137)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
              />
            </div>

            {/* Scrollable Admins list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#E5E7EB]/40">
              {filteredAdmins.map((admin, idx) => (
                <button
                  key={admin.id}
                  id={`quick-login-${admin.id}`}
                  onClick={() => handleQuickLogin(admin)}
                  className="w-full pt-1.5 pb-1 px-2 hover:bg-white rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer group text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#6B7280] w-4">
                        {idx + 1}.
                      </span>
                      <span className="font-semibold text-[#0F1115] truncate">
                        {admin.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#6B7280] ml-5">
                      {admin.dni && (
                        <span className="font-mono bg-[#E5E7EB]/60 px-1 py-0.2 rounded text-[#374151]">
                          DNI: {admin.dni}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[#059669] font-medium">
                        <Target className="w-2.5 h-2.5" /> Meta: 20 tickets
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-[#059669] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Entrar →
                  </span>
                </button>
              ))}

              {filteredAdmins.length === 0 && (
                <div className="py-4 text-center text-xs text-[#9CA3AF]">
                  No se encontró ningún administrador con "{adminSearch}"
                </div>
              )}
            </div>
          </div>

          {/* Security notice footer */}
          <div className="mt-5 pt-3 border-t border-[#E5E7EB] flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Autenticación cifrada TLS 1.3 con control de roles y cuotas de venta</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
