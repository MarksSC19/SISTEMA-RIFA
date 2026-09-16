import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Share2, Copy, ArrowRight, Smartphone, User, CreditCard, Download } from 'lucide-react';
import { Ticket } from '../types';
import { generateQrDataUrl, generateVerificationCode, getTicketVerificationUrl } from '../utils/qrHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nextTicketNumber: number;
  raffleTitle: string;
  raffleCode: string;
  onTicketCreated: (ticket: Ticket) => void;
  onViewVerification?: (ticket: Ticket) => void;
  registeredByName?: string;
}

export const TicketRegistrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  nextTicketNumber,
  raffleTitle,
  raffleCode,
  onTicketCreated,
  onViewVerification,
  registeredByName,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Formatted assigned number
  const assignedFormatted = `# ${String(nextTicketNumber).padStart(3, '0')}`;

  const resetForm = () => {
    setBuyerName('');
    setDni('');
    setPhone('');
    setCreatedTicket(null);
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

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${timeFormatted}:00`;
    const vCode = generateVerificationCode(nextTicketNumber);

    const newTicket: Ticket = {
      id: `t-${nextTicketNumber}`,
      number: nextTicketNumber,
      formattedNumber: `#${String(nextTicketNumber).padStart(3, '0')}`,
      raffleId: 'rf-024',
      buyerName: buyerName.trim(),
      dni: dni.trim() || 'No especificado',
      phone: phone.trim() || 'No especificado',
      timestamp: dateFormatted,
      timeFormatted,
      verificationCode: vCode,
      isValid: true,
      registeredBy: registeredByName || 'Administrador Autorizado',
    };

    // Generate real, fully valid QR code encoding active verification URL
    const verifyPayload = getTicketVerificationUrl(vCode, nextTicketNumber);
    const qrData = await generateQrDataUrl(verifyPayload);

    setQrUrl(qrData);
    setCreatedTicket(newTicket);
    onTicketCreated(newTicket);
    setIsSubmitting(false);
  };

  const handleDownloadQr = () => {
    if (!qrUrl || !createdTicket) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `ticket-${createdTicket.formattedNumber.replace('#', '')}-qr.png`;
    a.click();
  };

  const handleShare = () => {
    if (!createdTicket) return;
    const verifyUrl = getTicketVerificationUrl(createdTicket.verificationCode, createdTicket.number);
    const text = `🎟️ *RIFAS OFICIAL* - Tu Ticket ha sido emitido con éxito!\n\n` +
      `📌 *Rifa:* ${raffleTitle} (${raffleCode})\n` +
      `🔢 *Número:* ${createdTicket.formattedNumber}\n` +
      `👤 *Titular:* ${createdTicket.buyerName}\n` +
      `🪪 *DNI:* ${createdTicket.dni}\n` +
      `🔐 *Código Único:* ${createdTicket.verificationCode}\n` +
      `🕒 *Registro:* ${createdTicket.timeFormatted}\n\n` +
      `🌐 *Verifica tu ticket en línea:* ${verifyUrl}\n\n` +
      `¡Mucha suerte en el sorteo oficial!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }

    if (createdTicket.phone && createdTicket.phone.length >= 8) {
      const cleanPhone = createdTicket.phone.replace(/\D/g, '');
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
        className="w-full max-w-md bg-[#FFFFFF] rounded-[10px] border border-[#E5E7EB] shadow-xl overflow-hidden"
      >
        {/* Top minimal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]/80 bg-[#FAFAFA]">
          <span className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
            {createdTicket ? 'Comprobante Oficial' : 'Registro Móvil'}
          </span>
          <button
            id="close-ticket-modal-btn"
            onClick={handleClose}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!createdTicket ? (
              /* SCREEN 3: REGISTRO DE TICKET (Formulario ultra limpio) */
              <motion.form
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6 text-center"
              >
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#0F1115] uppercase">
                    NUEVO TICKET
                  </h2>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {raffleTitle} · {raffleCode}
                  </p>
                </div>

                {/* Número asignado destacado */}
                <div className="py-3 px-4 bg-[#F5F5F3] rounded-[10px] border border-[#E5E7EB]/70">
                  <span className="block text-xs font-medium text-[#6B7280] tracking-wide uppercase">
                    Número asignado
                  </span>
                  <span className="block text-3xl font-bold tracking-tight text-[#0F1115] font-['JetBrains_Mono'] mt-0.5">
                    {assignedFormatted}
                  </span>
                </div>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1.5 uppercase tracking-wide">
                      Nombre completo <span className="text-[#059669]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-buyer-name-input"
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-[10px] text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                        autoFocus
                      />
                      <User className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1.5 uppercase tracking-wide">
                      DNI / Identificación
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-dni-input"
                        type="text"
                        maxLength={12}
                        placeholder="12345678"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-['JetBrains_Mono'] bg-white border border-[#E5E7EB] rounded-[10px] text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                      />
                      <CreditCard className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B5563] mb-1.5 uppercase tracking-wide">
                      Celular / WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        id="ticket-phone-input"
                        type="tel"
                        maxLength={15}
                        placeholder="987654321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-['JetBrains_Mono'] bg-white border border-[#E5E7EB] rounded-[10px] text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-all"
                      />
                      <Smartphone className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-3" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-generate-ticket-btn"
                    type="submit"
                    disabled={isSubmitting || !buyerName.trim()}
                    className="w-full py-3 px-6 bg-[#0F1115] hover:bg-[#23272F] disabled:opacity-50 text-white font-medium text-sm tracking-wide rounded-[10px] transition-all duration-150 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Generando hash...</span>
                    ) : (
                      <span>GENERAR TICKET</span>
                    )}
                  </button>
                  <p className="mt-2 text-[11px] text-[#6B7280]">
                    Asignación instantánea con código criptográfico único.
                  </p>
                </div>
              </motion.form>
            ) : (
              /* SCREEN 3 (DESPUÉS DE GENERARLO): TICKET CREADO */
              <motion.div
                key="created-ticket"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5"
              >
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[#ECFDF5] text-[#059669] text-xs font-semibold rounded-full border border-[#A7F3D0]">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>TICKET CREADO</span>
                </div>

                <div>
                  <div className="text-4xl font-extrabold tracking-tight text-[#0F1115] font-['JetBrains_Mono']">
                    {createdTicket.formattedNumber}
                  </div>
                  <div className="text-base font-medium text-[#111827] mt-1">
                    {createdTicket.buyerName}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    DNI: {createdTicket.dni}
                  </div>
                </div>

                {/* QR como elemento protagonista */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] mx-auto max-w-[240px]">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR ${createdTicket.formattedNumber}`}
                      className="w-44 h-44 object-contain rounded-md"
                    />
                  ) : (
                    <div className="w-44 h-44 bg-[#F5F5F3] animate-pulse rounded-md" />
                  )}
                  <span className="mt-2 text-xs font-mono font-medium tracking-widest text-[#4B5563] bg-white px-2.5 py-0.5 rounded border border-[#E5E7EB]">
                    {createdTicket.verificationCode}
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
                      <span>{copied ? '¡Copiado!' : 'Compartir (WhatsApp)'}</span>
                    </button>

                    <button
                      id="download-qr-btn"
                      onClick={handleDownloadQr}
                      className="py-2.5 px-3 bg-white hover:bg-[#F5F5F3] text-[#0F1115] border border-[#E5E7EB] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Descargar código QR en PNG"
                    >
                      <Download className="w-4 h-4 text-[#059669]" />
                      <span className="hidden sm:inline">Descargar</span>
                    </button>
                  </div>

                  {onViewVerification && (
                    <button
                      id="preview-verification-btn"
                      onClick={() => {
                        handleClose();
                        onViewVerification(createdTicket);
                      }}
                      className="w-full py-2.5 px-4 text-xs font-medium text-[#374151] hover:text-[#0F1115] hover:bg-[#F5F5F3] border border-[#E5E7EB] rounded-[10px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Verificar comprobante oficial</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    id="register-another-ticket-btn"
                    onClick={resetForm}
                    className="w-full py-2 text-xs font-medium text-[#6B7280] hover:text-[#0F1115] transition-colors cursor-pointer"
                  >
                    Registrar otro ticket
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
