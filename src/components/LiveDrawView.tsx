import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  Trophy, 
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Timer,
  AlertTriangle,
  Eye,
  Lock
} from 'lucide-react';
import { Raffle, Ticket, Prize } from '../types';
import { soundFx } from '../utils/audioHelper';
import api from '../services/api';

interface Props {
  raffle: Raffle;
  tickets: Ticket[];
  prizes?: Prize[];
  initialPrizeId?: string;
  onBack: () => void;
  onWinnerSelected?: (ticket: Ticket, prize?: Prize) => void;
  onViewVerification?: (ticket: Ticket) => void;
  onResetPrizes?: () => void;
}

// Formateo consistente de 4 dígitos para toda la plataforma (#0001 a #0600)
const formatTicketNumber = (num: number): string => String(num).padStart(4, '0');
const formatDisplayDigits = (num: number): string => formatTicketNumber(num).split('').join(' ');

export const LiveDrawView: React.FC<Props> = ({
  raffle,
  tickets,
  prizes = [],
  initialPrizeId,
  onBack,
  onWinnerSelected,
  onViewVerification,
  onResetPrizes,
}) => {
  // Filter prizes for this raffle
  const rafflePrizes = prizes.length > 0 ? prizes : (raffle.prizes || []);

  // Selected prize state
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    if (initialPrizeId && rafflePrizes.some(p => p.id === initialPrizeId)) {
      return initialPrizeId;
    }
    const firstPending = rafflePrizes.find(p => !p.isDrawn);
    return firstPending?.id || (rafflePrizes[0]?.id ?? '');
  });

  // Keep selected prize in sync if initialPrizeId changes
  useEffect(() => {
    if (initialPrizeId && rafflePrizes.some(p => p.id === initialPrizeId)) {
      setSelectedPrizeId(initialPrizeId);
    }
  }, [initialPrizeId, raffle.id]);

  const activePrize = rafflePrizes.find(p => p.id === selectedPrizeId) || rafflePrizes[0];

  // Configuración de tiempo de giro elegible por el Superadmin (3s, 5s, 8s, 10s, 15s)
  const [spinDuration, setSpinDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rifas_spin_duration');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([3, 5, 8, 10, 15].includes(parsed)) return parsed;
      }
    } catch {}
    return 5; // 5 segundos por defecto
  });

  // Modal de confirmación oficial antes del sorteo
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Modo de ejecución: 'oficial' (asienta en BD) o 'prueba' (simulacro sin alterar BD)
  const [drawExecutionMode, setDrawExecutionMode] = useState<'oficial' | 'prueba'>('oficial');
  const [isLastDrawTest, setIsLastDrawTest] = useState(false);

  // Draw states: 'idle' | 'spinning' | 'decelerating' | 'stopped' | 'winner'
  const [drawState, setDrawState] = useState<'idle' | 'spinning' | 'decelerating' | 'stopped' | 'winner'>('idle');
  // En reposo (idle) inicia siempre con guiones neutros, nunca con un número arbitrario
  const [currentDisplayNumber, setCurrentDisplayNumber] = useState<string>('- - - -');
  const [currentCandidate, setCurrentCandidate] = useState<Ticket | null>(null);
  const [winnerTicket, setWinnerTicket] = useState<Ticket | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [drawId, setDrawId] = useState('DRAW-024-83K2');
  const [drawTimestamp, setDrawTimestamp] = useState('16/09/2026 · 21:00:00');

  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lista de IDs o números de tickets que ya han ganado OTRO premio en esta rifa para no repetir
  const wonTicketIds = new Set(
    rafflePrizes
      .filter(p => p.isDrawn && p.id !== activePrize?.id && (p.winnerTicketId || (p as any).winnerTicket?.ticketNumber))
      .map(p => p.winnerTicketId || (p as any).winnerTicket?.ticketNumber)
  );

  // Tickets elegibles: ÚNICAMENTE boletos válidos y vendidos existentes que aún no ganaron otro premio
  const eligibleTickets = tickets.filter(t => 
    t.isValid !== false && 
    !wonTicketIds.has(t.id) && 
    !wonTicketIds.has(t.formattedNumber) &&
    !wonTicketIds.has(String(t.number))
  );

  // Sincronizar display con el premio activo: si ya fue sorteado muestra su ganador; si está libre muestra guiones de espera
  useEffect(() => {
    if (activePrize?.isDrawn) {
      const winnerTicketId = activePrize.winnerTicketId || (activePrize as any).winnerTicket?.ticketNumber;
      const found = tickets.find(t => t.id === winnerTicketId || t.formattedNumber === winnerTicketId || t.number === Number(winnerTicketId?.replace('#', '')));
      if (found) {
        setWinnerTicket(found);
        setCurrentCandidate(found);
        setCurrentDisplayNumber(formatDisplayDigits(found.number));
        setIsLastDrawTest(false);
        setDrawState('winner');
        return;
      }
    }
    setDrawState('idle');
    setWinnerTicket(null);
    setCurrentCandidate(null);
    setIsLastDrawTest(false);
    // En espera neutra, NO inventar números ni mostrar ningún boleto particular
    setCurrentDisplayNumber('- - - -');
  }, [selectedPrizeId, tickets.length, rafflePrizes]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#FFFFFF', '#F59E0B', '#FBBF24'],
        ticks: 320,
      });
    } catch {
      // safe fallback
    }
  };

  const startDraw = async (mode: 'oficial' | 'prueba' = drawExecutionMode) => {
    if (eligibleTickets.length === 0) {
      alert('⚠️ No hay boletos vendidos disponibles para sortear este premio. Todos los boletos han sido premiados o no se han registrado ventas.');
      return;
    }

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);

    const isTest = mode === 'prueba';
    setIsLastDrawTest(isTest);
    setDrawState('spinning');
    setWinnerTicket(null);

    // 1. Obtener ganador: si es oficial llama al backend CSPRNG; si es prueba selecciona de boletos reales sin alterar BD
    let targetCandidate: Ticket;
    if (isTest) {
      // En modo prueba: selección aleatoria de boletos vendidos reales sin invocar endpoint ni bloquear premio
      targetCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
    } else {
      // En modo oficial: llamada oficial a PostgreSQL
      try {
        if (activePrize) {
          const res = await api.executeDraw(activePrize.id, true);
          if (res?.winner) {
            const found = eligibleTickets.find(t => t.id === res.winner.ticketId || t.number === res.winner.number) ||
                          tickets.find(t => t.id === res.winner.ticketId || t.number === res.winner.number);
            targetCandidate = found || {
              id: res.winner.ticketId,
              raffleId: raffle.id,
              number: res.winner.number,
              formattedNumber: res.winner.formattedNumber || `#${formatTicketNumber(res.winner.number)}`,
              verificationCode: res.winner.verificationCode,
              buyerName: res.winner.buyerName,
              dni: res.winner.dni,
              phone: res.winner.phone,
              status: 'pagado',
              isValid: true,
              purchaseDate: new Date().toISOString(),
              registeredBy: res.winner.registeredBy || 'Administrador Oficial',
              paymentMethod: 'yape',
            };
          } else {
            targetCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
          }
        } else {
          targetCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
        }
      } catch (err) {
        console.warn('[LiveDraw] Ejecutando sorteo sobre tickets reales vendidos en memoria:', err);
        targetCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
      }
    }

    if (!targetCandidate && eligibleTickets.length > 0) {
      targetCandidate = eligibleTickets[0];
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setDrawTimestamp(`${dateStr} · ${timeStr}`);
    setDrawId(isTest ? `TEST-SIM-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : `DRAW-${raffle.code.replace('#', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);

    // Configuración de tiempos de animación según la duración seleccionada por el Superadmin
    const totalDurationMs = spinDuration * 1000;
    const fastDurationMs = Math.round(totalDurationMs * 0.65);
    const startTime = Date.now();

    const runSpinStep = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < fastDurationMs) {
        // FASE 1: Giro rápido pasando ÚNICA Y EXCLUSIVAMENTE boletos vendidos existentes
        const randomCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
        setCurrentDisplayNumber(formatDisplayDigits(randomCandidate.number));
        setCurrentCandidate(randomCandidate);
        if (soundEnabled) {
          soundFx.playTick(520 + Math.floor(Math.random() * 100));
        }
        animationTimerRef.current = setTimeout(runSpinStep, 45);
      } else if (elapsed < totalDurationMs - 120) {
        // FASE 2: Desaceleración progresiva
        setDrawState('decelerating');
        const decelProgress = (elapsed - fastDurationMs) / (totalDurationMs - fastDurationMs);
        const delay = Math.round(55 + Math.pow(decelProgress, 2.2) * 450); // de 55ms a ~500ms

        const randomCandidate = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
        setCurrentDisplayNumber(formatDisplayDigits(randomCandidate.number));
        setCurrentCandidate(randomCandidate);
        if (soundEnabled) {
          soundFx.playTick(450 - Math.round(decelProgress * 150));
        }
        animationTimerRef.current = setTimeout(runSpinStep, delay);
      } else {
        // FASE 3: FRENADO EXACTO EN EL BOLETO GANADOR (STOPPED)
        // La ruleta se detiene de forma definitiva y visual en el número del ganador
        const finalPadded = formatDisplayDigits(targetCandidate.number);
        setCurrentDisplayNumber(finalPadded);
        setCurrentCandidate(targetCandidate);
        setWinnerTicket(targetCandidate);
        setDrawState('stopped');

        if (soundEnabled) {
          soundFx.playWin();
        }
        triggerConfetti();

        // Tras 2.2 segundos con los tambores celebrando el número exacto, mostrar la tarjeta de proclamación
        stopTimeoutRef.current = setTimeout(() => {
          setDrawState('winner');
          // Solo si es sorteo oficial, notificar la adjudicación en base de datos
          if (!isTest && onWinnerSelected) {
            onWinnerSelected(targetCandidate, activePrize);
          }
        }, 2200);
      }
    };

    runSpinStep();
  };

  // Pending prizes: prizes in this raffle that have not been drawn yet
  const pendingPrizes = rafflePrizes.filter(p => p.id !== activePrize?.id && !p.isDrawn);

  // Find next logical prize in sequence
  const nextPendingPrize = 
    pendingPrizes.find(p => p.order > (activePrize?.order || 0)) ||
    pendingPrizes.find(p => p.order < (activePrize?.order || 0)) ||
    pendingPrizes[0];

  const isAllPrizesDrawn = rafflePrizes.length > 0 && rafflePrizes.every(p => p.isDrawn || p.id === activePrize?.id);

  const handleDrawNextPrize = () => {
    if (nextPendingPrize) {
      setSelectedPrizeId(nextPendingPrize.id);
      setDrawState('idle');
      setWinnerTicket(null);
      setCurrentCandidate(null);
      setCurrentDisplayNumber('- - - -');
    }
  };

  // Helper functions to prevent duplicate position prefixes
  const getCleanPrizeName = (name: string = '') => {
    return name.replace(/^\d+[°º]?\s*(?:er|to|do|ro)?\s*(?:Lugar:?|Puesto:?)?\s*/i, '').trim();
  };

  const getPrizeFullLabel = (prize?: Prize) => {
    if (!prize) return 'Premio Oficial';
    const cleanName = getCleanPrizeName(prize.name);
    return `${prize.order}° Lugar: ${cleanName}`;
  };

  // Digits formatted for 4-drum tumbler cards
  const rawDigits = (currentDisplayNumber || '- - - -')
    .replace(/\s+/g, '')
    .padStart(4, '-')
    .slice(-4)
    .split('');

  return (
    <div id="live-draw-container" className="relative h-screen max-h-screen w-full bg-[#07090E] text-[#FFFFFF] flex flex-col justify-between selection:bg-[#059669] selection:text-white font-['Geist',sans-serif] overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          THEATRICAL STAGE ATMOSPHERE & LIGHTING LAYERS
          ───────────────────────────────────────────────────────────── */}
      {/* 1. Top Spotlight Beam from ceiling */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-teal-500/10 to-transparent pointer-events-none blur-3xl" />

      {/* 2. Ambient Auras */}
      <div className="absolute top-1/4 -left-48 w-[450px] h-[450px] bg-emerald-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-48 w-[450px] h-[450px] bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* 3. Center Stage Backlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-emerald-500/15 via-slate-800/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* 4. Subtle Geometric Tech Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        }}
      />

      {/* Top minimal control bar */}
      <div className="w-full px-6 py-3.5 flex items-center justify-between relative z-20">
        <button
          id="live-draw-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Volver al panel</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer backdrop-blur-md"
            title={soundEnabled ? 'Silenciar efectos' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          <span className="text-[11px] font-mono tracking-widest text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/30 uppercase font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CERTIFICADO EN VIVO · CSPRNG</span>
          </span>
        </div>
      </div>

      {/* Main Sorteo Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-1 max-w-4xl mx-auto w-full text-center relative z-10">
        {/* PRIZE SELECTION MODULE & SUPERADMIN DURATION CONTROLS (Top compact bar during idle) */}
        {rafflePrizes.length > 0 && drawState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mb-2 bg-[#121622]/90 border border-white/15 rounded-2xl p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            {/* Fila 1: Premio en disputa + badges de estado */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider font-mono shrink-0">
                  PREMIO:
                </span>
                <div className="relative flex-1 min-w-0">
                  <select
                    id="live-draw-prize-select"
                    value={activePrize?.id || ''}
                    onChange={(e) => setSelectedPrizeId(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-[#0A0D14]/90 border border-white/15 text-white rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none truncate"
                  >
                    {rafflePrizes.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0A0D14] text-white py-1">
                        {getPrizeFullLabel(p)} {p.isDrawn ? '✓ (SORTEADO)' : '• (PENDIENTE)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 font-semibold">
                  {rafflePrizes.filter(p => p.isDrawn).length}/{rafflePrizes.length} sorteados
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30 font-semibold">
                  {eligibleTickets.length} boletos en juego
                </span>
              </div>
            </div>

            {/* Fila 2: Selector de tiempo de giro limpio y horizontal */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold shrink-0">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium text-gray-300">Duración de Giro:</span>
              </div>

              <div className="flex items-center gap-1 bg-[#0A0D14] p-0.5 rounded-lg border border-white/10">
                {[
                  { secs: 3, label: '3s', desc: 'Rápido' },
                  { secs: 5, label: '5s', desc: 'Normal' },
                  { secs: 8, label: '8s', desc: 'Emoción' },
                  { secs: 10, label: '10s', desc: 'Suspenso' },
                  { secs: 15, label: '15s', desc: 'Épico' },
                ].map(({ secs, label, desc }) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => {
                      setSpinDuration(secs);
                      try { localStorage.setItem('rifas_spin_duration', String(secs)); } catch {}
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      spinDuration === secs
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={`Duración: ${secs}s (${desc})`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] opacity-70 hidden sm:inline">({desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {activePrize?.description && (
              <div className="mt-2 text-left px-2.5 py-1 bg-white/[0.02] border border-white/5 rounded-lg text-[11px] text-gray-400 flex items-center justify-between truncate">
                <span className="truncate">{activePrize.description}</span>
                {activePrize.link && (
                  <a
                    href={activePrize.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-[10px] font-medium ml-2 shrink-0 underline"
                  >
                    <span>Ver enlace</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {drawState !== 'winner' ? (
            /* ─────────────────────────────────────────────────────────────
                PANTALLA DE SORTEO EN VIVO / TAMBORES GIRATORIOS
                ───────────────────────────────────────────────────────────── */
            <motion.div
              key="draw-stage"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-3"
            >
              {/* Header: GRAN RIFA / SORTEO EN VIVO */}
              <div className="space-y-1">
                <h2 className="text-xs md:text-sm font-semibold tracking-widest text-emerald-400/90 uppercase font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {raffle.title}
                </h2>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  SORTEO EN VIVO
                </h1>

                {/* Banner Premio Activo: visible durante el sorteo */}
                {activePrize && drawState !== 'idle' ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    <span>EN DISPUTA: {getPrizeFullLabel(activePrize)}</span>
                  </div>
                ) : null}
              </div>

              {/* Central Tumbling Display: Digit Cards sobre Podio Iluminado */}
              <div className="py-2 my-1 relative">
                {/* Luminous Floor Podium Halo directly beneath the digit cards */}
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] max-w-[500px] h-14 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${
                  drawState === 'stopped' 
                    ? 'bg-amber-400/40 scale-125' 
                    : 'bg-emerald-500/25'
                }`} />

                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 relative z-10">
                  {rawDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`relative w-14 sm:w-20 md:w-28 h-20 sm:h-28 md:h-36 rounded-2xl flex items-center justify-center bg-gradient-to-b from-[#1C2230] via-[#121622] to-[#0A0D14] border-2 ${
                        drawState === 'stopped'
                          ? 'border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.8)] scale-110 bg-gradient-to-b from-[#2A2415] via-[#1A1812] to-[#0A0D14]'
                          : drawState === 'spinning'
                          ? 'border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-105'
                          : drawState === 'decelerating'
                          ? 'border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.4)] scale-102'
                          : 'border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.9)]'
                      } overflow-hidden transition-all duration-200 select-none`}
                    >
                      {/* Glossy top glass highlight */}
                      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                      {/* Horizontal drum seam line */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/70 border-b border-white/10 pointer-events-none" />
                      
                      {/* Numerals with high-impact glow */}
                      <span className={`font-mono text-3xl sm:text-4xl md:text-6xl font-black ${
                        drawState === 'stopped'
                          ? 'text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.9)] animate-pulse'
                          : drawState === 'spinning'
                          ? 'text-emerald-300 drop-shadow-[0_0_40px_rgba(16,185,129,0.85)]'
                          : drawState === 'decelerating'
                          ? 'text-amber-200 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]'
                          : digit === '-'
                          ? 'text-white/25 font-light'
                          : 'text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)]'
                      }`}>
                        {digit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status bar y participante real pasando */}
                <div className="mt-3 text-xs font-mono tracking-widest uppercase">
                  {drawState === 'stopped' ? (
                    <div className="space-y-1 animate-bounce">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 font-extrabold text-xs sm:text-sm shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>¡BOLETO GANADOR #{winnerTicket ? formatTicketNumber(winnerTicket.number) : rawDigits.join('')}!</span>
                      </div>
                      {currentCandidate && (
                        <p className="text-[11px] text-gray-200 font-bold tracking-normal normal-case">
                          Participante: <span className="text-white underline">{currentCandidate.buyerName}</span> (DNI {currentCandidate.dni})
                        </p>
                      )}
                    </div>
                  ) : drawState === 'spinning' ? (
                    <div className="space-y-1">
                      <span className="text-emerald-400 animate-pulse font-bold drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] block">
                        ── MEZCLANDO BOLETOS VENDIDOS EXISTENTES ──
                      </span>
                      {currentCandidate && (
                        <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-white/5 rounded-full border border-white/10 text-[11px] text-gray-300 tracking-normal normal-case">
                          <span className="font-mono text-emerald-400 font-bold">#{formatTicketNumber(currentCandidate.number)}</span>
                          <span className="text-gray-400">·</span>
                          <span className="truncate max-w-[260px] text-white font-medium">{currentCandidate.buyerName}</span>
                        </div>
                      )}
                    </div>
                  ) : drawState === 'decelerating' ? (
                    <div className="space-y-1">
                      <span className="text-amber-400 font-bold animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.5)] block">
                        ── FRENANDO EN EL GANADOR OFICIAL ──
                      </span>
                      {currentCandidate && (
                        <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/30 text-[11px] text-amber-200 tracking-normal normal-case">
                          <span className="font-mono font-bold">#{formatTicketNumber(currentCandidate.number)}</span>
                          <span>·</span>
                          <span className="truncate max-w-[260px] font-medium">{currentCandidate.buyerName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-emerald-400/90 font-mono font-semibold block text-[11px]">
                        ── SISTEMA OFICIAL CSPRNG · LISTO PARA EL SORTEO EN VIVO ──
                      </span>
                      <span className="text-[10px] text-gray-400 font-sans tracking-normal normal-case">
                        {eligibleTickets.length > 0 
                          ? `Participan únicamente los ${eligibleTickets.length} boletos válidos vendidos de la rifa.`
                          : 'No hay boletos vendidos disponibles para este sorteo.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Iniciar sorteo con botón y modal oficial */}
              <div className="pt-1">
                {drawState === 'idle' ? (
                  eligibleTickets.length === 0 ? (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-center space-y-0.5 max-w-md mx-auto">
                      <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Sin boletos vendidos disponibles</span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        Todos los boletos ya han sido premiados o aún no se han registrado ventas en la rifa.
                      </p>
                    </div>
                  ) : (
                    <button
                      id="start-live-draw-trigger-btn"
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="relative group px-10 sm:px-14 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm tracking-widest uppercase rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_45px_rgba(16,185,129,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 mx-auto border border-emerald-300/40"
                    >
                      <Trophy className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>EJECUTAR SORTEO OFICIAL ({spinDuration}s)</span>
                      <Sparkles className="w-4 h-4 text-emerald-100 animate-pulse" />
                    </button>
                  )
                ) : (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-xs font-mono text-emerald-300 animate-pulse font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      {drawState === 'stopped' ? '¡Adjudicando premio oficial...!' : `Girando ruleta (${spinDuration}s)...`}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
                PANTALLA DE GANADOR (UNIFIED SLEEK CELEBRATION CARD)
                ───────────────────────────────────────────────────────────── */
            <motion.div
              key="winner-stage"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg mx-auto my-auto"
            >
              {/* Ambient Radial Aura */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/25 via-teal-400/20 to-emerald-500/25 rounded-3xl blur-xl pointer-events-none" />

              {/* Single Unified Card Surface */}
              <div className="relative bg-[#0F131C] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                {/* Trophy & Prize Header */}
                <div className="flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-md ${
                    isLastDrawTest 
                      ? 'bg-amber-500/20 border border-amber-400/40 shadow-amber-500/10'
                      : 'bg-gradient-to-b from-amber-400/20 to-amber-500/10 border border-amber-400/40 shadow-amber-500/10'
                  }`}>
                    <Trophy className={`w-6 h-6 ${isLastDrawTest ? 'text-amber-300' : 'text-amber-400'} drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]`} />
                  </div>
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-0.5 rounded-full ${
                    isLastDrawTest
                      ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                      : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                  }`}>
                    {isLastDrawTest ? '🧪 SIMULACRO DE PRUEBA (EL PREMIO SIGUE LIBRE)' : 'PREMIO ADJUDICADO OFICIALMENTE'}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1 max-w-md">
                    {getPrizeFullLabel(activePrize)}
                  </h2>
                </div>

                {/* Ticket Ganador: NÚMERO Y DATOS 100% IDÉNTICOS A LA RULETA */}
                <div className="my-3 py-3 px-4 bg-white/[0.03] rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase block">
                    NÚMERO DE TICKET GANADOR
                  </span>
                  <div className="text-5xl sm:text-6xl font-black font-['JetBrains_Mono'] tracking-tight text-white my-1 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    {winnerTicket ? `#${formatTicketNumber(winnerTicket.number)}` : `#${rawDigits.join('')}`}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {winnerTicket?.buyerName || (currentCandidate?.buyerName ?? 'Ganador Oficial')}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Participación Verificada · DNI {winnerTicket?.dni || currentCandidate?.dni || 'Oficial'}</span>
                  </div>

                  {/* Administrador Encargado que le vendió el boleto */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-left bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase font-bold block">
                        ADMINISTRADOR ENCARGADO (VENDEDOR)
                      </span>
                      <span className="text-xs font-bold text-white block">
                        {winnerTicket?.registeredBy || currentCandidate?.registeredBy || 'Administrador Oficial'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Responsable de coordinar la entrega formal
                      </span>
                    </div>

                    {/* Botón WhatsApp de contacto directo */}
                    <button
                      onClick={() => {
                        const winner = winnerTicket || currentCandidate;
                        const winnerName = winner?.buyerName || 'Estimado(a)';
                        const ticketNum = winner ? `#${formatTicketNumber(winner.number)}` : '';
                        const prizeName = activePrize ? getCleanPrizeName(activePrize.name) : 'Premio Oficial';
                        const msg = `🎉 *¡FELICITACIONES! GANADOR DE LA RIFA GRADUACIÓN ADMINISTRACIÓN*\n\nHola *${winnerName}*, te informamos con gran alegría que tu boleto *${ticketNum}* acaba de salir GANADOR del premio:\n🏆 *${prizeName}*\n\nAdmin Encargado: ${winner?.registeredBy || 'Operador Oficial'}.\n\nPor favor comunícate con nosotros para coordinar la entrega formal. ¡Muchas felicidades!`;
                        const cleanPhone = (winner?.phone || '').replace(/\D/g, '');
                        const waUrl = cleanPhone.length >= 8 
                          ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone}&text=${encodeURIComponent(msg)}`
                          : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="w-full sm:w-auto h-9 px-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 cursor-pointer shrink-0 transition-transform active:scale-95"
                      title="Contactar al ganador por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Contactar por WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Audit Cryptographic Trail */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono py-2 px-3 bg-white/[0.02] rounded-xl border border-white/5 my-3">
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Fecha / Hora</span>
                    <span className="text-gray-300 text-[11px] block truncate">{drawTimestamp}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Certificación</span>
                    <span className="text-emerald-400 font-bold text-[11px] block truncate">{drawId}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Hash Verif.</span>
                    <span className="text-gray-300 text-[11px] block truncate">{winnerTicket?.verificationCode || currentCandidate?.verificationCode || 'RF-VERIFIED'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-2">
                  {nextPendingPrize ? (
                    <button
                      id="draw-next-prize-btn"
                      onClick={handleDrawNextPrize}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98 border border-emerald-300/40"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                      <span>Sortear siguiente premio ({nextPendingPrize.order}° Lugar: {getCleanPrizeName(nextPendingPrize.name)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : isAllPrizesDrawn ? (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>¡TODOS LOS PREMIOS HAN SIDO ADJUDICADOS! ({rafflePrizes.length} de {rafflePrizes.length})</span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        Se completó oficialmente el sorteo de todos los premios de la rifa.
                      </p>
                    </div>
                  ) : null}

                  {isLastDrawTest && (
                    <button
                      onClick={() => {
                        setDrawExecutionMode('oficial');
                        setIsConfirmModalOpen(true);
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 border border-emerald-300/30 mb-1"
                    >
                      <Trophy className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Pasar a Sorteo Oficial de este Premio</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    {onViewVerification && (winnerTicket || currentCandidate) && (
                      <button
                        id="verify-winner-ticket-btn"
                        onClick={() => onViewVerification((winnerTicket || currentCandidate)!)}
                        className="flex-1 py-2.5 px-3 bg-white text-[#0F1115] hover:bg-gray-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verificar ticket público</span>
                      </button>
                    )}

                    <button
                      id="view-tumblers-btn"
                      onClick={() => {
                        setDrawState('stopped');
                      }}
                      className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Ver números detenidos en el tambor"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver tambores</span>
                    </button>

                    <button
                      id="re-draw-btn"
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
                      <span>{isLastDrawTest ? 'Repetir Prueba' : 'Re-sortear premio'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer minimalista */}
      <div className="w-full px-6 sm:px-10 py-2.5 flex items-center justify-between text-[10px] font-mono text-gray-500/80 border-t border-white/5 relative z-20 shrink-0 pointer-events-none">
        <span className="hidden sm:inline">RIFAS CRYPTOGRAPHIC LIVE ENGINE · BOLETOS VENDIDOS 100% AUDITADOS</span>
        <span className="mx-auto sm:mx-0 text-center sm:text-right">TOKEN SHA-256 · DURACIÓN {spinDuration}S</span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL DE CONFIRMACIÓN OFICIAL DE SORTEO
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md bg-[#0F131C] border border-emerald-500/40 rounded-3xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden text-left"
            >
              {/* Glow de fondo */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Encabezado del Modal */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Confirmación de Sorteo Oficial
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Protocolo Criptográfico CSPRNG Auditado
                  </p>
                </div>
              </div>

              {/* Selector de Modo: Oficial vs Prueba */}
              <div className="flex rounded-2xl bg-black/50 p-1 border border-white/10 mb-4">
                <button
                  type="button"
                  onClick={() => setDrawExecutionMode('oficial')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    drawExecutionMode === 'oficial'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sorteo Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawExecutionMode('prueba')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    drawExecutionMode === 'prueba'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>🧪 Simulacro / Prueba</span>
                </button>
              </div>

              {/* Detalles del Sorteo */}
              <div className="space-y-2.5 bg-white/[0.03] border border-white/10 rounded-2xl p-4 my-3 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Modalidad:</span>
                  <span className={`font-bold ${drawExecutionMode === 'oficial' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {drawExecutionMode === 'oficial' ? '🏆 OFICIAL (GRABA EN BD)' : '🧪 PRUEBA (NO ALTERA BD)'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Premio a sortear:</span>
                  <span className="text-emerald-300 font-bold text-right truncate max-w-[200px]">
                    {getPrizeFullLabel(activePrize)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Boletos en juego:</span>
                  <span className="text-cyan-300 font-bold">
                    {eligibleTickets.length} boletos válidos
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400">Tiempo de giro:</span>
                  <span className="text-amber-300 font-bold">
                    {spinDuration} segundos
                  </span>
                </div>
              </div>

              {/* Advertencia contextual */}
              <div className={`p-3 rounded-xl mb-5 text-[11px] leading-relaxed ${
                drawExecutionMode === 'oficial'
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-200/90'
                  : 'bg-amber-500/10 border border-amber-500/25 text-amber-200/90'
              }`}>
                {drawExecutionMode === 'oficial' ? (
                  <span>🔒 <strong>Modo Oficial:</strong> El ganador quedará formalmente asentado en PostgreSQL y la auditoría como premio adjudicado.</span>
                ) : (
                  <span>🧪 <strong>Modo Prueba:</strong> La ruleta girará exactamente igual con los boletos reales, pero <strong>NO guardará el resultado</strong> ni bloqueará el premio para permitirte ensayar.</span>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    startDraw(drawExecutionMode);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    drawExecutionMode === 'oficial'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border-emerald-400/40 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-amber-400/40 shadow-amber-600/30'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{drawExecutionMode === 'oficial' ? 'Confirmar Sorteo Oficial' : 'Iniciar Simulacro Prueba'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
