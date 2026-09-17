import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Edit2, User, CreditCard, Phone, Check } from 'lucide-react';
import { Ticket } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSaveTicket: (updatedTicket: Ticket) => Promise<void> | void;
}

export const TicketEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  ticket,
  onSaveTicket,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (ticket) {
      setBuyerName(ticket.buyerName);
      setDni(ticket.dni);
      setPhone(ticket.phone || '');
    }
    setError('');
    setIsSubmitting(false);
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      setError('El nombre del comprador es obligatorio.');
      return;
    }
    if (!dni.trim() || dni.trim().length < 8) {
      setError('El DNI o documento de identidad debe tener al menos 8 dígitos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updated: Ticket = {
        ...ticket,
        buyerName: buyerName.trim(),
        dni: dni.trim(),
        phone: phone.trim(),
      };

      await onSaveTicket(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios en la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/60 backdrop-blur-xs font-['Geist',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F1115] text-[#10B981] flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1115]">
                Editar Boleto {ticket.formattedNumber}
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Código de verificación: {ticket.verificationCode}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Nombre Completo del Comprador *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nombre y Apellidos"
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] font-medium focus:outline-none focus:border-[#0F1115] disabled:opacity-60 transition-all"
              />
            </div>
          </div>

          {/* DNI */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              DNI / Documento de Identidad (8 Dígitos) *
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                inputMode="numeric"
                required
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                placeholder="8 dígitos"
                maxLength={8}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115] disabled:opacity-60 transition-all"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Teléfono / WhatsApp (Opcional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9 dígitos"
                maxLength={9}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115] disabled:opacity-60 transition-all"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              id="save-ticket-edit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
              )}
              <span>{isSubmitting ? 'Guardando en BD...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
