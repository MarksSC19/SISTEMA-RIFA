import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  ArrowLeft, 
  Search, 
  ShieldCheck, 
  QrCode, 
  Share2, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Ticket, Raffle } from '../types';
import { generateQrDataUrl } from '../utils/qrHelper';

interface Props {
  ticket: Ticket;
  raffle: Raffle;
  allTickets: Ticket[];
  onBack: () => void;
  onSelectTicket?: (ticket: Ticket) => void;
}

export const TicketVerificationView: React.FC<Props> = ({
  ticket,
  raffle,
  allTickets,
  onBack,
  onSelectTicket,
}) => {
  const [currentTicket, setCurrentTicket] = useState<Ticket>(ticket);
  const [searchCode, setSearchCode] = useState('');
  const [searchError, setSearchError] = useState('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showQrExpanded, setShowQrExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  useEffect(() => {
    let isMounted = true;
    const loadQr = async () => {
      const url = await generateQrDataUrl(`https://rifas.pe/verify?code=${currentTicket.verificationCode}&ticket=${currentTicket.number}`);
      if (isMounted) setQrUrl(url);
    };
    loadQr();
    return () => { isMounted = false; };
  }, [currentTicket]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const query = searchCode.trim().toLowerCase();
    if (!query) return;

    const found = allTickets.find(
      t => t.verificationCode.toLowerCase() === query ||
           t.formattedNumber.toLowerCase() === query ||
           t.formattedNumber.replace('#', '') === query ||
           t.dni.includes(query)
    );

    if (found) {
      setCurrentTicket(found);
      if (onSelectTicket) onSelectTicket(found);
      setSearchCode('');
    } else {
      setSearchError('No se encontró ningún ticket con ese código o número.');
    }
  };

  const handleShare = () => {
    const shareText = `Verificación oficial de Ticket ${currentTicket.formattedNumber} (${raffle.title}): Código ${currentTicket.verificationCode}, titular ${currentTicket.buyerName}. Estado: Participación válida.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="verification-screen-container" className="min-h-screen bg-[#F5F5F3] text-[#0F1115] py-8 px-4 flex flex-col items-center justify-between">
      {/* Top minimal back button & switcher */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <button
          id="verification-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5563] hover:text-[#0F1115] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>

        <span className="text-[11px] font-mono text-[#6B7280] tracking-wider uppercase">
          VERIFICADOR PÚBLICO
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PANTALLA DE VERIFICACIÓN (DISEÑO EXACTO SOLICITADO)
          
                       ✓
                 TICKET VÁLIDO
                    #001
                 Juan Pérez
              Gran Rifa 2026
          ──────────────────────
          Estado
          ● Participación válida
          Código
          RF-82K7X91
          Registrado
          14 Sep 2026 · 14:32
          ──────────────────────
                 Rifa oficial
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        key={currentTicket.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-[10px] p-8 shadow-xs text-center space-y-6"
      >
        {/* ✓ (Emerald checkmark) */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] mx-auto">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>

        {/* TICKET VÁLIDO + Detalle */}
        <div className="space-y-1">
          <h1 className="text-sm font-bold tracking-widest text-[#059669] uppercase">
            TICKET VÁLIDO
          </h1>
          <div className="text-4xl font-extrabold tracking-tight text-[#0F1115] font-['JetBrains_Mono'] pt-1">
            {currentTicket.formattedNumber}
          </div>
          <div className="text-lg font-semibold text-[#111827]">
            {currentTicket.buyerName}
          </div>
          <div className="text-xs text-[#6B7280]">
            {raffle.title}
          </div>
        </div>

        {/* ────────────────────── Divider ────────────────────── */}
        <hr className="border-t border-[#E5E7EB]" />

        {/* Info Grid */}
        <div className="text-left space-y-4 text-xs">
          <div>
            <span className="block text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-0.5">
              Estado
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span>Participación válida</span>
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-0.5">
              Código
            </span>
            <span className="font-mono text-sm font-bold text-[#0F1115] tracking-wider bg-[#FAFAFA] px-2.5 py-1 rounded border border-[#E5E7EB] inline-block">
              {currentTicket.verificationCode}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-0.5">
              Registrado
            </span>
            <span className="font-mono text-xs text-[#374151]">
              {currentTicket.timestamp}
            </span>
          </div>
        </div>

        {/* ────────────────────── Divider ────────────────────── */}
        <hr className="border-t border-[#E5E7EB]" />

        {/* Rifa oficial Seal */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span>Rifa oficial</span>
        </div>

        {/* Optional QR View or Share button */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => setShowQrExpanded(!showQrExpanded)}
            className="px-3 py-1.5 text-[11px] font-medium text-[#374151] hover:text-[#0F1115] bg-[#F5F5F3] hover:bg-[#E5E7EB] rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQrExpanded ? 'Ocultar QR' : 'Ver código QR'}</span>
          </button>

          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-[11px] font-medium text-[#374151] hover:text-[#0F1115] bg-[#F5F5F3] hover:bg-[#E5E7EB] rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
          </button>
        </div>

        {showQrExpanded && qrUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-2"
          >
            <img src={qrUrl} alt="QR Code" className="w-36 h-36 mx-auto border border-[#E5E7EB] rounded-md p-1 bg-white" />
          </motion.div>
        )}
      </motion.div>

      {/* Manual lookup input for testing any ticket */}
      <div className="w-full max-w-sm mt-6">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Ingresar otro código o número (ej: #1247)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full pl-3.5 pr-9 py-2 text-xs bg-white border border-[#E5E7EB] rounded-[10px] text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669]"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 p-1 text-[#6B7280] hover:text-[#0F1115] cursor-pointer"
            title="Buscar ticket"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
        {searchError && (
          <p className="mt-1 text-[11px] text-[#DC2626] text-center">
            {searchError}
          </p>
        )}
      </div>

      <div className="mt-8 text-[11px] font-mono text-[#9CA3AF]">
        CERTIFICACIÓN DIGITAL SEGURA · RIFAS PLATFORM
      </div>
    </div>
  );
};
