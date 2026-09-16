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
  CheckCircle2, 
  Download, 
  Copy, 
  LogIn, 
  AlertTriangle,
  Ticket as TicketIcon,
  Layers
} from 'lucide-react';
import { Ticket, Raffle } from '../types';
import { generateQrDataUrl, getTicketVerificationUrl } from '../utils/qrHelper';
import api from '../services/api';

interface Props {
  ticket: Ticket;
  raffle: Raffle;
  allTickets: Ticket[];
  onBack: () => void;
  onSelectTicket?: (ticket: Ticket) => void;
  isPublicView?: boolean;
  onGoToLogin?: () => void;
}

interface BuyerTicketSummary {
  number: number;
  formattedNumber: string;
  ticketCode: string;
  issuedAt?: string;
}

export const TicketVerificationView: React.FC<Props> = ({
  ticket,
  raffle,
  allTickets,
  onBack,
  onSelectTicket,
  isPublicView,
  onGoToLogin,
}) => {
  const [currentTicket, setCurrentTicket] = useState<Ticket>(ticket);
  const [searchCode, setSearchCode] = useState('');
  const [searchError, setSearchError] = useState('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [buyerAllTickets, setBuyerAllTickets] = useState<BuyerTicketSummary[]>([]);

  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  // Cargar otros tickets del mismo comprador desde la lista local o servidor
  useEffect(() => {
    if (currentTicket && currentTicket.dni && currentTicket.dni !== 'No especificado') {
      const localMatches = allTickets
        .filter(t => t.dni === currentTicket.dni)
        .map(t => ({
          number: t.number,
          formattedNumber: t.formattedNumber,
          ticketCode: t.verificationCode,
          issuedAt: t.timestamp,
        }));

      if (localMatches.length > 0) {
        setBuyerAllTickets(localMatches);
      }
    }
  }, [currentTicket, allTickets]);

  // URL pública de verificación del ticket activo
  const publicVerificationUrl = getTicketVerificationUrl(
    currentTicket.verificationCode,
    currentTicket.number
  );

  useEffect(() => {
    let isMounted = true;
    const loadQr = async () => {
      const url = await generateQrDataUrl(publicVerificationUrl);
      if (isMounted) setQrUrl(url);
    };
    loadQr();
    return () => { isMounted = false; };
  }, [currentTicket, publicVerificationUrl]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const query = searchCode.trim().toLowerCase();
    if (!query) return;

    // 1. Intentar verificación en la API de producción en PostgreSQL (puerto 5433)
    try {
      const res = await api.verifyPublicTicket(query);
      if (res.valid && res.ticket) {
        const t = res.ticket;
        const mapped: Ticket = {
          id: `t-${t.number}`,
          number: t.number,
          formattedNumber: t.formattedNumber,
          raffleId: 'rf-024',
          buyerName: t.buyerName,
          dni: t.dni,
          phone: '***-***-***',
          timestamp: String(t.issuedAt),
          timeFormatted: new Date(t.issuedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          verificationCode: t.verificationCode,
          isValid: true,
          registeredBy: t.registeredBy,
        };
        setCurrentTicket(mapped);
        if (Array.isArray(res.buyerAllTickets) && res.buyerAllTickets.length > 0) {
          setBuyerAllTickets(res.buyerAllTickets);
        }
        if (onSelectTicket) onSelectTicket(mapped);
        setSearchCode('');
        return;
      }
    } catch {
      // Continuar con fallback en lista local
    }

    const found = allTickets.find(
      t => t.verificationCode.toLowerCase() === query ||
           t.formattedNumber.toLowerCase() === query ||
           t.formattedNumber.replace('#', '') === query ||
           t.dni.toLowerCase() === query
    );

    if (found) {
      setCurrentTicket(found);
      const matches = allTickets.filter(t => t.dni === found.dni).map(t => ({
        number: t.number,
        formattedNumber: t.formattedNumber,
        ticketCode: t.verificationCode,
        issuedAt: t.timestamp,
      }));
      setBuyerAllTickets(matches);
      if (onSelectTicket) onSelectTicket(found);
      setSearchCode('');
    } else {
      setSearchError('No se encontró ningún ticket con ese código, DNI o número en la base de datos oficial.');
    }
  };

  const handleSelectOtherBuyerTicket = (bt: BuyerTicketSummary) => {
    const matched = allTickets.find(t => t.number === bt.number || t.verificationCode === bt.ticketCode);
    if (matched) {
      setCurrentTicket(matched);
      if (onSelectTicket) onSelectTicket(matched);
    } else {
      setCurrentTicket({
        id: `t-${bt.number}`,
        number: bt.number,
        formattedNumber: bt.formattedNumber,
        raffleId: 'rf-024',
        buyerName: currentTicket.buyerName,
        dni: currentTicket.dni,
        phone: currentTicket.phone,
        timestamp: bt.issuedAt || currentTicket.timestamp,
        timeFormatted: currentTicket.timeFormatted,
        verificationCode: bt.ticketCode,
        isValid: true,
        registeredBy: currentTicket.registeredBy,
      });
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicVerificationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = () => {
    let shareText = '';
    if (buyerAllTickets.length > 1) {
      const ticketsList = buyerAllTickets
        .map((bt, idx) => `  ${idx + 1}. *${bt.formattedNumber}* (Cód: ${bt.ticketCode})`)
        .join('\n');

      shareText = `🎟️ *CERTIFICADO DE PARTICIPACIÓN OFICIAL*\n\n` +
        `📌 *Rifa:* ${raffle.title} (${raffle.code})\n` +
        `👤 *Titular:* ${currentTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentTicket.dni}\n` +
        `🎟️ *Total de Boletos Registrados:* ${buyerAllTickets.length}\n\n` +
        `*Detalle de Boletos:*\n${ticketsList}\n\n` +
        `🌐 *Verificar en línea por DNI:* ${publicVerificationUrl}\n\n` +
        `Estado: ● Participación Válida y Auténtica en la Red.`;
    } else {
      shareText = `🎟️ *CERTIFICADO DE TICKET OFICIAL*\n\n` +
        `📌 *Rifa:* ${raffle.title} (${raffle.code})\n` +
        `🔢 *Número:* ${currentTicket.formattedNumber}\n` +
        `👤 *Titular:* ${currentTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentTicket.dni}\n` +
        `🔐 *Hash SHA-256:* ${currentTicket.verificationCode}\n` +
        `🕒 *Fecha de Emisión:* ${currentTicket.timestamp}\n\n` +
        `🌐 *Verificar en línea:* ${publicVerificationUrl}\n\n` +
        `Estado: ● Participación Válida y Auténtica en la Red.`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `comprobante-ticket-${currentTicket.formattedNumber.replace('#', '')}-qr.png`;
    a.click();
  };

  return (
    <div id="verification-screen-container" className="min-h-screen bg-[#F5F5F3] text-[#0F1115] py-8 px-4 flex flex-col items-center justify-between font-['Geist',sans-serif]">
      {/* Top minimal bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          id="verification-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#0F1115] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isPublicView ? 'Inicio' : 'Volver al panel'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full uppercase">
            VERIFICADOR PÚBLICO OFICIAL
          </span>

          {onGoToLogin && (
            <button
              onClick={onGoToLogin}
              className="text-xs text-[#4B5563] hover:text-[#0F1115] hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* CERTIFICADO DIGITAL DE TICKET VÁLIDO CON QR REAL */}
      <motion.div
        key={currentTicket.id + currentTicket.verificationCode}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5"
      >
        {/* ✓ (Emerald checkmark) */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] mx-auto">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>

        {/* TICKET VÁLIDO + Detalle */}
        <div className="space-y-1">
          <h1 className="text-xs font-bold tracking-widest text-[#059669] uppercase">
            CERTIFICADO DE PARTICIPACIÓN VÁLIDA
          </h1>
          <div className="text-4xl font-extrabold tracking-tight text-[#0F1115] font-mono pt-1">
            {currentTicket.formattedNumber}
          </div>
          <div className="text-lg font-bold text-[#111827]">
            {currentTicket.buyerName}
          </div>
          <div className="text-xs text-[#6B7280]">
            {raffle.title} ({raffle.code})
          </div>
        </div>

        {/* CASUÍSTICA MULTI-TICKET: Si el comprador tiene múltiples tickets, listarlos */}
        {buyerAllTickets.length > 1 && (
          <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#166534] flex items-center gap-1.5 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-[#059669]" />
                {buyerAllTickets.length} Boletos a nombre de este titular
              </span>
              <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                S/ {buyerAllTickets.length * 10}.00 Total
              </span>
            </div>
            <p className="text-[11px] text-[#15803D]">
              Haga clic en cualquier número para ver su comprobante y código QR individual:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {buyerAllTickets.map((bt) => {
                const isCurrent = bt.number === currentTicket.number || bt.ticketCode === currentTicket.verificationCode;
                return (
                  <button
                    key={bt.number}
                    type="button"
                    onClick={() => handleSelectOtherBuyerTicket(bt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#059669] text-white shadow-xs'
                        : 'bg-white border border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7]'
                    }`}
                  >
                    {bt.formattedNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Código QR Real y Escaneable */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl mx-auto max-w-[260px] shadow-xs">
          {qrUrl ? (
            <img
              id="scannable-qr-image"
              src={qrUrl}
              alt={`QR Verificación ${currentTicket.formattedNumber}`}
              className="w-48 h-48 object-contain rounded-lg border border-white shadow-xs"
            />
          ) : (
            <div className="w-48 h-48 bg-[#F3F4F6] animate-pulse rounded-lg" />
          )}
          
          <span className="mt-2.5 text-xs font-mono font-bold tracking-widest text-[#0F1115] bg-white px-3 py-1 rounded-md border border-[#E5E7EB]">
            {currentTicket.verificationCode}
          </span>
          <span className="text-[10px] text-[#6B7280] mt-1 font-mono">
            Escanea con tu cámara móvil para validar
          </span>
        </div>

        {/* Info Grid */}
        <div className="text-left space-y-3 pt-2 text-xs border-t border-[#E5E7EB]">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
              Estado Oficial
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669]">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span>Participación Válida</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
              DNI del Titular
            </span>
            <span className="font-mono font-semibold text-[#0F1115]">
              {currentTicket.dni}
            </span>
          </div>

          {currentTicket.phone && (
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                Contacto
              </span>
              <span className="font-mono text-[#374151]">
                {currentTicket.phone}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
              Fecha de Emisión
            </span>
            <span className="font-mono text-[11px] text-[#374151]">
              {currentTicket.timestamp}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
              Emitido por
            </span>
            <span className="text-xs font-medium text-[#0F1115]">
              {currentTicket.registeredBy || 'Operador Oficial'}
            </span>
          </div>
        </div>

        {/* Public live URL display */}
        <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              Enlace de Validación Público
            </span>
            <button
              onClick={handleCopyLink}
              className="text-[10px] font-semibold text-[#059669] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <div className="text-[11px] font-mono text-[#374151] truncate select-all">
            {publicVerificationUrl}
          </div>
        </div>

        {/* Actions row */}
        <div className="pt-1 flex items-center justify-center gap-2">
          <button
            onClick={handleDownloadQr}
            className="flex-1 py-2 px-3 text-xs font-semibold text-[#0F1115] bg-[#F5F5F3] hover:bg-[#E5E7EB] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="Descargar imagen del código QR"
          >
            <Download className="w-3.5 h-3.5 text-[#059669]" />
            <span>Descargar QR</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedShare ? '¡Copiado!' : (buyerAllTickets.length > 1 ? 'Compartir Boletos' : 'Compartir')}</span>
          </button>
        </div>

        {/* Security Seal */}
        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-center gap-1.5 text-xs font-medium text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span>Validación Criptográfica Inmutable · SHA-256</span>
        </div>
      </motion.div>

      {/* Manual lookup input for testing any ticket or buyer DNI */}
      <div className="w-full max-w-md mt-6">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Buscar por DNI, N° de ticket (#0001) o Hash..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] shadow-xs"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#6B7280] hover:text-[#0F1115] cursor-pointer"
            title="Buscar ticket o DNI"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
        {searchError && (
          <p className="mt-1.5 text-xs text-rose-600 text-center font-medium">
            {searchError}
          </p>
        )}
      </div>

      <div className="mt-8 text-xs font-mono text-[#9CA3AF] text-center">
        RIFAS ENGINE VERIFIER · HASH PROTOCOL v2.4
      </div>
    </div>
  );
};
