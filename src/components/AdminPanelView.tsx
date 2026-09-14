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
  Lock
} from 'lucide-react';
import { Raffle, Ticket } from '../types';

interface Props {
  raffle: Raffle;
  tickets: Ticket[];
  onOpenRegisterModal: () => void;
  onGoToLiveDraw: (raffleId: string) => void;
  onVerifyTicket: (ticket: Ticket) => void;
  onBackToOverview: () => void;
  onToggleRaffleStatus?: (raffleId: string) => void;
}

export const AdminPanelView: React.FC<Props> = ({
  raffle,
  tickets,
  onOpenRegisterModal,
  onGoToLiveDraw,
  onVerifyTicket,
  onBackToOverview,
  onToggleRaffleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const soldCount = tickets.length;
  const freeCount = Math.max(0, raffle.totalTickets - soldCount);
  const totalRevenue = soldCount * raffle.ticketPrice;
  const progressPercent = Math.min(100, Math.round((soldCount / raffle.totalTickets) * 100));

  const filteredTickets = tickets.filter(t => 
    t.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.formattedNumber.includes(searchTerm) ||
    t.dni.includes(searchTerm) ||
    t.verificationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="admin-panel-container" className="max-w-2xl mx-auto px-4 py-6 md:py-8">
      {/* Top back link */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="back-to-raffles-btn"
          onClick={onBackToOverview}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5563] hover:text-[#0F1115] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Mis rifas</span>
        </button>

        <span className="text-[11px] font-mono text-[#6B7280] tracking-wide">
          ADMIN PORTAL · MÓVIL
        </span>
      </div>

      {/* Main Raffle Card Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 shadow-xs mb-6">
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
              <div className="absolute right-0 mt-2 w-40 bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg py-1 z-20">
                <button
                  onClick={() => {
                    onToggleRaffleStatus(raffle.id);
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F5F5F3] flex items-center justify-between"
                >
                  <span>{raffle.status === 'activa' ? 'Cerrar Rifa' : 'Reactivar Rifa'}</span>
                  <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0F1115] font-['JetBrains_Mono']">
              {soldCount.toLocaleString()} / {raffle.totalTickets.toLocaleString()} tickets
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
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
              {soldCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              Vendidos
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
              {freeCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              Libres
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3 text-center">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[#059669] font-['JetBrains_Mono']">
              {raffle.currency}{totalRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              Recaudado
            </div>
          </div>
        </div>

        {/* Primary Action: + Registrar ticket */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            id="register-ticket-trigger-btn"
            onClick={onOpenRegisterModal}
            className="flex-1 py-3 px-5 bg-[#0F1115] hover:bg-[#23272F] text-white font-medium text-sm rounded-[10px] transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar ticket</span>
          </button>

          <button
            id="go-to-live-draw-btn"
            onClick={() => onGoToLiveDraw(raffle.id)}
            className="py-3 px-4 bg-white hover:bg-[#F5F5F3] text-[#0F1115] border border-[#E5E7EB] text-xs font-semibold rounded-[10px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            title="Abrir pantalla teatral de sorteo en vivo"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
            <span>Sorteo en vivo</span>
          </button>
        </div>
      </div>

      {/* Ticket List Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F1115] uppercase">
              Últimos registros
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              {filteredTickets.length} de {tickets.length} tickets registrados
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por número, nombre o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-[8px] text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
            />
          </div>
        </div>

        {/* Clean Ticket List (Exact Stripe/Fintech style) */}
        <div className="divide-y divide-[#E5E7EB]/80">
          {filteredTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              No se encontraron registros que coincidan con la búsqueda.
            </div>
          ) : (
            filteredTickets.slice(0, 10).map((ticket) => (
              <div
                key={ticket.id}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] rounded-[8px] transition-colors group"
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
                      DNI: {ticket.dni} · {ticket.verificationCode}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-[#6B7280]">
                    {ticket.timeFormatted}
                  </span>
                  
                  {/* Verified emerald badge */}
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]" title="Participación válida">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>

                  <button
                    onClick={() => onVerifyTicket(ticket)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#0F1115] transition-all cursor-pointer"
                    title="Ver detalle del ticket / QR"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredTickets.length > 10 && (
          <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-center">
            <span className="text-xs text-[#6B7280]">
              Mostrando los 10 registros más recientes
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
