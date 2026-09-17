import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Share2, 
  ArrowRight, 
  Download, 
  Plus, 
  Minus, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Ticket as TicketIcon,
  Lock
} from 'lucide-react';
import { Ticket } from '../types';
import { generateQrDataUrl, generateVerificationCode, getTicketVerificationUrl } from '../utils/qrHelper';
import { AdminBooklet } from '../utils/ticketQuota';
import { formatPeruTime, formatPeruDateIso } from '../utils/peruDate';
import api from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nextTicketNumber: number;
  raffleTitle: string;
  raffleCode: string;
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketsCreated?: (tickets: Ticket[]) => void;
  onViewVerification?: (ticket: Ticket) => void;
  registeredByName?: string;
  maxAvailable?: number;
  adminBooklet?: AdminBooklet;
  availableNumbers?: number[];
}

export const TicketRegistrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  nextTicketNumber,
  raffleTitle,
  raffleCode,
  onTicketCreated,
  onTicketsCreated,
  onViewVerification,
  registeredByName,
  maxAvailable = 20,
  adminBooklet,
  availableNumbers = [],
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTickets, setCreatedTickets] = useState<Ticket[]>([]);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const effectiveAvailable = availableNumbers.length > 0 ? availableNumbers.length : maxAvailable;
  const maxAllowed = Math.min(20, Math.max(1, effectiveAvailable));

  // Ajustar cantidad si excede el cupo disponible
  useEffect(() => {
    if (quantity > maxAllowed) {
      setQuantity(maxAllowed);
    }
  }, [maxAllowed, quantity]);

  // Actualizar QR al cambiar el ticket seleccionado en la vista de éxito
  useEffect(() => {
    let isMounted = true;
    const updateQr = async () => {
      const activeTicket = createdTickets[activeTicketIndex];
      if (activeTicket) {
        const verifyPayload = getTicketVerificationUrl(activeTicket.verificationCode, activeTicket.number);
        const dataUrl = await generateQrDataUrl(verifyPayload);
        if (isMounted) setQrUrl(dataUrl);
      }
    };
    if (createdTickets.length > 0) {
      updateQr();
    }
    return () => { isMounted = false; };
  }, [createdTickets, activeTicketIndex]);

  const resetForm = () => {
    setBuyerName('');
    setDni('');
    setPhone('');
    setQuantity(1);
    setCreatedTickets([]);
    setActiveTicketIndex(0);
    setQrUrl('');
    setCopied(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Cálculo de los números exactos que se van a emitir en este lote
  const projectedNumbers = availableNumbers.length >= quantity
    ? availableNumbers.slice(0, quantity)
    : Array.from({ length: quantity }, (_, i) => nextTicketNumber + i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) return;

    setIsSubmitting(true);

    try {
      // 1. Registro atómico y validación de cuota en PostgreSQL con talonario preasignado
      const res = await api.createTicket({
        buyerName: buyerName.trim(),
        dni: dni.trim() || 'No especificado',
        phone: phone.trim() || 'No especificado',
        paymentMethod: 'efectivo',
        quantity: quantity,
      });

      const serverTickets = res.createdTickets || [res];

      const officialTickets: Ticket[] = serverTickets.map((st: any) => ({
        id: st.id || `t-${st.number}`,
        number: st.number,
        formattedNumber: st.formattedNumber,
        raffleId: 'rf-024',
        buyerName: st.buyerName,
        dni: st.dni,
        phone: st.phone,
        timestamp: String(st.timestamp),
        timeFormatted: st.timeFormatted || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        verificationCode: st.verificationCode,
        isValid: true,
        registeredBy: st.registeredBy || registeredByName || 'Administrador Autorizado',
      }));

      setCreatedTickets(officialTickets);
      setActiveTicketIndex(0);

      if (onTicketsCreated) {
        onTicketsCreated(officialTickets);
      } else if (onTicketCreated) {
        officialTickets.forEach(t => onTicketCreated(t));
      }

      setIsSubmitting(false);
      return;
    } catch (apiErr: any) {
      if (apiErr.message && (apiErr.message.includes('Talonario') || apiErr.message.includes('Cuota'))) {
        alert(apiErr.message);
        setIsSubmitting(false);
        return;
      }
      console.warn('API fallback to local generation:', apiErr);
    }

    // Fallback local con números preasignados del talonario
    const now = new Date();
    const timeFormatted = formatPeruTime(now);
    const dateFormatted = formatPeruDateIso(now);

    const localList: Ticket[] = [];
    for (let i = 0; i < quantity; i++) {
      const num = projectedNumbers[i];
      const vCode = generateVerificationCode(num);
      localList.push({
        id: `t-${num}`,
        number: num,
        formattedNumber: `#${String(num).padStart(4, '0')}`,
        raffleId: 'rf-024',
        buyerName: buyerName.trim(),
        dni: dni.trim() || 'No especificado',
        phone: phone.trim() || 'No especificado',
        timestamp: dateFormatted,
        timeFormatted,
        verificationCode: vCode,
        isValid: true,
        registeredBy: registeredByName || 'Administrador Autorizado',
      });
    }

    setCreatedTickets(localList);
    setActiveTicketIndex(0);

    if (onTicketsCreated) {
      onTicketsCreated(localList);
    } else if (onTicketCreated) {
      localList.forEach(t => onTicketCreated(t));
    }

    setIsSubmitting(false);
  };

  const currentCreatedTicket = createdTickets[activeTicketIndex] || createdTickets[0];

  const handleDownloadQr = () => {
    if (!qrUrl || !currentCreatedTicket) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `ticket-${currentCreatedTicket.formattedNumber.replace('#', '')}-qr.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!currentCreatedTicket || createdTickets.length === 0) return;

    const verifyUrl = getTicketVerificationUrl(currentCreatedTicket.verificationCode, currentCreatedTicket.number);
    const totalSoles = createdTickets.length * 10;
    const timeText = formatPeruTime(currentCreatedTicket.timestamp || new Date());

    let text = '';
    if (createdTickets.length === 1) {
      text = `🎟️ *RIFAS OFICIAL* - ¡Tu Ticket ha sido emitido con éxito!\n\n` +
        `📌 *Rifa:* ${raffleTitle} (${raffleCode})\n` +
        `🔢 *Número:* ${currentCreatedTicket.formattedNumber}\n` +
        `👤 *Titular:* ${currentCreatedTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentCreatedTicket.dni}\n` +
        `💰 *Monto Abonado:* S/ 10.00\n` +
        `🔐 *Código Único:* ${currentCreatedTicket.verificationCode}\n` +
        `🕒 *Registro (Hora Perú):* ${timeText}\n\n` +
        `🌐 *Verifica tu ticket en línea:* ${verifyUrl}\n\n` +
        `¡Mucha suerte en el sorteo oficial!`;
    } else {
      const ticketsListText = createdTickets
        .map((t, idx) => `  ${idx + 1}. *${t.formattedNumber}* (Cód: ${t.verificationCode})`)
        .join('\n');

      text = `🎟️ *RIFAS OFICIAL* - ¡Tus ${createdTickets.length} Tickets han sido emitidos!\n\n` +
        `📌 *Rifa:* ${raffleTitle} (${raffleCode})\n` +
        `👤 *Titular:* ${currentCreatedTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentCreatedTicket.dni}\n` +
        `💰 *Total Pagado:* S/ ${totalSoles}.00 (${createdTickets.length} tickets x S/ 10)\n` +
        `🕒 *Registro (Hora Perú):* ${timeText}\n\n` +
        `📋 *Tus Boletos Registrados:*\n${ticketsListText}\n\n` +
        `🌐 *Verifica en línea buscando por tu DNI (${currentCreatedTicket.dni}):*\n${verifyUrl}\n\n` +
        `¡Mucha suerte en el sorteo oficial!`;
    }

    // Compartir mediante Web Share API si el dispositivo lo soporta (móviles iOS y Android)
    if (navigator.share && qrUrl) {
      try {
        const fetchRes = await fetch(qrUrl);
        const blob = await fetchRes.blob();
        const qrFile = new File([blob], `ticket-${currentCreatedTicket.formattedNumber.replace('#', '')}-qr.png`, {
          type: 'image/png',
        });

        if (navigator.canShare && navigator.canShare({ files: [qrFile] })) {
          await navigator.share({
            title: `Boleto Oficial ${currentCreatedTicket.formattedNumber}`,
            text: text,
            files: [qrFile],
          });
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
          return;
        }
      } catch (err: any) {
        if (err && err.name === 'AbortError') return; // Usuario cerró el diálogo nativo
        console.warn('Web Share no disponible, usando fallback:', err);
      }
    }

    // Fallback: Descargar el QR automáticamente para tener la foto lista
    handleDownloadQr();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }

    if (currentCreatedTicket.phone && currentCreatedTicket.phone.length >= 8) {
      const cleanPhone = currentCreatedTicket.phone.replace(/\D/g, '');
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone}&text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="ticket-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0F1115]/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Cabecera Móvil Ergonómica */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
              {createdTickets.length > 0 ? 'Comprobante Oficial' : 'Emisión de Tickets'}
            </span>
            {adminBooklet && (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Talonario: {adminBooklet.label}
              </span>
            )}
          </div>
          <button
            id="close-ticket-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto grow">
          <AnimatePresence mode="wait">
            {createdTickets.length === 0 ? (
              /* FORMULARIO DE REGISTRO CON SELECTOR DE CANTIDAD */
              <motion.form
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="text-center">
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                    REGISTRAR VENTA
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {raffleTitle} · Boletos disponibles: <strong className="text-emerald-600 font-bold">{maxAllowed} de 20</strong>
                  </p>
                </div>

                {/* SELECTOR DE CANTIDAD DE BOLETOS */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        Cantidad de Boletos
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        S/ 10.00 por boleto
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-10 text-center">
                        <span className="text-xl font-mono font-black text-slate-900">
                          {quantity}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxAllowed, quantity + 1))}
                        disabled={quantity >= maxAllowed}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Botones de selección rápida */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantity(num)}
                        disabled={num > maxAllowed}
                        className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          quantity === num
                            ? 'bg-slate-900 text-white shadow-xs'
                            : num > maxAllowed
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  {/* Resumen de Monto en Soles y Numeración asignada */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        {quantity === 1 ? 'Boleto Asignado' : 'Boletos Asignados'}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {quantity === 1 
                          ? `#${String(projectedNumbers[0]).padStart(4, '0')}`
                          : `#${String(projectedNumbers[0]).padStart(4, '0')} al #${String(projectedNumbers[projectedNumbers.length - 1]).padStart(4, '0')}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Total a Cobrar</span>
                      <span className="text-sm font-extrabold text-emerald-600 font-mono">
                        S/ {(quantity * 10).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campos del Comprador */}
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Nombre completo del titular <span className="text-emerald-600">*</span>
                    </label>
                    <input
                      id="buyer-name-input"
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez Quispe"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                        DNI del titular <span className="text-emerald-600">*</span>
                      </label>
                      <input
                        id="buyer-dni-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="8 dígitos"
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                        WhatsApp / Celular
                      </label>
                      <input
                        id="buyer-phone-input"
                        type="tel"
                        inputMode="tel"
                        maxLength={9}
                        placeholder="9 dígitos"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-ticket-btn"
                    type="submit"
                    disabled={isSubmitting || !buyerName.trim() || effectiveAvailable === 0}
                    className="w-full h-12 bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <TicketIcon className="w-4 h-4 text-emerald-400" />
                        <span>Confirmar Venta (S/ {(quantity * 10).toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              /* VISTA DE ÉXITO ULTRA MODERNA Y ERGONÓMICA (MOBILE FIRST) */
              <motion.div
                key="created-ticket"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3.5"
              >
                {/* Badge Oficial de Éxito */}
                <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {createdTickets.length === 1 
                      ? 'TICKET REGISTRADO CON ÉXITO' 
                      : `¡${createdTickets.length} TICKETS REGISTRADOS! (S/ ${createdTickets.length * 10}.00)`}
                  </span>
                </div>

                {/* Número y Titular */}
                <div>
                  <div className="text-4xl font-black tracking-tight text-slate-900 font-mono">
                    {currentCreatedTicket.formattedNumber}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-800 mt-1 uppercase tracking-tight">
                    {currentCreatedTicket.buyerName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    DNI: <strong className="text-slate-800 font-semibold">{currentCreatedTicket.dni}</strong> · Total: S/ {(createdTickets.length * 10).toFixed(2)}
                  </div>
                </div>

                {/* Pestañas si son múltiples tickets */}
                {createdTickets.length > 1 && (
                  <div className="py-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Boletos de este comprador (toca para ver QR):
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {createdTickets.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTicketIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            activeTicketIndex === idx
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {t.formattedNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marco de QR Pasaporte Digital */}
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl mx-auto max-w-[210px] shadow-xs">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR ${currentCreatedTicket.formattedNumber}`}
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg" />
                  )}
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-mono font-bold tracking-wider text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>{currentCreatedTicket.verificationCode}</span>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN REDISEÑADOS (MODERNOS & ERGONÓMICOS) */}
                <div className="space-y-2.5 pt-1">
                  {/* Botón Principal: WhatsApp Oficial */}
                  <button
                    id="share-ticket-btn"
                    onClick={handleShare}
                    className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-bold text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>{copied ? '¡Texto Copiado!' : (createdTickets.length > 1 ? 'Compartir Todo (WhatsApp)' : 'Compartir (WhatsApp)')}</span>
                  </button>

                  {/* Fila Secundaria: Descargar QR y Verificar Certificado */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="download-qr-btn"
                      onClick={handleDownloadQr}
                      className="h-11 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Descargar código QR en PNG"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Descargar QR</span>
                    </button>

                    {onViewVerification && (
                      <button
                        id="preview-verification-btn"
                        onClick={() => {
                          handleClose();
                          onViewVerification(currentCreatedTicket);
                        }}
                        className="h-11 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Verificar Ticket</span>
                      </button>
                    )}
                  </div>

                  {/* Botón Registrar Otra Venta */}
                  <button
                    id="register-another-ticket-btn"
                    onClick={resetForm}
                    className="w-full h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar otra venta</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
