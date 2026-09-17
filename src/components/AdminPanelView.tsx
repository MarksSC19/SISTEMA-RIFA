import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Search, 
  QrCode, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  Lock,
  Trophy,
  LogOut,
  Gift,
  Edit2,
  Trash2,
  Target
} from 'lucide-react';
import { Raffle, Ticket, Prize, AuthUser } from '../types';
import { TicketEditModal } from './TicketEditModal';

interface Props {
  raffle: Raffle;
  tickets: Ticket[];
  prizes?: Prize[];
  currentUser?: AuthUser | null;
  onOpenRegisterModal: () => void;
  onGoToLiveDraw: (raffleId: string) => void;
  onVerifyTicket: (ticket: Ticket) => void;
  onBackToOverview: () => void;
  onToggleRaffleStatus?: (raffleId: string) => void;
  onUpdateTicket?: (ticket: Ticket) => Promise<void> | void;
  onDeleteTicket?: (ticketId: string) => void;
  onLogout?: () => void;
}

export const AdminPanelView: React.FC<Props> = ({
  raffle,
  tickets,
  prizes = [],
  currentUser,
  onOpenRegisterModal,
  onGoToLiveDraw,
  onVerifyTicket,
  onBackToOverview,
  onToggleRaffleStatus,
  onUpdateTicket,
  onDeleteTicket,
  onLogout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPrizesList, setShowPrizesList] = useState(true);

  // Ticket edit modal states
  const [isTicketEditModalOpen, setIsTicketEditModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  // Si el usuario es un admin operador (no superadmin), sus tickets mostrados y contados son EXCLUSIVAMENTE los suyos
  const myTickets = currentUser?.role === 'super_admin'
    ? tickets
    : tickets.filter(t => (t.sellerAdminId && t.sellerAdminId === currentUser?.id) || t.registeredBy === currentUser?.name);

  const soldCount = myTickets.length;
  const adminTargetQuota = currentUser?.assignedQuota || 20;
  const freeCount = Math.max(0, adminTargetQuota - soldCount);
  const totalRevenue = soldCount * raffle.ticketPrice;
  const progressPercent = Math.min(100, Math.round((soldCount / adminTargetQuota) * 100));

  const rafflePrizes = prizes
    .filter(p => p.raffleId === raffle.id)
    .sort((a, b) => a.order - b.order);

  const filteredTickets = myTickets.filter(t => 
    t.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.formattedNumber.includes(searchTerm) ||
    t.dni.includes(searchTerm) ||
    t.verificationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTicket = (t: Ticket) => {
    setTicketToEdit(t);
    setIsTicketEditModalOpen(true);
  };

  const handleDeleteTicketClick = (t: Ticket) => {
    if (onDeleteTicket && window.confirm(`¿Está seguro de anular el ticket ${t.formattedNumber} emitido a ${t.buyerName}? Esta acción restará 1 ticket vendido y registrará la anulación en auditoría.`)) {
      onDeleteTicket(t.id);
    }
  };

  const ticketsSoldByThisAdmin = myTickets.length;
  const quotaProgress = Math.min(100, Math.round((ticketsSoldByThisAdmin / adminTargetQuota) * 100));
  const remainingTickets = Math.max(0, adminTargetQuota - ticketsSoldByThisAdmin);

  return (
    <div id="admin-panel-container" className="max-w-2xl mx-auto px-4 py-6 md:py-8 font-['Geist',sans-serif]">
      {/* Top Navigation & User Bar */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E5E7EB]">
        {currentUser?.role === 'super_admin' ? (
          <button
            id="back-to-raffles-btn"
            onClick={onBackToOverview}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5563] hover:text-[#0F1115] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Panel Superadmin</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Logo Oficial" 
              className="w-8 h-8 rounded-lg object-contain border border-gray-200 bg-white p-0.5 shadow-xs" 
            />
            <div>
              <span className="text-xs font-bold text-[#0F1115] block">
                {currentUser?.name || 'Operador Admin'}
              </span>
              <span className="text-[10px] text-[#059669] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
                Punto de Venta Autorizado
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#F9FAFB] px-2.5 py-1 rounded-lg border border-gray-200">
            <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain" />
            <span className="text-[11px] font-semibold text-[#1F2937] tracking-tight">
              Rifa Graduación Administración
            </span>
          </div>

          {onLogout && (
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="p-1.5 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>

      {/* Meta de Venta y Control de Recaudación Asignada */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1115] text-[#10B981] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#0F1115] block">
                Meta Asignada: {adminTargetQuota} tickets (S/ {(adminTargetQuota * raffle.ticketPrice).toLocaleString()})
              </span>
              <span className="text-[10px] text-[#6B7280]">
                Control individual de ventas y dinero recaudado para este operador
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="font-mono text-xs font-bold text-[#0F1115]">
                {ticketsSoldByThisAdmin} / {adminTargetQuota} tks
              </span>
              <span className="font-mono text-xs font-bold text-[#059669] bg-[#ECFDF5] px-1.5 py-0.2 rounded border border-[#A7F3D0]">
                S/ {(ticketsSoldByThisAdmin * raffle.ticketPrice).toLocaleString()}
              </span>
            </div>
            <span className={`text-[10px] block font-bold mt-0.5 ${
              ticketsSoldByThisAdmin >= adminTargetQuota ? 'text-[#059669]' : 'text-[#D97706]'
            }`}>
              {ticketsSoldByThisAdmin >= adminTargetQuota ? '🎉 ¡Meta cumplida!' : `Faltan ${remainingTickets} tks (S/ ${(remainingTickets * raffle.ticketPrice).toLocaleString()})`}
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden border border-[#E5E7EB]/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${quotaProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              ticketsSoldByThisAdmin >= adminTargetQuota ? 'bg-[#059669]' : 'bg-[#0F1115]'
            }`}
          />
        </div>
      </div>

      {/* Main Raffle Card Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-mono text-[#6B7280] tracking-wider block mb-0.5">
              {raffle.code}
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F1115]">
              {raffle.title}
            </h1>
            <p className="text-xs text-[#6B7280] mt-1 line-clamp-1">
              {raffle.description}
            </p>
          </div>

          {currentUser?.role === 'super_admin' ? (
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                <span className="uppercase tracking-wider">{raffle.status}</span>
                <ChevronDown className="w-3 h-3 text-[#059669]" />
              </button>

              {showStatusDropdown && onToggleRaffleStatus && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20">
                  <button
                    onClick={() => {
                      onToggleRaffleStatus(raffle.id);
                      setShowStatusDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F5F5F3] flex items-center justify-between cursor-pointer"
                  >
                    <span>{raffle.status === 'activa' ? 'Cerrar Rifa' : 'Reactivar Rifa'}</span>
                    <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              <span className="uppercase tracking-wider">Activa</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0F1115] font-['JetBrains_Mono']">
              {soldCount.toLocaleString()} / {adminTargetQuota.toLocaleString()} tickets asignados
            </span>
            <span className="text-[#6B7280] font-mono text-[11px]">
              {progressPercent}% completado
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#F5F5F3] rounded-full overflow-hidden border border-[#E5E7EB]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-[#0F1115] rounded-full"
            />
          </div>
        </div>

        {/* 3 Metric blocks (Fintech style) */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-6">
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
              {soldCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              {currentUser?.role === 'super_admin' ? 'Total Vendidos' : 'Mis Ventas'}
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
              {freeCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              {currentUser?.role === 'super_admin' ? 'Total Libres' : 'Mis Libres'}
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#059669] font-['JetBrains_Mono']">
              {raffle.currency}{totalRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              {currentUser?.role === 'super_admin' ? 'Recaudación' : 'Mi Recaudado'}
            </div>
          </div>
        </div>

        {/* Premios en juego card */}
        {rafflePrizes.length > 0 && (
          <div className="mb-6 p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F1115] uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-[#059669]" />
                <span>Premios en Disputa ({rafflePrizes.length}) · Oficial</span>
              </div>
              <button
                onClick={() => setShowPrizesList(!showPrizesList)}
                className="text-[11px] text-[#059669] hover:underline font-medium cursor-pointer"
              >
                {showPrizesList ? 'Ocultar' : 'Ver todos'}
              </button>
            </div>

            {showPrizesList && (
              <div className="space-y-1.5 mt-2">
                {rafflePrizes.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-white border border-[#E5E7EB] rounded-lg text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-[#0F1115] text-white font-mono text-[10px] font-bold shrink-0">
                        {p.order}°
                      </span>
                      <span className="font-semibold text-[#0F1115] truncate">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.isDrawn ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] text-[10px] font-bold">
                          ✓ Sorteado
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#D97706] text-[10px] font-medium">
                          ● Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Primary Action: + Registrar ticket */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            id="register-ticket-trigger-btn"
            onClick={onOpenRegisterModal}
            className="flex-1 py-3.5 px-5 bg-[#0F1115] hover:bg-[#23272F] text-white font-semibold text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-99"
          >
            <Plus className="w-4 h-4 text-[#10B981]" />
            <span>Registrar ticket</span>
          </button>

          {currentUser?.role === 'super_admin' && onGoToLiveDraw && (
            <button
              id="go-to-live-draw-btn"
              onClick={() => onGoToLiveDraw(raffle.id)}
              className="py-3.5 px-5 bg-white hover:bg-[#F5F5F3] text-[#0F1115] border border-[#E5E7EB] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              title="Abrir pantalla teatral de sorteo en vivo"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
              <span>Sorteo en vivo</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket List Section with CRUD actions (Edit & Delete) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F1115] uppercase">
              Mis Ventas Registradas
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket emitido' : 'tickets emitidos'} bajo su punto de venta
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por número, nombre o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
            />
          </div>
        </div>

        {/* Clean Ticket List with full CRUD actions */}
        <div className="divide-y divide-[#E5E7EB]/80">
          {filteredTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              No se encontraron registros que coincidan con la búsqueda.
            </div>
          ) : (
            filteredTickets.slice(0, 15).map((ticket) => (
              <div
                key={ticket.id}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-[#0F1115] w-14 shrink-0">
                    {ticket.formattedNumber}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-medium text-[#111827] truncate">
                      {ticket.buyerName}
                    </p>
                    <p className="text-[11px] text-[#6B7280] font-mono">
                      DNI: {ticket.dni} · {ticket.phone ? `${ticket.phone} · ` : ''}{ticket.verificationCode}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-[#6B7280] hidden sm:inline">
                    {ticket.timeFormatted}
                  </span>
                  
                  {/* Verified emerald badge */}
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]" title="Participación válida">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>

                  {/* Edit ticket button */}
                  {onUpdateTicket && (
                    <button
                      onClick={() => handleEditTicket(ticket)}
                      className="p-1.5 rounded hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#0F1115] transition-all cursor-pointer"
                      title="Editar datos del comprador"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete/Anular ticket button */}
                  {onDeleteTicket && (
                    <button
                      onClick={() => handleDeleteTicketClick(ticket)}
                      className="p-1.5 rounded hover:bg-rose-50 text-[#9CA3AF] hover:text-rose-600 transition-all cursor-pointer"
                      title="Anular ticket emitido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* QR view button */}
                  <button
                    onClick={() => onVerifyTicket(ticket)}
                    className="p-1.5 rounded hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#0F1115] transition-all cursor-pointer"
                    title="Ver detalle del ticket / QR"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredTickets.length > 15 && (
          <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-center">
            <span className="text-xs text-[#6B7280]">
              Mostrando los 15 registros más recientes
            </span>
          </div>
        )}
      </div>

      {/* Ticket Edit Modal */}
      <TicketEditModal
        isOpen={isTicketEditModalOpen}
        onClose={() => {
          setIsTicketEditModalOpen(false);
          setTicketToEdit(null);
        }}
        ticket={ticketToEdit}
        onSaveTicket={async (updated) => {
          if (onUpdateTicket) await onUpdateTicket(updated);
        }}
      />
    </div>
  );
};
