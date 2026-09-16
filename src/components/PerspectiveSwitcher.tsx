import React from 'react';
import { 
  ShieldAlert, 
  Smartphone, 
  PlusCircle, 
  Sparkles, 
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { PlatformRole, AuthUser } from '../types';

interface Props {
  currentView: PlatformRole;
  currentUser?: AuthUser | null;
  onSelectView: (view: PlatformRole) => void;
  onOpenRegisterTicket: () => void;
  onLogout?: () => void;
  isDrawMode: boolean;
}

export const PerspectiveSwitcher: React.FC<Props> = ({
  currentView,
  currentUser,
  onSelectView,
  onOpenRegisterTicket,
  onLogout,
  isDrawMode,
}) => {
  if (!currentUser) return null;

  // En producción se oculta la barra flotante de depuración para garantizar un diseño profesional
  const isDevMode = Boolean((import.meta as any).env?.DEV) || (typeof window !== 'undefined' && (
    window.location.search.includes('dev=true') || 
    localStorage.getItem('rifas_show_dev_bar') === 'true'
  ));

  if (!isDevMode) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 bg-[#0F1115]/90 backdrop-blur-md text-white rounded-full border border-white/10 shadow-2xl transition-all duration-200 text-xs ${isDrawMode ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}>
      {isSuperAdmin && (
        <button
          id="switch-view-superadmin"
          onClick={() => onSelectView('super_admin')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            currentView === 'super_admin'
              ? 'bg-white text-[#0F1115] shadow-xs'
              : 'text-[#9CA3AF] hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="hidden sm:inline">1. Super Admin</span>
          <span className="sm:hidden">Super</span>
        </button>
      )}

      <button
        id="switch-view-admin"
        onClick={() => onSelectView('admin')}
        className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
          currentView === 'admin'
            ? 'bg-white text-[#0F1115] shadow-xs'
            : 'text-[#9CA3AF] hover:text-white'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">2. Panel Admin</span>
        <span className="sm:hidden">Admin</span>
      </button>

      <button
        id="switch-view-register"
        onClick={onOpenRegisterTicket}
        className="px-3 py-1.5 rounded-full font-medium text-[#10B981] hover:bg-[#059669]/20 transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">3. Nuevo Ticket</span>
        <span className="sm:hidden">+ Ticket</span>
      </button>

      <button
        id="switch-view-draw"
        onClick={() => onSelectView('live_draw')}
        className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
          currentView === 'live_draw'
            ? 'bg-[#059669] text-white shadow-xs'
            : 'text-[#9CA3AF] hover:text-white'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">4. Sorteo en Vivo</span>
        <span className="sm:hidden">Sorteo</span>
      </button>

      <button
        id="switch-view-verify"
        onClick={() => onSelectView('verification')}
        className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
          currentView === 'verification'
            ? 'bg-white text-[#0F1115] shadow-xs'
            : 'text-[#9CA3AF] hover:text-white'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">5. Verificación</span>
        <span className="sm:hidden">Verificar</span>
      </button>

      {onLogout && (
        <button
          id="switch-view-logout"
          onClick={onLogout}
          className="p-1.5 text-[#9CA3AF] hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors cursor-pointer ml-0.5"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
