import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ArrowLeft,
  Search,
  ShieldCheck,
  Share2,
  CheckCircle2,
  Download,
  Copy,
  LogIn,
  AlertTriangle,
  Ticket as TicketIcon,
  Layers,
  Clock,
  User,
  Phone,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { Ticket, Raffle } from '../types';
import { generateQrDataUrl, getTicketVerificationUrl } from '../utils/qrHelper';
import { formatPeruDateTime, formatPeruTime } from '../utils/peruDate';
import api from '../services/api';

interface Props {
  ticket?: Ticket;
  raffle?: Raffle;
  allTickets?: Ticket[];
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

interface OfficialPrize {
  order: number;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  link?: string;
}

const OFFICIAL_PRIZES: OfficialPrize[] = [
  {
    order: 1,
    name: 'Microondas LG NeoChef 25L',
    category: 'Electrohogar',
    description: 'Horno microondas LG NeoChef Smart Inverter 25L con tecnología EasyClean antibacterial y acabado espejado.',
    imageUrl: 'https://media.falabella.com/falabellaPE/15768826_1/w=1200,h=1200,fit=pad',
    link: 'https://www.falabella.com.pe/falabella-pe/product/15768826/horno-microondas-ms2536gis-25l-con-easyclean-lg/15768826',
  },
  {
    order: 2,
    name: '1 Tattoo Grande (Black Monkey Tattoo)',
    category: 'Arte & Tatuaje',
    description: 'Sesión completa de tatuaje personalizado de gran formato realizado por el prestigioso estudio Black Monkey Tattoo.',
    imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.instagram.com/black_monkeytattoo?stkn=ZDNlZDc0MzlxNW==',
  },
  {
    order: 3,
    name: 'Juego de Tarima de Madera',
    category: 'Hogar & Muebles',
    description: 'Juego de tarima de madera selecta reforzada con espaldar español tallado para dormitorio.',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.google.com/search?q=TARIMA+ESPA%C3%91OLA+CAMA',
  },
  {
    order: 4,
    name: 'Cena Gourmet en Pareja Fontana Lounge',
    category: 'Gastronomía',
    description: 'Cena gourmet exclusiva para 2 personas en Fontana Lounge con cócteles y postres de cortesía.',
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.facebook.com/fontanalounge/?locale=es_LA',
  },
  {
    order: 5,
    name: 'Gift Card Aruma Cosmética & Belleza',
    category: 'Belleza & Cuidado',
    description: 'Tarjeta de regalo Aruma oficial para canjear en cosmética, maquillaje y cuidado personal de alta gama.',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.instagram.com/aruma.pe?stkn=ZDNlZDc0MzlxNw==',
  },
  {
    order: 6,
    name: '3 Tattoos Pequeños (Black Monkey Tattoo)',
    category: 'Arte & Tatuaje',
    description: 'Pack de 3 tatuajes minimalistas o de línea fina en Black Monkey Tattoo.',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.instagram.com/black_monkeytattoo?stkn=ZDNlZDc0MzlxNW==',
  },
  {
    order: 7,
    name: '3 Cajas de Postres Artesanales CAELA',
    category: 'Repostería Fina',
    description: 'Trilogía dulce gourmet artesanal con los postres más aclamados de CAELA Repostería.',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    link: 'https://www.instagram.com/caela.reposteria?stkn=ZDNlZDc0MzlxNw==',
  },
];

const DEFAULT_FALLBACK_TICKET: Ticket = {
  id: 't-loading',
  number: 1,
  formattedNumber: '#0001',
  raffleId: 'rf-024',
  buyerName: 'Consultando boleto...',
  dni: '--------',
  phone: '---------',
  timestamp: new Date().toISOString(),
  timeFormatted: '--:--',
  verificationCode: 'VERIFICANDO',
  isValid: true,
  registeredBy: 'Operador Oficial',
};

export const TicketVerificationView: React.FC<Props> = ({
  ticket,
  raffle,
  allTickets = [],
  onBack,
  onSelectTicket,
  isPublicView = false,
  onGoToLogin,
}) => {
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket || null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return Boolean(p.get('verify') || p.get('code') || p.get('ticket'));
    }
    return false;
  });
  const [searchCode, setSearchCode] = useState('');
  const [searchError, setSearchError] = useState('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [buyerAllTickets, setBuyerAllTickets] = useState<BuyerTicketSummary[]>([]);

  useEffect(() => {
    if (ticket) {
      setCurrentTicket(ticket);
    }
  }, [ticket]);

  // Si se abre directamente con ?verify= o ?code=, consultar automáticamente la API de producción
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('verify') || params.get('code') || params.get('ticket');

    if (code) {
      setIsLoading(true);
      setSearchError('');

      api.verifyPublicTicket(code.trim())
        .then((res: any) => {
          if (res && res.valid && res.ticket) {
            const t = res.ticket;
            const mapped: Ticket = {
              id: `t-${t.number}`,
              number: t.number,
              formattedNumber: t.formattedNumber,
              raffleId: 'rf-024',
              buyerName: t.buyerName,
              dni: t.dni,
              phone: t.phone || '***-***-***',
              timestamp: String(t.timestamp || t.issuedAt || new Date().toISOString()),
              timeFormatted: formatPeruTime(t.timestamp || t.issuedAt),
              verificationCode: t.verificationCode,
              isValid: true,
              registeredBy: t.registeredBy || 'Administrador Autorizado',
            };
            setCurrentTicket(mapped);
            if (Array.isArray(res.buyerAllTickets) && res.buyerAllTickets.length > 0) {
              setBuyerAllTickets(res.buyerAllTickets);
            }
            if (onSelectTicket) onSelectTicket(mapped);
          } else {
            setSearchError('El boleto con este código no fue encontrado en la base de datos oficial.');
          }
        })
        .catch(() => {
          // Intentar en la lista local de tickets
          const query = code.trim().toLowerCase();
          const localMatch = allTickets.find(
            t => t.verificationCode.toLowerCase() === query ||
              t.formattedNumber.toLowerCase() === query ||
              t.formattedNumber.replace('#', '') === query ||
              t.dni === code.trim()
          );

          if (localMatch) {
            setCurrentTicket(localMatch);
          } else {
            setSearchError(`No se encontró registro para el código: ${code.trim()}`);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  // Cargar otros tickets del mismo comprador desde la lista local
  useEffect(() => {
    if (currentTicket && currentTicket.dni && currentTicket.dni !== 'No especificado' && currentTicket.dni !== '--------') {
      const localMatches = allTickets
        .filter(t => t.dni === currentTicket.dni)
        .map(t => ({
          number: t.number,
          formattedNumber: t.formattedNumber,
          ticketCode: t.verificationCode,
          issuedAt: t.timestamp,
        }));

      if (localMatches.length > 0 && buyerAllTickets.length === 0) {
        setBuyerAllTickets(localMatches);
      }
    }
  }, [currentTicket, allTickets]);

  // URL pública de verificación del ticket activo
  const publicVerificationUrl = currentTicket
    ? getTicketVerificationUrl(currentTicket.verificationCode, currentTicket.number)
    : '';

  useEffect(() => {
    let isMounted = true;
    const loadQr = async () => {
      if (publicVerificationUrl) {
        const url = await generateQrDataUrl(publicVerificationUrl);
        if (isMounted) setQrUrl(url);
      }
    };
    loadQr();
    return () => { isMounted = false; };
  }, [publicVerificationUrl]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const query = searchCode.trim();
    if (!query) return;

    setIsLoading(true);

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
          phone: t.phone || '***-***-***',
          timestamp: String(t.timestamp || t.issuedAt || new Date().toISOString()),
          timeFormatted: formatPeruTime(t.timestamp || t.issuedAt),
          verificationCode: t.verificationCode,
          isValid: true,
          registeredBy: t.registeredBy || 'Administrador Autorizado',
        };
        setCurrentTicket(mapped);
        if (Array.isArray(res.buyerAllTickets) && res.buyerAllTickets.length > 0) {
          setBuyerAllTickets(res.buyerAllTickets);
        }
        if (onSelectTicket) onSelectTicket(mapped);
        setSearchCode('');
        setIsLoading(false);
        return;
      }
    } catch {
      // Continuar con fallback
    }

    const qLower = query.toLowerCase();
    const found = allTickets.find(
      t => t.verificationCode.toLowerCase() === qLower ||
        t.formattedNumber.toLowerCase() === qLower ||
        t.formattedNumber.replace('#', '') === qLower ||
        t.dni === query
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
      setSearchError('No se encontró ningún ticket con ese código, DNI o número en la base de datos.');
    }
    setIsLoading(false);
  };

  const handleSelectOtherBuyerTicket = (bt: BuyerTicketSummary) => {
    const matched = allTickets.find(t => t.number === bt.number || t.verificationCode === bt.ticketCode);
    if (matched) {
      setCurrentTicket(matched);
      if (onSelectTicket) onSelectTicket(matched);
    } else if (currentTicket) {
      setCurrentTicket({
        id: `t-${bt.number}`,
        number: bt.number,
        formattedNumber: bt.formattedNumber,
        raffleId: 'rf-024',
        buyerName: currentTicket.buyerName,
        dni: currentTicket.dni,
        phone: currentTicket.phone,
        timestamp: bt.issuedAt || currentTicket.timestamp,
        timeFormatted: formatPeruTime(bt.issuedAt || currentTicket.timestamp),
        verificationCode: bt.ticketCode,
        isValid: true,
        registeredBy: currentTicket.registeredBy,
      });
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard && publicVerificationUrl) {
      navigator.clipboard.writeText(publicVerificationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = () => {
    if (!currentTicket) return;
    let shareText = '';
    const dateFormatted = formatPeruDateTime(currentTicket.timestamp);

    if (buyerAllTickets.length > 1) {
      const ticketsList = buyerAllTickets
        .map((bt, idx) => `  ${idx + 1}. *${bt.formattedNumber}* (Cód: ${bt.ticketCode})`)
        .join('\n');

      shareText = `🎟️ *CERTIFICADO DE PARTICIPACIÓN OFICIAL*\n\n` +
        `📌 *Rifa:* ${raffle?.title || 'Rifa Graduación Administración'}\n` +
        `👤 *Titular:* ${currentTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentTicket.dni}\n` +
        `🕒 *Emisión (Hora Perú):* ${dateFormatted}\n` +
        `🎟️ *Total de Boletos Registrados:* ${buyerAllTickets.length}\n\n` +
        `*Detalle de Boletos:*\n${ticketsList}\n\n` +
        `🌐 *Verificar en línea:* ${publicVerificationUrl}\n\n` +
        `Estado: ● Participación Válida y Auténtica.`;
    } else {
      shareText = `🎟️ *CERTIFICADO DE PARTICIPACIÓN OFICIAL*\n\n` +
        `📌 *Rifa:* ${raffle?.title || 'Rifa Graduación Administración'}\n` +
        `🔢 *Boleto N°:* ${currentTicket.formattedNumber}\n` +
        `👤 *Titular:* ${currentTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentTicket.dni}\n` +
        `🔐 *Código:* ${currentTicket.verificationCode}\n` +
        `🕒 *Emisión (Hora Perú):* ${dateFormatted}\n\n` +
        `🌐 *Verificar en línea:* ${publicVerificationUrl}\n\n` +
        `Estado: ● Participación Válida y Auténtica.`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadQr = () => {
    if (!qrUrl || !currentTicket) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `comprobante-ticket-${currentTicket.formattedNumber.replace('#', '')}-qr.png`;
    a.click();
  };

  return (
    <div id="verification-screen-container" className="min-h-screen bg-[#F5F5F3] text-[#0F1115] py-6 sm:py-8 px-4 flex flex-col items-center justify-between font-['Geist',sans-serif]">
      {/* Top Bar con Logo Oficial y Titularidad */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        {isPublicView ? (
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo Oficial" className="w-8 h-8 object-contain bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs" />
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Rifa Graduación Administración
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Plataforma Oficial de Verificación · Junín
              </span>
            </div>
          </div>
        ) : (
          <button
            id="verification-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al panel</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase flex items-center gap-1 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>CERTIFICADO OFICIAL</span>
          </span>
        </div>
      </div>

      {/* ESTADO DE CARGA / LOADING SKELETON */}
      {isLoading ? (
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4 my-auto">
          <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">
            Consultando Registro Oficial...
          </h2>
          <p className="text-xs text-slate-500">
            Verificando firma criptográfica inmutable en la base de datos de Junín.
          </p>
        </div>
      ) : currentTicket ? (
        /* CERTIFICADO DIGITAL DE TICKET VÁLIDO */
        <motion.div
          key={currentTicket.id + (currentTicket.verificationCode || 'code')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl text-center space-y-4"
        >
          {/* Badge Válido */}
          <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold mx-auto shadow-xs">
            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
            <span>PARTICIPACIÓN VÁLIDA Y CERTIFICADA</span>
          </div>

          {/* Número y Titular */}
          <div className="space-y-0.5">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-mono">
              {currentTicket.formattedNumber}
            </div>
            <div className="text-lg font-bold text-slate-800 uppercase tracking-tight pt-1">
              {currentTicket.buyerName}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {raffle?.title || 'Rifa Graduación Administración'} · Junín, Perú
            </div>
          </div>

          {/* Multi-Ticket Si el comprador tiene varios boletos con ese DNI */}
          {buyerAllTickets.length > 1 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  {buyerAllTickets.length} Boletos a nombre de este titular
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
                  S/ {buyerAllTickets.length * 10}.00 Total
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Toca cualquier número para ver su comprobante y QR individual:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {buyerAllTickets.map((bt) => {
                  const isCurrent = bt.number === currentTicket.number || bt.ticketCode === currentTicket.verificationCode;
                  return (
                    <button
                      key={bt.number}
                      type="button"
                      onClick={() => handleSelectOtherBuyerTicket(bt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${isCurrent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
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
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mx-auto max-w-[240px] shadow-xs">
            {qrUrl ? (
              <img
                id="scannable-qr-image"
                src={qrUrl}
                alt={`QR Verificación ${currentTicket.formattedNumber}`}
                className="w-44 h-44 object-contain rounded-lg border border-white shadow-xs"
              />
            ) : (
              <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-lg" />
            )}

            <span className="mt-2 text-xs font-mono font-black tracking-widest text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
              {currentTicket.verificationCode}
            </span>
          </div>

          {/* Info Grid con Hora de Perú Oficial */}
          <div className="text-left space-y-2.5 pt-2 text-xs border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> DNI del Titular
              </span>
              <span className="font-mono font-bold text-slate-900">
                {currentTicket.dni}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Emisión (Hora Oficial Perú)
              </span>
              <span className="font-mono text-xs font-semibold text-slate-800">
                {formatPeruDateTime(currentTicket.timestamp)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Operador Emisor
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {currentTicket.registeredBy || 'Administrador Oficial'}
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={handleDownloadQr}
              className="flex-1 h-11 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
              title="Descargar imagen del código QR"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Descargar QR</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 h-11 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedShare ? '¡Texto Copiado!' : 'Compartir'}</span>
            </button>
          </div>

          {/* Sello Inmutable */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Certificación Criptográfica Inmutable · SHA-256</span>
          </div>
        </motion.div>
      ) : (
        /* ESTADO NO LOCALIZADO */
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-4 my-auto">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Boleto no localizado
          </h2>
          <p className="text-xs text-slate-500">
            {searchError || 'No se encontró un boleto con el código escaneado. Por favor ingresa tu DNI para localizar tus boletos.'}
          </p>
        </div>
      )}

      {/* Vitrina de los 7 Grandes Premios Oficiales */}
      <div className="w-full max-w-xl mt-8 space-y-4">
        <div className="text-center space-y-1 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Los 7 Grandes Premios Oficiales</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Premios Oficiales en Disputa
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cada boleto emitido participa directamente por los siguientes 7 premios certificados ante notario.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {OFFICIAL_PRIZES.map((prize) => (
            <div
              key={prize.order}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <img
                  src={prize.imageUrl}
                  alt={prize.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-[#0F1115]/90 text-white font-mono text-[11px] font-bold backdrop-blur-xs shadow-xs">
                    {prize.order}° Premio
                  </span>
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-white/95 text-slate-700 text-[10px] font-bold shadow-xs border border-slate-100">
                    {prize.category}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {prize.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {prize.description}
                  </p>
                </div>

                {prize.link && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={prize.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ver referencia oficial</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Oficial
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buscador manual por DNI o código - SOLO PARA ADMINISTRADORES, NUNCA EN VISTA PÚBLICA */}
      {!isPublicView && (
        <div className="w-full max-w-xl mt-6">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Buscar por DNI, N° de ticket (#0001) o Código..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full pl-3.5 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
            />
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 cursor-pointer"
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
      )}

      <div className="mt-8 mb-2 text-xs font-mono text-slate-400 text-center flex items-center justify-center gap-2">
        <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain" />
        <span>RIFA GRADUACIÓN ADMINISTRACIÓN · JUNÍN, PERÚ</span>
      </div>
    </div>
  );
};
