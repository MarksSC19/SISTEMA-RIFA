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
  Check
} from 'lucide-react';
import { Raffle, AdminUser, AuditLog, Ticket } from '../types';

interface Props {
  raffles: Raffle[];
  admins: AdminUser[];
  auditLogs: AuditLog[];
  onSelectRaffleForAdmin: (raffleId: string) => void;
  onSelectRaffleForDraw: (raffleId: string) => void;
  onOpenNewRaffleModal?: () => void;
}

type TabType = 'overview' | 'rifas' | 'admins' | 'sorteos' | 'auditoria' | 'config';

export const SuperAdminView: React.FC<Props> = ({
  raffles,
  admins,
  auditLogs,
  onSelectRaffleForAdmin,
  onSelectRaffleForDraw,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchRaffle, setSearchRaffle] = useState('');

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
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'rifas', label: 'Rifas', icon: <TicketIcon className="w-4 h-4" /> },
    { id: 'admins', label: 'Admins', icon: <Users className="w-4 h-4" /> },
    { id: 'sorteos', label: 'Sorteos', icon: <Dices className="w-4 h-4" /> },
    { id: 'auditoria', label: 'Auditoría', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'config', label: 'Config.', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div id="super-admin-layout" className="min-h-screen bg-[#F5F5F3] text-[#0F1115]">
      {/* ─────────────────────────────────────────────────────────────
          TOP BAR: RIFAS         🔔     Marks ▾
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-[#0F1115] font-['Geist'] uppercase">
              RIFAS
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-[#0F1115] text-white">
              SaaS Pro
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
                M
              </div>
              <span className="text-xs font-semibold text-[#0F1115]">
                Marks
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg py-1.5 z-40 text-xs">
                <div className="px-3 py-2 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#0F1115]">Marks</p>
                  <p className="text-[11px] text-[#6B7280] truncate">marksdelmissolano@gmail.com</p>
                </div>
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[#4B5563]">Rol: Super Administrador</div>
                  <div className="px-3 py-1.5 text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    Sistema Criptográfico Operativo
                  </div>
                </div>
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
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Saludo y titular minimalista */}
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F1115]">
                  Buenos días, Marks
                </h1>
                <p className="text-xs text-[#6B7280] mt-1">
                  Aquí tienes el resumen de la plataforma.
                </p>
              </div>

              {/* ┌──────────┐ ┌──────────┐ ┌──────────┐
                  │  24      │ │ 18,420   │ │ S/84,230 │
                  │ Rifas    │ │ Tickets  │ │ Recaudado│
                  └──────────┘ └──────────┘ └──────────┘ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-xs">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
                    24
                  </div>
                  <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mt-1">
                    Rifas
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-xs">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
                    18,420
                  </div>
                  <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mt-1">
                    Tickets
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-xs">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#059669] font-['JetBrains_Mono']">
                    S/ 84,230
                  </div>
                  <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mt-1">
                    Recaudado
                  </div>
                </div>
              </div>

              {/* Actividad reciente
                  ────────────────────────────────────────
                  Rifa #024       1,240 tickets     ● Activa
                  Rifa #023         850 tickets     ● Cerrada
                  Rifa #022       2,100 tickets     ● Sorteo */}
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E7EB]/80 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F1115]">
                    Actividad reciente
                  </h2>
                  <span className="text-[11px] text-[#6B7280]">
                    Actualizado en tiempo real
                  </span>
                </div>

                <div className="divide-y divide-[#E5E7EB]/80">
                  {raffles.map((raffle) => (
                    <div
                      key={raffle.id}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#0F1115] bg-[#F5F5F3] px-2 py-1 rounded">
                          {raffle.code}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-[#111827]">
                            {raffle.title}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            Precio: {raffle.currency}{raffle.ticketPrice} · Admin: {raffle.assignedAdmin}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-[#0F1115]">
                            {raffle.soldTickets.toLocaleString()}
                          </span>
                          <span className="text-xs text-[#6B7280] ml-1">tickets</span>
                        </div>

                        <div>
                          {renderStatusBadge(raffle.status)}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectRaffleForAdmin(raffle.id)}
                            className="px-2.5 py-1 text-xs font-medium text-[#0F1115] bg-[#F5F5F3] hover:bg-[#E5E7EB] rounded-[6px] transition-colors cursor-pointer"
                            title="Gestionar en panel móvil"
                          >
                            Panel Admin
                          </button>
                          
                          {raffle.status !== 'cerrada' && (
                            <button
                              onClick={() => onSelectRaffleForDraw(raffle.id)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-[#0F1115] hover:bg-[#23272F] rounded-[6px] transition-colors cursor-pointer"
                              title="Abrir sorteo en vivo"
                            >
                              Sorteo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rifas' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide">
                    Gestión de Rifas
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Control central de campañas, emisión y sorteos.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar rifas..."
                    value={searchRaffle}
                    onChange={(e) => setSearchRaffle(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-[8px] text-[#0F1115]"
                  />
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[#6B7280] font-medium uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Título</th>
                        <th className="py-3 px-4">Vendidos</th>
                        <th className="py-3 px-4">Recaudación</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {raffles
                        .filter(r => r.title.toLowerCase().includes(searchRaffle.toLowerCase()) || r.code.includes(searchRaffle))
                        .map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold">{r.code}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#0F1115] block">{r.title}</span>
                              <span className="text-[11px] text-[#6B7280]">{r.assignedAdmin}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium">
                              {r.soldTickets.toLocaleString()} / {r.totalTickets.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#059669]">
                              {r.currency}{(r.soldTickets * r.ticketPrice).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">{renderStatusBadge(r.status)}</td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => onSelectRaffleForAdmin(r.id)}
                                className="text-xs text-[#0F1115] hover:underline font-medium cursor-pointer"
                              >
                                Administrar
                              </button>
                              <button
                                onClick={() => onSelectRaffleForDraw(r.id)}
                                className="text-xs text-[#059669] hover:underline font-medium cursor-pointer"
                              >
                                Sorteo en vivo
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admins' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide">
                  Administradores y Puntos de Emisión
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Gestión de operadores habilitados para emitir y certificar tickets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 shadow-xs">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-[#0F1115] text-white flex items-center justify-center font-mono text-xs font-bold">
                        {admin.avatarInitials}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#0F1115]">{admin.name}</h3>
                        <p className="text-[11px] text-[#6B7280]">{admin.email}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#E5E7EB] flex justify-between text-xs font-mono">
                      <span className="text-[#6B7280]">Ventas totales:</span>
                      <span className="font-bold text-[#059669]">{admin.totalSold.toLocaleString()} tickets</span>
                    </div>
                  </div>
                ))}
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
                  Registros públicos de ganadores certificados con hash auditado.
                </p>
              </div>

              <div className="space-y-3">
                {raffles.map((r) => (
                  <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{r.code}</span>
                        <span className="text-xs font-semibold text-[#0F1115]">{r.title}</span>
                      </div>
                      {r.winner ? (
                        <p className="text-xs text-[#059669] font-medium mt-1">
                          Ganador: {r.winner.winnerName} ({r.winner.ticketNumber}) · Certificado ID: {r.winner.drawId}
                        </p>
                      ) : (
                        <p className="text-xs text-[#6B7280] mt-1">
                          Sorteo programado: {r.drawDate} ({r.soldTickets.toLocaleString()} participaciones válidas)
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectRaffleForDraw(r.id)}
                      className="px-3 py-1.5 bg-[#0F1115] hover:bg-[#23272F] text-white text-xs font-medium rounded-[8px] transition-colors self-start sm:self-center cursor-pointer"
                    >
                      {r.winner ? 'Ver Certificado / Repetir' : 'Abrir Sorteo en Vivo'}
                    </button>
                  </div>
                ))}
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

              <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 shadow-xs divide-y divide-[#E5E7EB]">
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

          {activeTab === 'config' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-[#0F1115] uppercase tracking-wide">
                  Configuración del Sistema
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Ajustes de identidad, moneda, criptografía y mensajes automáticos.
                </p>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 shadow-xs space-y-4 text-xs max-w-xl">
                <div>
                  <label className="font-medium text-[#4B5563] block mb-1">Moneda Base</label>
                  <input
                    type="text"
                    disabled
                    value="Soles Peruanos (S/)"
                    className="w-full px-3 py-2 bg-[#F5F5F3] border border-[#E5E7EB] rounded-[8px] font-mono text-[#0F1115]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] block mb-1">Algoritmo de Aleatoriedad en Sorteos</label>
                  <input
                    type="text"
                    disabled
                    value="CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)"
                    className="w-full px-3 py-2 bg-[#F5F5F3] border border-[#E5E7EB] rounded-[8px] font-mono text-[#0F1115]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] block mb-1">Estado del Servidor de Verificación QR</label>
                  <div className="flex items-center gap-2 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[8px] text-[#059669]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conexión cifrada TLS 1.3 activa con firmas de ticket SHA-256</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};
