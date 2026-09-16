import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Sparkles, DollarSign, Tag, FileText, Check } from 'lucide-react';
import { Prize, Raffle } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  raffles: Raffle[];
  selectedRaffleId?: string;
  prizeToEdit?: Prize | null;
  onSavePrize: (prize: Prize) => void;
}

export const PrizeManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  raffles,
  selectedRaffleId,
  prizeToEdit,
  onSavePrize,
}) => {
  const [raffleId, setRaffleId] = useState<string>('');
  const [order, setOrder] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Tecnología');
  const [link, setLink] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (prizeToEdit) {
      setRaffleId(prizeToEdit.raffleId);
      setOrder(prizeToEdit.order);
      setName(prizeToEdit.name);
      setDescription(prizeToEdit.description || '');
      setCategory(prizeToEdit.category || 'Tecnología');
      setLink(prizeToEdit.link || '');
    } else {
      setRaffleId(selectedRaffleId || (raffles[0] ? raffles[0].id : ''));
      setOrder(1);
      setName('');
      setDescription('');
      setCategory('Tecnología');
      setLink('');
    }
    setError('');
  }, [prizeToEdit, selectedRaffleId, raffles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del premio es obligatorio.');
      return;
    }
    if (!raffleId) {
      setError('Debe seleccionar una rifa para asociar el premio.');
      return;
    }

    const newPrize: Prize = {
      id: prizeToEdit ? prizeToEdit.id : `prz-${Date.now()}`,
      raffleId,
      order: Number(order) || 1,
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      link: link.trim() || undefined,
      isDrawn: prizeToEdit ? prizeToEdit.isDrawn : false,
      winnerTicket: prizeToEdit?.winnerTicket,
    };

    onSavePrize(newPrize);
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
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1115]">
                {prizeToEdit ? 'Editar Premio' : 'Nuevo Premio de Rifa'}
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Configure los premios que se sortearán ante el público
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Rifa Asignada */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Rifa Asociada *
            </label>
            <select
              value={raffleId}
              onChange={(e) => setRaffleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] cursor-pointer"
            >
              {raffles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.title} ({r.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Nombre y Orden */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Nombre del Premio *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Microondas, 1 tattoo grande..."
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                Posición / Orden *
              </label>
              <select
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] focus:outline-none focus:border-[#0F1115] cursor-pointer"
              >
                <option value={1}>1° Lugar</option>
                <option value={2}>2° Lugar</option>
                <option value={3}>3° Lugar</option>
                <option value={4}>4° Lugar</option>
                <option value={5}>5° Lugar</option>
                <option value={6}>6° Lugar</option>
                <option value={7}>7° Lugar</option>
                <option value={8}>8° Lugar</option>
                <option value={9}>9° Lugar</option>
                <option value={10}>10° Lugar</option>
              </select>
            </div>
          </div>

          {/* Enlace o Link Oficial del Premio */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Enlace de Referencia / Tienda / Instagram (URL)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.falabella.com.pe/... o https://instagram.com/..."
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Electrohogar, Arte & Tatuaje, Gastronomía, Belleza..."
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115]"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Descripción o Especificaciones
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalles del modelo, color, condiciones de entrega, garantía, etc."
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-[#0F1115] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F1115] resize-none"
            />
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
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F1115] hover:bg-[#23272F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{prizeToEdit ? 'Actualizar Premio' : 'Guardar Premio'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
