import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Ticket, Calendar, DollarSign, Users, Check, FileText } from 'lucide-react';
import { Raffle, AdminUser, RaffleStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  raffleToEdit?: Raffle | null;
  onSaveRaffle: (raffle: Raffle) => void;
}

export const RaffleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  admins,
  raffleToEdit,
  onSaveRaffle,
}) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState('10');
  const [totalTickets, setTotalTickets] = useState('1000');
  const [drawDate, setDrawDate] = useState('');
  const [currency, setCurrency] = useState('S/');
  const [assignedAdmin, setAssignedAdmin] = useState('');
  const [status, setStatus] = useState<RaffleStatus>('activa');
  const [error, setError] = useState('');

  useEffect(() => {
    if (raffleToEdit) {
      setCode(raffleToEdit.code);
      setTitle(raffleToEdit.title);
      setDescription(raffleToEdit.description);
      setTicketPrice(String(raffleToEdit.ticketPrice));
      setTotalTickets(String(raffleToEdit.totalTickets));
      setDrawDate(raffleToEdit.drawDate);
      setCurrency(raffleToEdit.currency || 'S/');
      setAssignedAdmin(raffleToEdit.assignedAdmin);
      setStatus(raffleToEdit.status);
    } else {
      const randomNum = Math.floor(Math.random() * 90) + 25;
      setCode(`#0${randomNum}`);
      setTitle('');
      setDescription('');
      setTicketPrice('10');
      setTotalTickets('2000');
      
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const day = String(future.getDate()).padStart(2, '0');
      const month = String(future.getMonth() + 1).padStart(2, '0');
      setDrawDate(`${day}/${month}/${future.getFullYear()} 20:00:00`);
      
      setCurrency('S/');
      setAssignedAdmin(admins[0]?.name || 'Coordinación General');
      setStatus('activa');
    }
    setError('');
  }, [raffleToEdit, isOpen, admins]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título de la rifa es obligatorio.');
      return;
    }
    if (!code.trim()) {
      setError('El código de la rifa es obligatorio.');
      return;
    }
    const priceNum = parseFloat(ticketPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('El precio del ticket debe ser un número mayor a 0.');
      return;
    }
    const totalNum = parseInt(totalTickets, 10);
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('El total de tickets emitibles debe ser mayor a 0.');
      return;
    }

    const savedRaffle: Raffle = {
      id: raffleToEdit ? raffleToEdit.id : `rf-${Date.now().toString(36)}`,
      code: code.trim().startsWith('#') ? code.trim() : `#${code.trim()}`,
      title: title.trim(),
      description: description.trim() || 'Campaña oficial de recaudación y premios.',
      status,
      ticketPrice: priceNum,
      totalTickets: totalNum,
      soldTickets: raffleToEdit ? raffleToEdit.soldTickets : 0,
      drawDate: drawDate.trim() || '01/12/2026 20:00:00',
      currency: currency.trim() || 'S/',
      assignedAdmin: assignedAdmin.trim() || 'Coordinación General',
      prizes: raffleToEdit?.prizes,
      winner: raffleToEdit?.winner,
    };

    onSaveRaffle(savedRaffle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/60 backdrop-blur-xs font-['Geist',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F1115] text-[#10B981] flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1115]">
                {raffleToEdit ? 'Editar Rifa' : 'Nueva Rifa'}
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Configure los parámetros, emisión y fechas de la campaña
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#0F1115] hover:bg-[#E5E7EB]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Código y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Código de Rifa *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="#025"
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono font-bold text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Estado *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RaffleStatus)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] font-medium focus:outline-none focus:border-[#0F1115] cursor-pointer"
              >
                <option value="activa">● Activa (En venta)</option>
                <option value="sorteo">● En Sorteo</option>
                <option value="cerrada">● Cerrada</option>
                <option value="borrador">● Borrador</option>
              </select>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
              Título de la Rifa *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Gran Rifa Solidaria 2026"
              className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] font-semibold focus:outline-none focus:border-[#0F1115]"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
              Descripción o Causa
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Objetivo benéfico, premios principales o detalles de la actividad..."
              className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] resize-none"
            />
          </div>

          {/* Precio y Total Tickets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Precio Ticket (S/) *
              </label>
              <input
                type="number"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                min="1"
                step="0.5"
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono font-bold text-[#059669] focus:outline-none focus:border-[#0F1115]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Total Tickets Emitibles *
              </label>
              <input
                type="number"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                min="10"
                step="50"
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>
          </div>

          {/* Fecha del Sorteo y Administrador Asignado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Fecha del Sorteo *
              </label>
              <input
                type="text"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                placeholder="DD/MM/AAAA HH:MM:SS"
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl font-mono text-[#0F1115] focus:outline-none focus:border-[#0F1115]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1">
                Admin Responsable
              </label>
              <select
                value={assignedAdmin}
                onChange={(e) => setAssignedAdmin(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] cursor-pointer"
              >
                {admins.map((adm) => (
                  <option key={adm.id} value={adm.name}>
                    {adm.name} ({adm.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#0F1115] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="save-raffle-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{raffleToEdit ? 'Actualizar Rifa' : 'Crear Rifa'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
