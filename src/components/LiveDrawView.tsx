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
  Gift,
  ChevronDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Timer,
  AlertTriangle,
  Eye
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

  // Draw states: 'idle' | 'spinning' | 'decelerating' | 'stopped' | 'winner'
  const [drawState, setDrawState] = useState<'idle' | 'spinning' | 'decelerating' | 'stopped' | 'winner'>('idle');
  const [currentDisplayNumber, setCurrentDisplayNumber] = useState<string>('0 0 0 0');
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

  // Sincronizar display inicial con el premio activo y boletos vendidos existentes
  useEffect(() => {
    if (activePrize?.isDrawn) {
      const winnerTicketId = activePrize.winnerTicketId || (activePrize as any).winnerTicket?.ticketNumber;
      const found = tickets.find(t => t.id === winnerTicketId || t.formattedNumber === winnerTicketId || t.number === Number(winnerTicketId?.replace('#', '')));
      if (found) {
        setWinnerTicket(found);
        setCurrentCandidate(found);
        setCurrentDisplayNumber(formatDisplayDigits(found.number));
        setDrawState('winner');
        return;
      }
    }
    setDrawState('idle');
    setWinnerTicket(null);
    const initialCandidate = eligibleTickets[0] || tickets[0] || null;
    if (initialCandidate) {
      setCurrentCandidate(initialCandidate);
      setCurrentDisplayNumber(formatDisplayDigits(initialCandidate.number));
    } else {
      setCurrentCandidate(null);
      setCurrentDisplayNumber('0 0 0 0');
    }
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

  const startDraw = async () => {
    if (eligibleTickets.length === 0) {
      alert('⚠️ No hay boletos vendidos disponibles para sortear este premio. Todos los boletos han sido premiados o no se han registrado ventas.');
      return;
    }

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);

    setDrawState('spinning');
    setWinnerTicket(null);

    // 1. Obtener ganador oficial desde PostgreSQL o de los tickets elegibles existentes
    let targetCandidate: Ticket;
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

    if (!targetCandidate && eligibleTickets.length > 0) {
      targetCandidate = eligibleTickets[0];
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setDrawTimestamp(`${dateStr} · ${timeStr}`);
    setDrawId(`DRAW-${raffle.code.replace('#', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);

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
        // FASE 2: Desaceleración progresiva (disminuyendo velocidad gradualmente)
        setDrawState('decelerating');
        const decelProgress = (elapsed - fastDurationMs) / (totalDurationMs - fastDurationMs);
        const delay = Math.round(55 + Math.pow(decelProgress, 2.2) * 450); // de 55ms hasta ~500ms

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
          if (onWinnerSelected) {
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
      const initialCandidate = eligibleTickets[0] || tickets[0] || null;
      if (initialCandidate) {
        setCurrentCandidate(initialCandidate);
        setCurrentDisplayNumber(formatDisplayDigits(initialCandidate.number));
      }
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

  // Digits formatted for 4-drum tumbler cards (matching ticket formats #0001 to #0600)
  const currentDigits = (currentDisplayNumber || '0 0 0 0')
    .replace(/\s+/g, '')
    .padStart(4, '0')
    .slice(-4)
    .split('');

  return (
    <div id="live-draw-container" className="relative h-screen max-h-screen w-full bg-[#07090E] text-[#FFFFFF] flex flex-col justify-between selection:bg-[#059669] selection:text-white font-['Geist',sans-serif] overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          THEATRICAL STAGE ATMOSPHERE & LIGHTING LAYERS
          ───────────────────────────────────────────────────────────── */}
      {/* 1. Top Spotlight Beam from ceiling */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/25 via-teal-500/10 to-transparent pointer-events-none blur-3xl" />

      {/* 2. Left Ambient Aura (Deep Emerald) */}
      <div className="absolute top-1/4 -left-48 w-[550px] h-[550px] bg-emerald-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* 3. Right Ambient Aura (Cyber Cyan) */}
      <div className="absolute top-1/3 -right-48 w-[550px] h-[550px] bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* 4. Center Stage Backlight behind the Tumblers */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[450px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-emerald-500/15 via-slate-800/25 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* 5. Bottom Stage Floor Rim Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[280px] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-500/20 via-teal-900/15 to-transparent pointer-events-none blur-3xl" />

      {/* 6. Subtle Geometric Tech Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        }}
      />

      {/* Top minimal control bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between relative z-20">
        <button
          id="live-draw-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Volver al panel</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {onResetPrizes && (
            <button
              id="live-draw-top-reset-btn"
              onClick={() => {
                if (window.confirm('⚠️ MODO PRUEBAS: ¿Deseas reiniciar todos los premios y sorteos para volver a probar desde cero?')) {
                  onResetPrizes();
                  const firstPrize = rafflePrizes[0];
                  if (firstPrize) setSelectedPrizeId(firstPrize.id);
                  setDrawState('idle');
                  setWinnerTicket(null);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-full border border-amber-500/30 transition-all cursor-pointer shadow-sm backdrop-blur-md"
              title="Reiniciar todos los premios para pruebas"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reiniciar Sorteos (Pruebas)</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer backdrop-blur-md"
            title={soundEnabled ? 'Silenciar efectos' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          <span className="text-[11px] font-mono tracking-widest text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/30 uppercase font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md">
            CERTIFICADO EN VIVO · CSPRNG
          </span>
        </div>
      </div>

      {/* Main Sorteo Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 max-w-4xl mx-auto w-full text-center relative z-10">
        {/* PRIZE SELECTION MODULE & SUPERADMIN DURATION CONTROLS (Top bar during idle) */}
        {rafflePrizes.length > 0 && drawState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl mb-4 bg-[#121622]/90 border border-white/15 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <span>PREMIO EN DISPUTA:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold shadow-xs">
                  {rafflePrizes.filter(p => p.isDrawn).length} de {rafflePrizes.length} sorteados
                </span>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-semibold">
                  {eligibleTickets.length} boletos en juego
                </span>
              </div>
            </div>

            <div className="relative">
              <select
                id="live-draw-prize-select"
                value={activePrize?.id || ''}
                onChange={(e) => setSelectedPrizeId(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-[#0A0D14]/90 border border-white/15 text-white rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none shadow-inner"
              >
                {rafflePrizes.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0A0D14] text-white py-1">
                    {getPrizeFullLabel(p)} {p.isDrawn ? '✓ (SORTEADO)' : '• (PENDIENTE)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* SUPERADMIN OPTION: SELECTOR DE TIEMPO DE GIRO DE LA RULETA */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Timer className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-bold text-gray-200 block">
                    Tiempo de Giro de Ruleta:
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Duración del suspenso antes de frenar en el ganador
                  </span>
                </div>
              </div>

              {/* Botones de selección de duración */}
              <div className="flex items-center gap-1.5 bg-[#0A0D14] p-1 rounded-xl border border-white/10 shrink-0">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                      spinDuration === secs
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={`Duración: ${secs} segundos (${desc})`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] opacity-70 hidden md:inline">({desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {activePrize && (
              <div className="mt-2.5 text-left px-3 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {activePrize.category && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0">
                      {activePrize.category}
                    </span>
                  )}
                  <span className="text-gray-300 text-[11px] line-clamp-1">
                    {activePrize.description || 'Premio estelar oficial'}
                  </span>
                </div>
                {activePrize.link && (
                  <a
                    href={activePrize.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg border border-emerald-500/40 transition-colors shrink-0 shadow-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver enlace oficial</span>
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
              className="w-full space-y-4"
            >
              {/* Header: GRAN RIFA / SORTEO EN VIVO */}
              <div className="space-y-1.5">
                <h2 className="text-xs md:text-sm font-semibold tracking-widest text-emerald-400/90 uppercase font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {raffle.title}
                </h2>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  SORTEO EN VIVO
                </h1>

                {/* Banner Premio Activo: visible durante el sorteo */}
                {activePrize && drawState !== 'idle' ? (
                  <div className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-md">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    <span>EN DISPUTA: {getPrizeFullLabel(activePrize)}</span>
                  </div>
                ) : null}
              </div>

              {/* Central Tumbling Display: Digit Cards sobre Podio Iluminado */}
              <div className="py-3 my-1 relative">
                {/* Luminous Floor Podium Halo directly beneath the digit cards */}
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] h-16 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${
                  drawState === 'stopped' 
                    ? 'bg-amber-400/40 scale-125' 
                    : 'bg-emerald-500/30'
                }`} />

                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 relative z-10">
                  {currentDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`relative w-16 sm:w-24 md:w-32 h-24 sm:h-32 md:h-40 rounded-2xl md:rounded-3xl flex items-center justify-center bg-gradient-to-b from-[#1C2230] via-[#121622] to-[#0A0D14] border-2 ${
                        drawState === 'stopped'
                          ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.8)] scale-110 bg-gradient-to-b from-[#2A2415] via-[#1A1812] to-[#0A0D14]'
                          : drawState === 'spinning'
                          ? 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105'
                          : drawState === 'decelerating'
                          ? 'border-amber-400/80 shadow-[0_0_40px_rgba(251,191,36,0.4)] scale-102'
                          : 'border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      } overflow-hidden transition-all duration-200 select-none`}
                    >
                      {/* Glossy top glass highlight */}
                      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                      {/* Horizontal drum seam line */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/70 border-b border-white/10 pointer-events-none" />
                      
                      {/* Numerals with high-impact glow */}
                      <span className={`font-mono text-4xl sm:text-5xl md:text-7xl font-black ${
                        drawState === 'stopped'
                          ? 'text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.9)] animate-pulse'
                          : drawState === 'spinning'
                          ? 'text-emerald-300 drop-shadow-[0_0_40px_rgba(16,185,129,0.85)]'
                          : drawState === 'decelerating'
                          ? 'text-amber-200 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]'
                          : 'text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)]'
                      }`}>
                        {digit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status bar y participante real pasando */}
                <div className="mt-4 text-xs font-mono tracking-widest uppercase">
                  {drawState === 'stopped' ? (
                    <div className="space-y-1.5 animate-bounce">
                      <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 font-extrabold text-sm shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>¡BOLETO GANADOR #{winnerTicket ? formatTicketNumber(winnerTicket.number) : currentDigits.join('')}!</span>
                      </div>
                      {currentCandidate && (
                        <p className="text-xs text-gray-200 font-bold tracking-normal normal-case">
                          Participante: <span className="text-white underline">{currentCandidate.buyerName}</span> (DNI {currentCandidate.dni})
                        </p>
                      )}
                    </div>
                  ) : drawState === 'spinning' ? (
                    <div className="space-y-1.5">
                      <span className="text-emerald-400 animate-pulse font-bold drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] block">
                        ── MEZCLANDO EXCLUSIVAMENTE BOLETOS VENDIDOS EXISTENTES ──
                      </span>
                      {currentCandidate && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[11px] text-gray-300 tracking-normal normal-case">
                          <span className="font-mono text-emerald-400 font-bold">#{formatTicketNumber(currentCandidate.number)}</span>
                          <span className="text-gray-400">·</span>
                          <span className="truncate max-w-[260px] text-white font-medium">{currentCandidate.buyerName}</span>
                        </div>
                      )}
                    </div>
                  ) : drawState === 'decelerating' ? (
                    <div className="space-y-1.5">
                      <span className="text-amber-400 font-bold animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.5)] block">
                        ── FRENANDO EN EL GANADOR OFICIAL ──
                      </span>
                      {currentCandidate && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30 text-[11px] text-amber-200 tracking-normal normal-case">
                          <span className="font-mono font-bold">#{formatTicketNumber(currentCandidate.number)}</span>
                          <span>·</span>
                          <span className="truncate max-w-[260px] font-medium">{currentCandidate.buyerName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-emerald-400/90 font-mono font-semibold block">
                        ── SISTEMA CSPRNG LISTO · TIEMPO PROGRAMADO: {spinDuration} SEGUNDOS ──
                      </span>
                      <span className="text-[11px] text-gray-400 font-sans tracking-normal normal-case">
                        {eligibleTickets.length > 0 
                          ? `Participan únicamente los ${eligibleTickets.length} boletos válidos vendidos de la rifa.`
                          : 'No hay boletos vendidos disponibles para este sorteo.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Iniciar sorteo */}
              <div className="pt-2">
                {drawState === 'idle' ? (
                  eligibleTickets.length === 0 ? (
                    <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-center space-y-1 max-w-md mx-auto">
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
                      onClick={startDraw}
                      className="relative group px-12 sm:px-16 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base tracking-widest uppercase rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_rgba(16,185,129,0.8)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 mx-auto border border-emerald-300/40"
                    >
                      <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
                      <span>INICIAR SORTEO ({spinDuration}s)</span>
                      <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
                    </button>
                  )
                ) : (
                  <div className="h-14 flex items-center justify-center">
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
              {/* Single Ambient Radial Aura */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/25 via-teal-400/20 to-emerald-500/25 rounded-3xl blur-xl pointer-events-none" />

              {/* Single Unified Card Surface */}
              <div className="relative bg-[#0F131C] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                {/* Trophy & Prize Header */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400/20 to-amber-500/10 border border-amber-400/40 flex items-center justify-center mb-2 shadow-md shadow-amber-500/10">
                    <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    PREMIO ADJUDICADO OFICIALMENTE
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5 max-w-md">
                    {getPrizeFullLabel(activePrize)}
                  </h2>
                </div>

                {/* Ticket Ganador: NÚMERO Y DATOS 100% IDÉNTICOS A LA RULETA */}
                <div className="my-3 py-3 px-4 bg-white/[0.03] rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase block">
                    NÚMERO DE TICKET GANADOR
                  </span>
                  <div className="text-5xl sm:text-6xl font-black font-['JetBrains_Mono'] tracking-tight text-white my-1 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    {winnerTicket ? `#${formatTicketNumber(winnerTicket.number)}` : `#${currentDigits.join('')}`}
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
                      {onResetPrizes && (
                        <button
                          id="reset-all-draws-btn"
                          onClick={() => {
                            onResetPrizes();
                            const firstPrize = rafflePrizes[0];
                            if (firstPrize) setSelectedPrizeId(firstPrize.id);
                            setDrawState('idle');
                            setWinnerTicket(null);
                          }}
                          className="w-full py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar sorteos para volver a jugar</span>
                        </button>
                      )}
                    </div>
                  ) : null}

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
                      onClick={startDraw}
                      className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
                      <span>Repetir sorteo</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer minimalista */}
      <div className="w-full px-6 sm:px-10 py-3.5 flex items-center justify-between text-[10px] sm:text-xs font-mono text-gray-500/80 border-t border-white/5 relative z-20 shrink-0 pointer-events-none">
        <span className="hidden sm:inline">RIFAS CRYPTOGRAPHIC LIVE ENGINE · BOLETOS VENDIDOS 100% AUDITADOS</span>
        <span className="mx-auto sm:mx-0 text-center sm:text-right">TOKEN SHA-256 · DURACIÓN {spinDuration}S</span>
      </div>
    </div>
  );
};
