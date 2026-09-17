import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  ChevronDown, 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  Users, 
  Dices, 
  ShieldCheck, 
  Settings, 
  ArrowUpRight,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Check,
  Trophy,
  LogOut,
  Edit2,
  Trash2,
  Gift,
  Sparkles,
  Filter,
  Save,
  Building2,
  Phone,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  ArrowUpDown,
  User,
  RotateCcw
} from 'lucide-react';
import { Raffle, AdminUser, AuditLog, Ticket, Prize, AuthUser, SystemConfig } from '../types';
import { PrizeManagementModal } from './PrizeManagementModal';
import { RaffleModal } from './RaffleModal';
import { AdminUserModal } from './AdminUserModal';
import { SuperAdminProfileModal } from './SuperAdminProfileModal';
import { TicketEditModal } from './TicketEditModal';

interface Props {
  raffles: Raffle[];
  admins: AdminUser[];
  auditLogs: AuditLog[];
  prizes: Prize[];
  tickets?: Ticket[];
  onVerifyTicket?: (ticket: Ticket) => void;
  currentUser?: AuthUser | null;
  config?: SystemConfig;
  onSelectRaffleForAdmin: (raffleId: string) => void;
  onSelectRaffleForDraw: (raffleId: string, prizeId?: string) => void;
  onSavePrize: (prize: Prize) => void;
  onDeletePrize: (prizeId: string) => void;
  onSaveRaffle: (raffle: Raffle) => void;
  onDeleteRaffle: (raffleId: string) => void;
  onSaveAdmin: (admin: AdminUser, password?: string, isNew?: boolean) => void;
  onDeleteAdmin?: (adminId: string) => void;
  onSaveConfig?: (config: SystemConfig) => void;
  onOpenRegisterTicket?: () => void;
  onSwitchToSalesPanel?: () => void;
  personalSold?: number;
  personalQuota?: number;
  onUpdateCurrentUser?: (user: AuthUser) => void;
  onUpdateTicket?: (ticket: Ticket) => Promise<void> | void;
  onResetPrizes?: (raffleId: string) => void;
  onLogout?: () => void;
}

type TabType = 'overview' | 'admins' | 'premios' | 'sorteos' | 'auditoria' | 'config';

export const SuperAdminView: React.FC<Props> = ({
  raffles,
  admins,
  auditLogs,
  prizes,
  tickets = [],
  onVerifyTicket,
  currentUser,
  config,
  onSelectRaffleForAdmin,
  onSelectRaffleForDraw,
  onSavePrize,
  onDeletePrize,
  onSaveRaffle,
  onDeleteRaffle,
  onSaveAdmin,
  onDeleteAdmin,
  onSaveConfig,
  onOpenRegisterTicket,
  onSwitchToSalesPanel,
  personalSold = 0,
  personalQuota = 20,
  onUpdateCurrentUser,
  onUpdateTicket,
  onResetPrizes,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchRaffle, setSearchRaffle] = useState('');
  const [searchAdmin, setSearchAdmin] = useState('');
  const [selectedRaffleForPrizes, setSelectedRaffleForPrizes] = useState<string>('all');
  const [overviewAdminSearch, setOverviewAdminSearch] = useState('');
  const [overviewAdminSort, setOverviewAdminSort] = useState<'highest' | 'lowest' | 'name'>('highest');
  const [overviewAdminFilter, setOverviewAdminFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketSellerFilter, setTicketSellerFilter] = useState<string>('all');

  // Ticket modal state
  const [isTicketEditModalOpen, setIsTicketEditModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  
  // Prize modal states
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [prizeToEdit, setPrizeToEdit] = useState<Prize | null>(null);

  // Raffle modal states
  const [isRaffleModalOpen, setIsRaffleModalOpen] = useState(false);
  const [raffleToEdit, setRaffleToEdit] = useState<Raffle | null>(null);

  // Admin modal states
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Configuration state
  const [orgName, setOrgName] = useState(config?.organizationName || 'Plataforma Oficial de Rifas Junín');
  const [currSymbol, setCurrSymbol] = useState(config?.currencySymbol || 'S/');
  const [supportPhone, setSupportPhone] = useState(config?.supportPhone || '+51 987 654 321');
  const [receiptMsg, setReceiptMsg] = useState(config?.receiptMessage || '¡Gracias por apoyar nuestra causa! Este comprobante digital certifica su participación válida.');
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Status badge styling helper
  const renderStatusBadge = (status: Raffle['status']) => {
    switch (status) {
      case 'activa':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            Activa
          </span>
        );
      case 'cerrada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            Cerrada
          </span>
        );
      case 'sorteo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Sorteo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F5F5F3] text-[#4B5563]">
            ● {status}
          </span>
        );
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Control Financiero', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'admins', label: '31 Administradores', icon: <Users className="w-4 h-4" /> },
    { id: 'premios', label: '7 Premios Oficiales', icon: <Trophy className="w-4 h-4" /> },
    { id: 'sorteos', label: 'Sorteos & Ganadores', icon: <Dices className="w-4 h-4" /> },
    { id: 'auditoria', label: 'Auditoría', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  // Prize actions
  const handleOpenAddPrize = (raffleId?: string) => {
    if (raffleId && raffleId !== 'all') {
      setSelectedRaffleForPrizes(raffleId);
    }
    setPrizeToEdit(null);
    setIsPrizeModalOpen(true);
  };

  const handleEditPrize = (prize: Prize) => {
    setPrizeToEdit(prize);
    setIsPrizeModalOpen(true);
  };

  // Raffle actions
  const handleOpenAddRaffle = () => {
    setRaffleToEdit(null);
    setIsRaffleModalOpen(true);
  };

  const handleEditRaffle = (raffle: Raffle) => {
    setRaffleToEdit(raffle);
    setIsRaffleModalOpen(true);
  };

  const handleDeleteRaffleClick = (raffle: Raffle) => {
    if (window.confirm(`¿Está seguro de eliminar la rifa "${raffle.code} - ${raffle.title}"? Esta acción no se puede deshacer.`)) {
      onDeleteRaffle(raffle.id);
    }
  };

  // Admin actions
  const handleOpenAddAdmin = () => {
    setAdminToEdit(null);
    setIsAdminModalOpen(true);
  };

  const handleEditAdmin = (admin: AdminUser) => {
    setAdminToEdit(admin);
    setIsAdminModalOpen(true);
  };

  const handleDeleteAdminClick = (admin: AdminUser) => {
    if (window.confirm(`¿Está seguro de eliminar al administrador "${admin.name}" (${admin.email})?`)) {
      onDeleteAdmin(admin.id);
    }
  };

  const handleToggleAdminStatus = (admin: AdminUser) => {
    const nextStatus = admin.status === 'activo' ? 'inactivo' : 'activo';
    onSaveAdmin({ ...admin, status: nextStatus });
  };

  // Config save
  const handleSaveConfigForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveConfig) {
      onSaveConfig({
        organizationName: orgName,
        currencyName: 'Soles',
        currencySymbol: currSymbol,
        supportPhone,
        receiptMessage: receiptMsg,
      });
    }
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2500);
  };

  const filteredPrizes = prizes.filter(p => {
    if (selectedRaffleForPrizes === 'all') return true;
    return p.raffleId === selectedRaffleForPrizes;
  });

  const filteredSalesTickets = (tickets || []).filter(t => {
    const matchesSearch = 
      t.buyerName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.formattedNumber.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.dni.includes(ticketSearch) ||
      (t.verificationCode && t.verificationCode.toLowerCase().includes(ticketSearch.toLowerCase())) ||
      (t.registeredBy && t.registeredBy.toLowerCase().includes(ticketSearch.toLowerCase()));
    const matchesSeller = ticketSellerFilter === 'all' || t.sellerAdminId === ticketSellerFilter || t.registeredBy === ticketSellerFilter;
    return matchesSearch && matchesSeller;
  });

  return (
    <div id="super-admin-layout" className="min-h-screen bg-[#F5F5F3] text-[#0F1115]">
      {/* ─────────────────────────────────────────────────────────────
          TOP BAR: RIFAS         🔔     Marks ▾
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo Oficial" className="w-8 h-8 rounded-lg object-contain border border-gray-200 bg-white p-0.5 shadow-xs" />
            <div>
              <span className="text-sm font-bold tracking-tight text-[#0F1115] block leading-tight">
                Rifa Graduación Administración
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#059669] font-bold">
                Panel Oficial Superadmin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Botón para que el Superadmin (Jheyson) venda sus boletos */}
          {onOpenRegisterTicket && (
            <button
              id="superadmin-sell-tickets-btn"
              onClick={onOpenRegisterTicket}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Vender boletos como operador (Meta: 20 boletos)"
            >
              <TicketIcon className="w-3.5 h-3.5" />
              <span>Vender Mis Boletos ({personalSold}/{personalQuota})</span>
            </button>
          )}

          {onSwitchToSalesPanel && (
            <button
              id="superadmin-switch-sales-btn"
              onClick={onSwitchToSalesPanel}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F3] hover:bg-[#E5E7EB] text-[#374151] hover:text-[#0F1115] text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-[#E5E7EB]"
              title="Ver mi talonario de ventas de operador"
            >
              <span>Mi Panel de Ventas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#059669]" />
            </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              id="superadmin-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-[8px] text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#059669]" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg p-3 z-40 text-xs">
                <div className="font-semibold text-[#0F1115] pb-2 border-b border-[#E5E7EB] flex justify-between items-center">
                  <span>Notificaciones</span>
                  <span className="text-[10px] text-[#059669]">Al día</span>
                </div>
                <div className="py-2 space-y-2">
                  <p className="text-[#374151]">
                    <strong className="text-[#0F1115]">Rifa #024</strong> alcanzó el 62% de tickets vendidos.
                  </p>
                  <p className="text-[#6B7280] text-[10px]">Hace 12 minutos</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile: Marks ▾ */}
          <div className="relative">
            <button
              id="superadmin-profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#0F1115] text-white text-xs font-semibold flex items-center justify-center font-mono">
                {currentUser?.avatarInitials || 'JJ'}
              </div>
              <span className="text-xs font-semibold text-[#0F1115]">
                {currentUser?.name || 'Jheyson Ryam Jorge Vasquez'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg py-1.5 z-40 text-xs">
                <div className="px-3 py-2 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#0F1115]">{currentUser?.name || 'Jheyson Ryam Jorge Vasquez'}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{currentUser?.email || 'jheyson.jorge@rifas.pe'}</p>
                </div>
                <div className="py-1">
                  <div className="px-3 py-1 text-[#4B5563]">Rol: Super Administrador</div>
                  <div className="px-3 py-1 text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    Acceso Total Criptográfico
                  </div>
                  <button
                    id="superadmin-edit-profile-menu-btn"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#0F1115] hover:bg-[#F5F5F3] flex items-center gap-2 transition-colors cursor-pointer border-t border-[#E5E7EB] mt-1"
                  >
                    <User className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Mi Perfil & Contraseña</span>
                  </button>
                </div>
                {onLogout && (
                  <div className="pt-1 border-t border-[#E5E7EB]">
                    <button
                      id="superadmin-logout-btn"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          BODY: SIDEBAR + MAIN CONTENT
          ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-48 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[8px] transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#0F1115] text-white'
                      : 'text-[#4B5563] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (() => {
            const currentRaffle = raffles.find(r => r.id === 'rf-024') || raffles[0];
            const ticketPrice = currentRaffle?.ticketPrice || 10;
            const operationalAdmins = admins.filter(a => a.id !== 'adm-super');
            const totalMoneyCollected = operationalAdmins.reduce((acc, a) => acc + (a.totalSold * ticketPrice), 0);
            const totalMoneyGoal = operationalAdmins.reduce((acc, a) => acc + ((a.assignedQuota || 20) * ticketPrice), 0);
            const totalTicketsSold = operationalAdmins.reduce((acc, a) => acc + a.totalSold, 0);
            const totalQuotaTickets = operationalAdmins.reduce((acc, a) => acc + (a.assignedQuota || 20), 0);
            const completedAdmins = operationalAdmins.filter(a => a.totalSold >= (a.assignedQuota || 20));

            const filteredOverviewAdmins = operationalAdmins
              .filter((admin) => {
                const q = overviewAdminSearch.toLowerCase();
                const matches = admin.name.toLowerCase().includes(q) || (admin.dni && admin.dni.includes(q));
                if (!matches) return false;
                const isDone = admin.totalSold >= (admin.assignedQuota || 20);
                if (overviewAdminFilter === 'completed') return isDone;
                if (overviewAdminFilter === 'pending') return !isDone;
                return true;
              })
              .sort((a, b) => {
                if (overviewAdminSort === 'highest') return b.totalSold - a.totalSold;
                if (overviewAdminSort === 'lowest') return a.totalSold - b.totalSold;
                return a.name.localeCompare(b.name);
              });

            return (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Header Welcome */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] uppercase">
                        CAMPAÑA OFICIAL: {currentRaffle?.title || 'Rifa Graduación Administración'} ({currentRaffle?.code || '#024'}) · 31 ADMINISTRADORES
                      </span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F1115]">
                      Control Financiero y Recaudación
                    </h1>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Supervisión global de ganancias y recaudación individual de los {operationalAdmins.length} administradores autorizados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectRaffleForDraw(currentRaffle?.id || 'rf-024')}
                      className="px-3.5 py-2 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Ir al Sorteo en Vivo</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('admins')}
                      className="px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#0F1115] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Gestionar Admins</span>
                    </button>
                  </div>
                </div>

                {/* Banner de Talonario de Operador para el Superadministrador */}
                <div className="bg-gradient-to-r from-[#0F1115] via-[#1E293B] to-[#0F1115] text-white rounded-2xl p-5 shadow-sm border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#10B981] bg-[#10B981]/15 px-2.5 py-0.5 rounded-full border border-[#10B981]/30">
                        Mi Cuota Personal de Ventas · {currentUser?.name || 'Jheyson Ryam Jorge Vasquez'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Talonario Operador: <span className="text-[#10B981] font-mono">{personalSold} / {personalQuota} tickets vendidos</span>
                    </h3>
                    <p className="text-xs text-gray-300">
                      Como Superadministrador también operas tus 20 boletos (S/ {(personalSold * 10).toFixed(2)} recaudados de tu meta de S/ {(personalQuota * 10).toFixed(2)}).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {onOpenRegisterTicket && (
                      <button
                        onClick={onOpenRegisterTicket}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <TicketIcon className="w-4 h-4" />
                        <span>Vender Mis Boletos</span>
                      </button>
                    )}
                    {onSwitchToSalesPanel && (
                      <button
                        onClick={onSwitchToSalesPanel}
                        className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Mi Panel de Operador</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#10B981]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas clave financieras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs hover:border-[#10B981]/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Total Recaudado
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#059669] font-mono mt-2">
                      S/ {totalMoneyCollected.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-1 font-mono">
                      <span>Meta global: S/ {totalMoneyGoal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mt-3">
                      <div 
                        className="h-full bg-[#059669] rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((totalMoneyCollected / (totalMoneyGoal || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Meta Financiera
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] text-[#0F1115] flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F1115] font-mono mt-2">
                      S/ {totalMoneyGoal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 font-mono">
                      {operationalAdmins.length} admins × S/ 200.00 (20 tks)
                    </div>
                    <div className="text-[11px] text-[#059669] font-semibold mt-3 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Precio oficial: S/ {ticketPrice}.00 / ticket</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Tickets Vendidos
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] text-[#0F1115] flex items-center justify-center">
                        <TicketIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F1115] font-mono mt-2">
                      {totalTicketsSold} <span className="text-sm font-normal text-[#6B7280]">/ {totalQuotaTickets}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 font-mono">
                      {Math.round((totalTicketsSold / (totalQuotaTickets || 1)) * 100)}% de los tickets asignados
                    </div>
                    <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mt-3">
                      <div 
                        className="h-full bg-[#0F1115] rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((totalTicketsSold / (totalQuotaTickets || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Metas Cumplidas
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#059669] font-mono mt-2">
                      {completedAdmins.length} <span className="text-sm font-normal text-[#6B7280]">/ {operationalAdmins.length}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 font-mono">
                      Admins con 20 tickets (S/ 200) completos
                    </div>
                    <div className="text-[11px] text-[#D97706] font-semibold mt-3">
                      {operationalAdmins.length - completedAdmins.length} admins aún en proceso
                    </div>
                  </div>
                </div>

                {/* TABLA PRINCIPAL DE CONTROL DE RECAUDACIÓN POR ADMINISTRADOR */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-[#E5E7EB] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-[#0F1115] flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#059669]" />
                          <span>Control Financiero: Recaudación por Administrador</span>
                        </h2>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Seguimiento en Soles recaudados por cada uno de los {operationalAdmins.length} administradores (Meta individual: S/ 200.00).
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Selector de ordenamiento */}
                        <div className="flex items-center gap-1 bg-[#F5F5F3] p-1 rounded-xl text-xs font-medium">
                          <button
                            onClick={() => setOverviewAdminSort('highest')}
                            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              overviewAdminSort === 'highest'
                                ? 'bg-white font-bold text-[#0F1115] shadow-xs'
                                : 'text-[#6B7280] hover:text-[#0F1115]'
                            }`}
                            title="Mayor dinero recaudado primero"
                          >
                            Mayor Recaudación
                          </button>
                          <button
                            onClick={() => setOverviewAdminSort('lowest')}
                            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              overviewAdminSort === 'lowest'
                                ? 'bg-white font-bold text-[#0F1115] shadow-xs'
                                : 'text-[#6B7280] hover:text-[#0F1115]'
                            }`}
                            title="Menor dinero recaudado primero"
                          >
                            Menor Recaudación
                          </button>
                          <button
                            onClick={() => setOverviewAdminSort('name')}
                            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              overviewAdminSort === 'name'
                                ? 'bg-white font-bold text-[#0F1115] shadow-xs'
                                : 'text-[#6B7280] hover:text-[#0F1115]'
                            }`}
                            title="Ordenar por nombre"
                          >
                            A-Z
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filtros de estado y buscador */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#E5E7EB]/70">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <button
                          onClick={() => setOverviewAdminFilter('all')}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                            overviewAdminFilter === 'all'
                              ? 'bg-[#0F1115] text-white'
                              : 'bg-[#F5F5F3] text-[#4B5563] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          Todos ({operationalAdmins.length})
                        </button>
                        <button
                          onClick={() => setOverviewAdminFilter('completed')}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                            overviewAdminFilter === 'completed'
                              ? 'bg-[#059669] text-white'
                              : 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                          }`}
                        >
                          Meta Cumplida S/ 200 ({completedAdmins.length})
                        </button>
                        <button
                          onClick={() => setOverviewAdminFilter('pending')}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                            overviewAdminFilter === 'pending'
                              ? 'bg-[#D97706] text-white'
                              : 'bg-[#FFFBEB] text-[#D97706] hover:bg-[#FEF3C7]'
                          }`}
                        >
                          En Progreso ({operationalAdmins.length - completedAdmins.length})
                        </button>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar por operador o DNI..."
                          value={overviewAdminSearch}
                          onChange={(e) => setOverviewAdminSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Administradores */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4 w-12 text-center">#</th>
                          <th className="py-3 px-4">Administrador / Operador</th>
                          <th className="py-3 px-4 text-center">Tickets Vendidos</th>
                          <th className="py-3 px-4 text-right">Dinero Recaudado</th>
                          <th className="py-3 px-4 text-right">Meta (Soles)</th>
                          <th className="py-3 px-4 w-44">Progreso de Meta</th>
                          <th className="py-3 px-4 text-center">Estado Financiero</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredOverviewAdmins.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                              No se encontraron administradores con los filtros especificados.
                            </td>
                          </tr>
                        ) : (
                          filteredOverviewAdmins.map((admin, idx) => {
                            const quota = admin.assignedQuota || 20;
                            const moneyCollected = admin.totalSold * ticketPrice;
                            const moneyGoal = quota * ticketPrice;
                            const isCompleted = admin.totalSold >= quota;
                            const percentage = Math.min(100, Math.round((admin.totalSold / quota) * 100));
                            const remainingMoney = Math.max(0, moneyGoal - moneyCollected);

                            return (
                              <tr key={admin.id} className="hover:bg-[#FAFAFA] transition-colors">
                                <td className="py-3 px-4 text-center font-mono font-bold text-[#6B7280]">
                                  {idx + 1 <= 3 ? (
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                      idx === 0 ? 'bg-amber-100 text-amber-800' :
                                      idx === 1 ? 'bg-slate-200 text-slate-800' :
                                      'bg-amber-50 text-amber-700'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                  ) : (
                                    <span>#{idx + 1}</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-[#0F1115] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                                      {admin.avatarInitials}
                                    </div>
                                    <div>
                                      <p className="font-bold text-[#0F1115]">{admin.name}</p>
                                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                                        {admin.dni && (
                                          <span className="font-mono bg-[#F3F4F6] px-1 py-0.2 rounded font-semibold text-[#374151]">
                                            DNI: {admin.dni}
                                          </span>
                                        )}
                                        <span className="truncate max-w-[150px]">{admin.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center font-mono">
                                  <span className="font-bold text-[#0F1115]">{admin.totalSold}</span>
                                  <span className="text-[#6B7280]"> / {quota}</span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono">
                                  <span className={`text-sm font-bold ${isCompleted ? 'text-[#059669]' : 'text-[#0F1115]'}`}>
                                    S/ {moneyCollected.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-[#6B7280]">
                                  S/ {moneyGoal.toFixed(2)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-[#6B7280]">{admin.totalSold} de {quota} tickets</span>
                                      <span className={`font-bold ${isCompleted ? 'text-[#059669]' : 'text-[#0F1115]'}`}>
                                        {percentage}%
                                      </span>
                                    </div>
                                    <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden border border-[#E5E7EB]/60">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isCompleted ? 'bg-[#059669]' : 'bg-[#0F1115]'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isCompleted ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Meta Lograda (S/ 200)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                                      <span>Falta S/ {remainingMoney.toFixed(2)}</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AUDITORÍA Y CONTROL DE ÚLTIMAS VENTAS POR ADMINISTRADOR */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-[#E5E7EB] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-[#0F1115] flex items-center gap-2">
                          <TicketIcon className="w-4 h-4 text-[#059669]" />
                          <span>Últimas Ventas y Boletos Emitidos</span>
                        </h2>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Control de ventas en tiempo real enlazado directamente con el administrador que emitió el boleto.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-lg border border-[#A7F3D0]">
                          {(tickets || []).length} Ventas Totales Registradas
                        </span>
                      </div>
                    </div>

                    {/* Buscador de boletos y selector por admin vendedor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#E5E7EB]/70">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-[#374151] whitespace-nowrap">
                          Filtrar por Vendedor:
                        </label>
                        <select
                          value={ticketSellerFilter}
                          onChange={(e) => setTicketSellerFilter(e.target.value)}
                          className="text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
                        >
                          <option value="all">Todos los Administradores ({operationalAdmins.length})</option>
                          {operationalAdmins.map((adm) => (
                            <option key={adm.id} value={adm.id}>
                              {adm.name} ({adm.totalSold} tks)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar por boleto (#0001), comprador o DNI..."
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Boletos con Administrador Vendedor visible */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Boleto N°</th>
                          <th className="py-3 px-4">Comprador</th>
                          <th className="py-3 px-4">DNI / Teléfono</th>
                          <th className="py-3 px-4">Admin que realizó la venta</th>
                          <th className="py-3 px-4 text-center">Monto</th>
                          <th className="py-3 px-4">Hora de Emisión</th>
                          <th className="py-3 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredSalesTickets.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                              No hay ventas registradas que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesTickets.slice(0, 30).map((t) => (
                            <tr key={t.id} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-sm text-[#0F1115] bg-[#F5F5F3] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                                  {t.formattedNumber}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-[#111827] block">
                                  {t.buyerName}
                                </span>
                                <span className="text-[10px] text-[#6B7280] font-mono">
                                  Cód: {t.verificationCode}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-xs">
                                <div className="text-[#374151] font-medium">DNI: {t.dni}</div>
                                <div className="text-[11px] text-[#6B7280]">{t.phone || 'Sin celular'}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-[#0F1115] text-white text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                                    {t.registeredBy ? t.registeredBy.substring(0, 2).toUpperCase() : 'AD'}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#0F1115] block leading-tight">
                                      {t.registeredBy || 'Administrador Autorizado'}
                                    </span>
                                    <span className="text-[10px] text-[#059669] font-medium">
                                      Punto de Venta Oficial
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-[#059669]">
                                S/ {Number(t.price || 10).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                                {t.timeFormatted || 'Reciente'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {onUpdateTicket && (
                                    <button
                                      onClick={() => {
                                        setTicketToEdit(t);
                                        setIsTicketEditModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0F1115] border border-[#E5E7EB] rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="Editar Nombre y DNI del Participante"
                                    >
                                      <Edit2 className="w-3 h-3 text-[#059669]" />
                                      <span>Editar</span>
                                    </button>
                                  )}
                                  {onVerifyTicket && (
                                    <button
                                      onClick={() => onVerifyTicket(t)}
                                      className="px-2.5 py-1 bg-white hover:bg-[#F5F5F3] text-[#0F1115] border border-[#E5E7EB] rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="Ver Comprobante Digital y QR"
                                    >
                                      <span>Ver QR</span>
                                      <ExternalLink className="w-3 h-3 text-[#059669]" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Estado de los 7 Premios Oficiales (Gran Rifa 2026) */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E5E7EB]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F1115]">
                          Estado de los 7 Premios Oficiales (Rifa Graduación Administración)
                        </h2>
                        <span className="text-[11px] text-[#6B7280]">
                          Adjudicación oficial y certificación mediante algoritmo CSPRNG
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('premios')}
                        className="px-3 py-1.5 text-xs font-medium text-[#4B5563] hover:text-[#0F1115] bg-[#F5F5F3] hover:bg-[#E5E7EB] rounded-xl transition-colors cursor-pointer"
                      >
                        Gestionar Premios →
                      </button>
                      <button
                        onClick={() => onSelectRaffleForDraw(currentRaffle?.id || 'rf-024')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Sorteo en Vivo</span>
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E5E7EB]/80">
                    {prizes
                      .filter(p => p.raffleId === (currentRaffle?.id || 'rf-024'))
                      .sort((a, b) => a.order - b.order)
                      .map((prize) => {
                        return (
                          <div
                            key={prize.id}
                            className="p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#FAFAFA] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-[#0F1115] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                {prize.order}°
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#111827] flex items-center gap-2">
                                  <span className="truncate">{prize.name}</span>
                                  {prize.category && (
                                    <span className="text-[10px] font-medium text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded shrink-0">
                                      {prize.category}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[#6B7280] truncate">
                                  {prize.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              {prize.isDrawn ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Adjudicado · Ticket {prize.winnerTicket?.ticketNumber || '#038'} ({prize.winnerTicket?.winnerName || 'Ganador'})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                                  <span>Pendiente de Sorteo</span>
                                </span>
                              )}

                              <button
                                onClick={() => onSelectRaffleForDraw(currentRaffle?.id || 'rf-024', prize.id)}
                                className="px-2.5 py-1 text-xs font-medium text-[#0F1115] hover:text-white bg-[#F5F5F3] hover:bg-[#0F1115] rounded-lg transition-colors cursor-pointer"
                              >
                                Sortear este
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* ─────────────────────────────────────────────────────────────
              TAB PREMIOS (CRUD COMPLETO)
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'premios' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#059669]" />
                    <span>Catálogo de los 7 Premios Oficiales (Rifa Graduación Administración)</span>
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Premios configurados para la campaña oficial. Al momento del sorteo en vivo, se certificarán con algoritmo CSPRNG.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {onResetPrizes && (
                    <button
                      id="superadmin-reset-prizes-btn"
                      onClick={() => {
                        if (window.confirm('⚠️ MODO PRUEBAS: ¿Deseas reiniciar la adjudicación de todos los premios para volver a sortearlos desde cero?')) {
                          const targetRaffleId = selectedRaffleForPrizes !== 'all' ? selectedRaffleForPrizes : (raffles[0]?.id || 'rf-024');
                          onResetPrizes(targetRaffleId);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Reiniciar adjudicación de premios para volver a probar el sorteo"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reiniciar Premios (Pruebas)</span>
                    </button>
                  )}

                  <button
                    id="add-new-prize-btn"
                    onClick={() => handleOpenAddPrize('rf-024')}
                    className="px-3.5 py-1.5 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Agregar Premio</span>
                  </button>
                </div>
              </div>

              {filteredPrizes.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-xs">
                  <Gift className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3 stroke-[1.5]" />
                  <h3 className="text-sm font-bold text-[#0F1115]">No hay premios registrados</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                    Aún no se han configurado premios para esta rifa. Presione "Agregar Premio" para registrar el 1er premio, 2do premio, etc.
                  </p>
                  <button
                    onClick={() => handleOpenAddPrize(selectedRaffleForPrizes !== 'all' ? selectedRaffleForPrizes : undefined)}
                    className="mt-4 px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar primer premio</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredPrizes
                    .sort((a, b) => a.order - b.order)
                    .map((prize) => {
                      const associatedRaffle = raffles.find(r => r.id === prize.raffleId);
                      return (
                        <div
                          key={prize.id}
                          className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-[#0F1115]/30 transition-all group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#0F1115] text-white font-mono text-[10px] font-bold">
                                  {prize.order}° Lugar
                                </span>
                                {prize.category && (
                                  <span className="text-[10px] font-medium text-[#6B7280] bg-[#F5F5F3] px-2 py-0.5 rounded">
                                    {prize.category}
                                  </span>
                                )}
                              </div>

                              {prize.isDrawn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                  <Check className="w-2.5 h-2.5" /> Sorteado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                                  <Sparkles className="w-2.5 h-2.5" /> Pendiente
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-[#0F1115] leading-snug">
                              {prize.name}
                            </h3>
                            {prize.description && (
                              <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">
                                {prize.description}
                              </p>
                            )}

                            {prize.link && (
                              <div className="mt-2">
                                <a
                                  href={prize.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#059669] hover:text-[#047857] hover:underline bg-[#ECFDF5] px-2.5 py-1 rounded-lg border border-[#A7F3D0] transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[200px]">Ver enlace del premio</span>
                                </a>
                              </div>
                            )}

                            <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
                              <span className="text-[#6B7280] font-mono text-[11px]">
                                {associatedRaffle?.code || 'Rifa'} · {associatedRaffle?.title || ''}
                              </span>
                              <span className="text-[11px] font-semibold text-[#0F1115] bg-[#F5F5F3] px-2 py-0.5 rounded">
                                Sorteo Oficial
                              </span>
                            </div>

                            {prize.winnerTicket && (
                              <div className="mt-2.5 p-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs">
                                <span className="text-[10px] font-bold uppercase text-[#059669] tracking-wider block">
                                  Ganador Adjudicado:
                                </span>
                                <p className="font-bold text-[#0F1115]">
                                  {prize.winnerTicket.ticketNumber} · {prize.winnerTicket.winnerName}
                                </p>
                                <p className="text-[10px] font-mono text-[#6B7280]">
                                  Sorteo ID: {prize.winnerTicket.drawId}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#E5E7EB]/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditPrize(prize)}
                                className="p-1.5 text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
                                title="Editar detalles del premio"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeletePrize(prize.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar premio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => onSelectRaffleForDraw(prize.raffleId, prize.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3 h-3 text-[#10B981]" />
                              <span>{prize.isDrawn ? 'Repetir sorteo' : 'Sortear este premio'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB ADMINS (CRUD COMPLETO: Crear, Editar, Desactivar, Eliminar)
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'admins' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#059669]" />
                    <span>Administradores y Puntos de Emisión ({admins.length})</span>
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Gestión de operadores autorizados con acceso por login, DNI y cuota fijada en 20 tickets.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, DNI o email..."
                      value={searchAdmin}
                      onChange={(e) => setSearchAdmin(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#0F1115] w-64 focus:outline-none focus:border-[#0F1115]"
                    />
                  </div>

                  <button
                    id="add-new-admin-btn"
                    onClick={handleOpenAddAdmin}
                    className="px-3.5 py-1.5 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Nuevo Administrador</span>
                  </button>
                </div>
              </div>

              {/* Quota Overview Summary Banner with Financial Control */}
              <div className="bg-[#0F1115] text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#10B981] shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Recaudación Oficial: Cuota de S/ 200.00 por Administrador
                    </h3>
                    <p className="text-[11px] text-white/70">
                      Supervisión en tiempo real de cuánto dinero recolectó cada uno de los 31 operadores de Junín.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs font-mono">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[9px] text-white/60 block uppercase">Operadores</span>
                    <span className="text-xs font-bold">{admins.filter(a => a.id !== 'adm-super').length}</span>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[9px] text-white/60 block uppercase">Meta Total</span>
                    <span className="text-xs font-bold text-white/90">
                      S/ {(admins.filter(a => a.id !== 'adm-super').reduce((acc, a) => acc + (a.assignedQuota || 20), 0) * 10).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl text-center border border-[#10B981]/30">
                    <span className="text-[9px] text-[#10B981] block uppercase font-bold">Total Recaudado</span>
                    <span className="text-xs font-bold text-[#10B981]">
                      S/ {(admins.filter(a => a.id !== 'adm-super').reduce((acc, a) => acc + a.totalSold, 0) * 10).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {admins
                  .filter((admin) => {
                    if (admin.id === 'adm-super' || admin.name.toLowerCase().includes('marks')) return false;
                    const q = searchAdmin.toLowerCase();
                    return (
                      admin.name.toLowerCase().includes(q) ||
                      (admin.dni && admin.dni.includes(q)) ||
                      admin.email.toLowerCase().includes(q)
                    );
                  })
                  .map((admin) => {
                    const quota = admin.assignedQuota || 20;
                    const moneyCollected = admin.totalSold * 10;
                    const moneyGoal = quota * 10;
                    const isCompleted = admin.totalSold >= quota;
                    const remainingMoney = Math.max(0, moneyGoal - moneyCollected);
                    const percentage = Math.min(100, Math.round((admin.totalSold / quota) * 100));

                    return (
                    <div key={admin.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-[#0F1115]/30 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#0F1115] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                              {admin.avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-[#0F1115] truncate">{admin.name}</h3>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {admin.dni && (
                                  <span className="font-mono text-[9px] bg-[#E5E7EB]/60 text-[#374151] px-1 py-0.2 rounded font-semibold">
                                    DNI: {admin.dni}
                                  </span>
                                )}
                                <span className="text-[10px] text-[#6B7280] truncate">{admin.email}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleAdminStatus(admin)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors shrink-0 ml-1 ${
                              admin.status === 'activo'
                                ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                                : 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]'
                            }`}
                            title="Haga clic para cambiar estado"
                          >
                            {admin.status === 'activo' ? '● Activo' : '● Inactivo'}
                          </button>
                        </div>

                        {/* Financial Box */}
                        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-2.5 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#6B7280] font-medium">Dinero Recolectado:</span>
                            <span className={`font-mono font-bold text-sm ${isCompleted ? 'text-[#059669]' : 'text-[#0F1115]'}`}>
                              S/ {moneyCollected.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-[#6B7280]">Meta Asignada:</span>
                            <span className="font-semibold text-[#0F1115]">S/ {moneyGoal.toFixed(2)} ({quota} tks)</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-mono text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                            <span>Tickets Vendidos:</span>
                            <span className="font-semibold text-[#0F1115]">{admin.totalSold} / {quota}</span>
                          </div>
                          
                          {/* Quota progress bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#6B7280]">
                                {isCompleted
                                  ? '🎉 Meta S/ 200 cumplida'
                                  : `Falta recaudar S/ ${remainingMoney.toFixed(2)}`}
                              </span>
                              <span className={`font-mono font-bold ${
                                isCompleted ? 'text-[#059669]' : 'text-[#0F1115]'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden border border-[#E5E7EB]/50">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted ? 'bg-[#059669]' : 'bg-[#0F1115]'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E7EB]/80 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEditAdmin(admin)}
                        className="p-1.5 text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
                        title="Editar operador y contraseña"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {admins.length > 1 && (
                        <button
                          onClick={() => handleDeleteAdminClick(admin)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar administrador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </motion.div>
          )}

          {activeTab === 'sorteos' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide">
                  Historial y Certificación de Sorteos
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Registros públicos de ganadores certificados con hash auditado y premio adjudicado.
                </p>
              </div>

              <div className="space-y-3">
                {raffles.map((r) => {
                  const rafflePrizes = prizes.filter(p => p.raffleId === r.id);
                  const drawnPrizes = rafflePrizes.filter(p => p.isDrawn);
                  return (
                    <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">{r.code}</span>
                          <span className="text-xs font-semibold text-[#0F1115]">{r.title}</span>
                        </div>
                        {drawnPrizes.length > 0 ? (
                          <div className="text-xs text-[#059669] font-medium mt-1 space-y-0.5">
                            {drawnPrizes.map((dp) => (
                              <div key={dp.id}>
                                🏆 {dp.name}: {dp.winnerTicket?.winnerName} ({dp.winnerTicket?.ticketNumber})
                              </div>
                            ))}
                          </div>
                        ) : r.winner ? (
                          <p className="text-xs text-[#059669] font-medium mt-1">
                            Ganador: {r.winner.winnerName} ({r.winner.ticketNumber}) · Sorteo ID: {r.winner.drawId}
                          </p>
                        ) : (
                          <p className="text-xs text-[#6B7280] mt-1">
                            {rafflePrizes.length} premios configurados · Sorteo: {r.drawDate}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectRaffleForDraw(r.id)}
                        className="px-3 py-1.5 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-medium rounded-xl transition-colors self-start sm:self-center cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Abrir Sorteo en Vivo</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'auditoria' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide">
                  Registro de Auditoría Criptográfica
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Traza inmutable de todas las transacciones, emisiones y validaciones.
                </p>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs divide-y divide-[#E5E7EB]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3 text-xs flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[#0F1115]">{log.action}</span>
                      <span className="text-[#6B7280] mx-1.5">·</span>
                      <span className="text-[#4B5563]">{log.detail}</span>
                    </div>
                    <div className="shrink-0 font-mono text-[11px] text-[#6B7280]">
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB CONFIG (EDICIÓN FUNCIONAL)
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'config' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#059669]" />
                  <span>Configuración del Sistema</span>
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Ajustes institucionales, moneda, WhatsApp para comprobantes y seguridad.
                </p>
              </div>

              {configSavedToast && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#059669] text-xs font-semibold flex items-center gap-2 max-w-xl"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Configuración guardada exitosamente en el sistema!</span>
                </motion.div>
              )}

              <form onSubmit={handleSaveConfigForm} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4 text-xs max-w-xl">
                <div>
                  <label className="font-semibold text-[#374151] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Nombre de la Organización / Institución</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#374151] uppercase tracking-wider block mb-1.5">
                      Símbolo Monetario
                    </label>
                    <input
                      type="text"
                      value={currSymbol}
                      onChange={(e) => setCurrSymbol(e.target.value)}
                      placeholder="S/ o $"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#374151] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span>WhatsApp de Soporte</span>
                    </label>
                    <input
                      type="text"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#374151] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Mensaje en Comprobante Digital</span>
                  </label>
                  <textarea
                    value={receiptMsg}
                    onChange={(e) => setReceiptMsg(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#059669]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Motor criptográfico CSPRNG y firmas de ticket SHA-256 habilitadas</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-99"
                  >
                    <Save className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </main>
      </div>

      {/* Prize Management Modal */}
      <PrizeManagementModal
        isOpen={isPrizeModalOpen}
        onClose={() => {
          setIsPrizeModalOpen(false);
          setPrizeToEdit(null);
        }}
        raffles={raffles}
        selectedRaffleId={selectedRaffleForPrizes !== 'all' ? selectedRaffleForPrizes : undefined}
        prizeToEdit={prizeToEdit}
        onSavePrize={onSavePrize}
      />

      {/* Raffle Modal */}
      <RaffleModal
        isOpen={isRaffleModalOpen}
        onClose={() => {
          setIsRaffleModalOpen(false);
          setRaffleToEdit(null);
        }}
        admins={admins}
        raffleToEdit={raffleToEdit}
        onSaveRaffle={onSaveRaffle}
      />

      {/* Admin User Modal */}
      <AdminUserModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminToEdit(null);
        }}
        adminToEdit={adminToEdit}
        raffles={raffles}
        onSaveAdmin={onSaveAdmin}
      />

      {/* Superadmin Profile CRUD Modal */}
      <SuperAdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          if (onUpdateCurrentUser) {
            onUpdateCurrentUser(updated);
          }
        }}
      />

      {/* Ticket Edit Modal for Superadmin */}
      <TicketEditModal
        isOpen={isTicketEditModalOpen}
        onClose={() => {
          setIsTicketEditModalOpen(false);
          setTicketToEdit(null);
        }}
        ticket={ticketToEdit}
        onSaveTicket={async (updated) => {
          if (onUpdateTicket) {
            await onUpdateTicket(updated);
          }
        }}
      />
    </div>
  );
};
