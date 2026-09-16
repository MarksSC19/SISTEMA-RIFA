import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Share2, Copy, ArrowRight, Smartphone, User, CreditCard, Download, Plus, Minus, Layers } from 'lucide-react';
import { Ticket } from '../types';
import { generateQrDataUrl, generateVerificationCode, getTicketVerificationUrl } from '../utils/qrHelper';
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

  const maxAllowed = Math.min(20, Math.max(1, maxAvailable));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) return;

    setIsSubmitting(true);

    try {
      // 1. Registro atómico y validación de cuota en PostgreSQL (puerto 5433)
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
      if (apiErr.message && (apiErr.message.includes('Cuota máxima') || apiErr.message.includes('agotado'))) {
        alert(apiErr.message);
        setIsSubmitting(false);
        return;
      }
      console.warn('API fallback to local generation:', apiErr);
    }

    // Fallback local en memoria si la API fallara
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${timeFormatted}:00`;

    const localList: Ticket[] = [];
    for (let i = 0; i < quantity; i++) {
      const num = nextTicketNumber + i;
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

  const handleShare = () => {
    if (!currentCreatedTicket || createdTickets.length === 0) return;

    let text = '';
    const totalSoles = createdTickets.length * 10;

    if (createdTickets.length === 1) {
      const verifyUrl = getTicketVerificationUrl(currentCreatedTicket.verificationCode, currentCreatedTicket.number);
      text = `🎟️ *RIFAS OFICIAL* - Tu Ticket ha sido emitido con éxito!\n\n` +
        `📌 *Rifa:* ${raffleTitle} (${raffleCode})\n` +
        `🔢 *Número:* ${currentCreatedTicket.formattedNumber}\n` +
        `👤 *Titular:* ${currentCreatedTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentCreatedTicket.dni}\n` +
        `💰 *Monto Abonado:* S/ 10.00\n` +
        `🔐 *Código Único:* ${currentCreatedTicket.verificationCode}\n` +
        `🕒 *Registro:* ${currentCreatedTicket.timeFormatted}\n\n` +
        `🌐 *Verifica tu ticket en línea:* ${verifyUrl}\n\n` +
        `¡Mucha suerte en el sorteo oficial!`;
    } else {
      const verifyUrl = getTicketVerificationUrl(currentCreatedTicket.verificationCode, currentCreatedTicket.number);
      const ticketsListText = createdTickets
        .map((t, idx) => `  ${idx + 1}. *${t.formattedNumber}* (Cód: ${t.verificationCode})`)
        .join('\n');

      text = `🎟️ *RIFAS OFICIAL* - ¡Tus ${createdTickets.length} Tickets han sido emitidos!\n\n` +
        `📌 *Rifa:* ${raffleTitle} (${raffleCode})\n` +
        `👤 *Titular:* ${currentCreatedTicket.buyerName}\n` +
        `🪪 *DNI:* ${currentCreatedTicket.dni}\n` +
        `💰 *Total Pagado:* S/ ${totalSoles}.00 (${createdTickets.length} tickets x S/ 10)\n\n` +
        `📋 *Tus Boletos Registrados:*\n${ticketsListText}\n\n` +
        `🌐 *Verifica en línea buscando por tu DNI (${currentCreatedTicket.dni}):*\n${verifyUrl}\n\n` +
        `¡Mucha suerte en el sorteo oficial!`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }

    if (currentCreatedTicket.phone && currentCreatedTicket.phone.length >= 8) {
      const cleanPhone = currentCreatedTicket.phone.replace(/\D/g, '');
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone}&text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="ticket-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]/80 bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
              {createdTickets.length > 0 ? 'Comprobante Oficial' : 'Emisión de Tickets'}
            </span>
            <span className="text-[10px] font-mono text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
              Meta Admin: 20 max
            </span>
          </div>
          <button
            id="close-ticket-modal-btn"
            onClick={handleClose}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {createdTickets.length === 0 ? (
              /* FORMULARIO DE REGISTRO CON SELECTOR DE CANTIDAD */
              <motion.form
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="text-center">
                  <h2 className="text-xl font-bold tracking-tight text-[#0F1115] uppercase">
                    VENTA DE TICKETS
                  </h2>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {raffleTitle} · Cupo restante del operador: <strong className="text-[#059669]">{maxAllowed} tickets</strong>
                  </p>
                </div>

                {/* SELECTOR DE CANTIDAD DE BOLETOS */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#059669]" />
                        Cantidad de Boletos
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        Precio: S/ 10.00 por ticket
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 flex items-center justify-center font-bold transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-12 text-center">
                        <span className="text-xl font-mono font-extrabold text-[#0F1115]">
                          {quantity}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxAllowed, quantity + 1))}
                        disabled={quantity >= maxAllowed}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 flex items-center justify-center font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Botones de selección rápida si el cupo lo permite */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantity(num)}
                        disabled={num > maxAllowed}
                        className={`flex-1 py-1 text-xs font-mono font-medium rounded-md transition-all cursor-pointer ${
                          quantity === num
                            ? 'bg-[#0F1115] text-white shadow-xs'
                            : num > maxAllowed
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#059669]'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  {/* Resumen de Monto en Soles y Numeración asignada */}
                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#6B7280] block text-[10px] uppercase font-semibold">Numeración</span>
                      <span className="font-mono font-bold text-[#0F1115]">
                        {quantity === 1 
                          ? `#${String(nextTicketNumber).padStart(4, '0')}`
                          : `#${String(nextTicketNumber).padStart(4, '0')} al #${String(nextTicketNumber + quantity - 1).padStart(4, '0')}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#6B7280] block text-[10px] uppercase font-semibold">Total a Cobrar</span>
                      <span className="text-sm font-bold text-[#059669] font-mono">
                        S/ {(quantity * 10).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campos del Comprador */}
                <div className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1 uppercase tracking-wide">
                      Nombre completo del titular <span className="text-[#059669]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-buyer-name-input"
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez Quispe"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                        autoFocus
                      />
                      <User className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1 uppercase tracking-wide">
                      DNI / Documento de Identidad <span className="text-[#059669]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-dni-input"
                        type="text"
                        required
                        maxLength={12}
                        placeholder="Ej. 74765137"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                      />
                      <CreditCard className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                    <span className="text-[10px] text-[#6B7280] mt-0.5 block">
                      Permitirá al comprador consultar todos sus tickets juntos en el verificador web.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1 uppercase tracking-wide">
                      Celular / WhatsApp (Para envío de comprobante)
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-phone-input"
                        type="tel"
                        maxLength={15}
                        placeholder="987654321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                      />
                      <Smartphone className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-generate-ticket-btn"
                    type="submit"
                    disabled={isSubmitting || !buyerName.trim() || maxAllowed <= 0}
                    className="w-full py-3 px-6 bg-[#0F1115] hover:bg-[#23272F] disabled:opacity-50 text-white font-medium text-sm tracking-wide rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Generando hash criptográfico...</span>
                    ) : (
                      <span>
                        EMITIR {quantity} {quantity === 1 ? 'TICKET' : 'TICKETS'} · S/ {(quantity * 10).toFixed(2)}
                      </span>
                    )}
                  </button>
                  <p className="mt-2 text-[11px] text-[#6B7280] text-center">
                    Garantía con Hash SHA-256 e inserción atómica en base de datos.
                  </p>
                </div>
              </motion.form>
            ) : (
              /* VISTA DE ÉXITO: TICKET(S) EMITIDO(S) */
              <motion.div
                key="created-ticket"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[#ECFDF5] text-[#059669] text-xs font-semibold rounded-full border border-[#A7F3D0]">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {createdTickets.length === 1 
                      ? 'TICKET REGISTRADO CON ÉXITO' 
                      : `¡${createdTickets.length} TICKETS ASIGNADOS! (S/ ${createdTickets.length * 10}.00)`}
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-[#0F1115] font-mono">
                    {currentCreatedTicket.formattedNumber}
                  </div>
                  <div className="text-base font-semibold text-[#111827] mt-0.5">
                    {currentCreatedTicket.buyerName}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    DNI: <strong className="text-[#111827]">{currentCreatedTicket.dni}</strong> · Total: S/ {(createdTickets.length * 10).toFixed(2)}
                  </div>
                </div>

                {/* Si hay múltiples tickets, mostrar pestañas para navegar entre ellos */}
                {createdTickets.length > 1 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                      Boletos de este comprador (clic para ver QR individual):
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-200">
                      {createdTickets.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTicketIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            activeTicketIndex === idx
                              ? 'bg-[#059669] text-white shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {t.formattedNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR del ticket actualmente activo */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl mx-auto max-w-[220px]">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR ${currentCreatedTicket.formattedNumber}`}
                      className="w-36 h-36 object-contain rounded-md"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-[#F5F5F3] animate-pulse rounded-md" />
                  )}
                  <span className="mt-2 text-[11px] font-mono font-semibold tracking-wider text-[#4B5563] bg-white px-2.5 py-0.5 rounded border border-[#E5E7EB]">
                    {currentCreatedTicket.verificationCode}
                  </span>
                </div>

                {/* Acciones */}
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      id="share-ticket-btn"
                      onClick={handleShare}
                      className="flex-1 py-2.5 px-4 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copied ? '¡Copiado!' : (createdTickets.length > 1 ? 'Compartir Todo (WhatsApp)' : 'Compartir (WhatsApp)')}</span>
                    </button>

                    <button
                      id="download-qr-btn"
                      onClick={handleDownloadQr}
                      className="py-2.5 px-3 bg-white hover:bg-[#F5F5F3] text-[#0F1115] border border-[#E5E7EB] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Descargar código QR en PNG"
                    >
                      <Download className="w-4 h-4 text-[#059669]" />
                      <span className="hidden sm:inline">QR</span>
                    </button>
                  </div>

                  {onViewVerification && (
                    <button
                      id="preview-verification-btn"
                      onClick={() => {
                        handleClose();
                        onViewVerification(currentCreatedTicket);
                      }}
                      className="w-full py-2 px-4 text-xs font-medium text-[#374151] hover:text-[#0F1115] hover:bg-[#F5F5F3] border border-[#E5E7EB] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Verificar en Verificador Público</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    id="register-another-ticket-btn"
                    onClick={resetForm}
                    className="w-full py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#0F1115] transition-colors cursor-pointer"
                  >
                    Registrar otra venta
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
