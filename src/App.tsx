import React, { useState, useEffect } from 'react';
import { PlatformRole, Raffle, Ticket, AdminUser, AuditLog } from './types';
import { 
  INITIAL_RAFFLES, 
  INITIAL_TICKETS, 
  INITIAL_ADMINS, 
  INITIAL_AUDIT 
} from './mockData';
import { SuperAdminView } from './components/SuperAdminView';
import { AdminPanelView } from './components/AdminPanelView';
import { TicketRegistrationModal } from './components/TicketRegistrationModal';
import { LiveDrawView } from './components/LiveDrawView';
import { TicketVerificationView } from './components/TicketVerificationView';
import { PerspectiveSwitcher } from './components/PerspectiveSwitcher';

export default function App() {
  // Persistence in localStorage
  const [raffles, setRaffles] = useState<Raffle[]>(() => {
    const saved = localStorage.getItem('rifas_app_raffles');
    return saved ? JSON.parse(saved) : INITIAL_RAFFLES;
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('rifas_app_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [admins] = useState<AdminUser[]>(INITIAL_ADMINS);
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('rifas_app_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT;
  });

  const [currentView, setCurrentView] = useState<PlatformRole>('super_admin');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('rf-024');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedTicketForVerify, setSelectedTicketForVerify] = useState<Ticket>(() => {
    return tickets[0] || INITIAL_TICKETS[0];
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_raffles', JSON.stringify(raffles));
    } catch {
      // Safe fallback
    }
  }, [raffles]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_tickets', JSON.stringify(tickets));
    } catch {
      // Safe fallback
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_audit', JSON.stringify(auditLogs));
    } catch {
      // Safe fallback
    }
  }, [auditLogs]);

  const activeRaffle = raffles.find(r => r.id === selectedRaffleId) || raffles[0];
  const raffleTickets = tickets.filter(t => t.raffleId === activeRaffle.id);

  // Next ticket number calculation
  const nextTicketNumber = tickets.length > 0 
    ? Math.max(...tickets.map(t => t.number)) + 1 
    : 1249;

  const handleTicketCreated = (newTicket: Ticket) => {
    // 1. Add ticket to state
    setTickets(prev => [newTicket, ...prev]);

    // 2. Increment raffle soldTickets count
    setRaffles(prev => prev.map(r => {
      if (r.id === activeRaffle.id) {
        return {
          ...r,
          soldTickets: r.soldTickets + 1,
        };
      }
      return r;
    }));

    // 3. Add to Audit log
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Emisión de Ticket',
      user: 'Marks',
      raffle: activeRaffle.code,
      detail: `Ticket ${newTicket.formattedNumber} emitido a ${newTicket.buyerName} (DNI ${newTicket.dni}). Hash ${newTicket.verificationCode}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleSelectRaffleForAdmin = (raffleId: string) => {
    setSelectedRaffleId(raffleId);
    setCurrentView('admin');
  };

  const handleSelectRaffleForDraw = (raffleId: string) => {
    setSelectedRaffleId(raffleId);
    setCurrentView('live_draw');
  };

  const handleViewVerification = (ticket: Ticket) => {
    setSelectedTicketForVerify(ticket);
    setCurrentView('verification');
  };

  const handleWinnerSelected = (winnerTicket: Ticket) => {
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const drawId = `DRAW-${activeRaffle.code.replace('#', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    setRaffles(prev => prev.map(r => {
      if (r.id === activeRaffle.id) {
        return {
          ...r,
          winner: {
            ticketNumber: winnerTicket.formattedNumber,
            winnerName: winnerTicket.buyerName,
            dni: winnerTicket.dni,
            drawTimestamp: dateFormatted,
            drawId,
          },
        };
      }
      return r;
    }));

    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      action: 'Certificación de Ganador',
      user: 'Sorteo CSPRNG',
      raffle: activeRaffle.code,
      detail: `Ganador certificado: ${winnerTicket.formattedNumber} (${winnerTicket.buyerName}). Sorteo ID: ${drawId}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleToggleRaffleStatus = (raffleId: string) => {
    setRaffles(prev => prev.map(r => {
      if (r.id === raffleId) {
        const nextStatus = r.status === 'activa' ? 'cerrada' : 'activa';
        return { ...r, status: nextStatus };
      }
      return r;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] font-['Geist',sans-serif] text-[#0F1115] relative pb-20 md:pb-12">
      {/* Dynamic Views Rendering */}
      {currentView === 'super_admin' && (
        <SuperAdminView
          raffles={raffles}
          admins={admins}
          auditLogs={auditLogs}
          onSelectRaffleForAdmin={handleSelectRaffleForAdmin}
          onSelectRaffleForDraw={handleSelectRaffleForDraw}
        />
      )}

      {currentView === 'admin' && (
        <AdminPanelView
          raffle={activeRaffle}
          tickets={raffleTickets}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          onGoToLiveDraw={handleSelectRaffleForDraw}
          onVerifyTicket={handleViewVerification}
          onBackToOverview={() => setCurrentView('super_admin')}
          onToggleRaffleStatus={handleToggleRaffleStatus}
        />
      )}

      {currentView === 'live_draw' && (
        <LiveDrawView
          raffle={activeRaffle}
          tickets={raffleTickets.length > 0 ? raffleTickets : INITIAL_TICKETS}
          onBack={() => setCurrentView('admin')}
          onWinnerSelected={handleWinnerSelected}
          onViewVerification={handleViewVerification}
        />
      )}

      {currentView === 'verification' && (
        <TicketVerificationView
          ticket={selectedTicketForVerify}
          raffle={activeRaffle}
          allTickets={tickets}
          onBack={() => setCurrentView('admin')}
          onSelectTicket={(t) => setSelectedTicketForVerify(t)}
        />
      )}

      {/* Ticket Registration Modal (Screen 3) */}
      <TicketRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        nextTicketNumber={nextTicketNumber}
        raffleTitle={activeRaffle.title}
        raffleCode={activeRaffle.code}
        onTicketCreated={handleTicketCreated}
        onViewVerification={(t) => {
          setIsRegisterModalOpen(false);
          handleViewVerification(t);
        }}
      />

      {/* Floating Perspective Switcher allowing instant inspection of all 5 modules */}
      <PerspectiveSwitcher
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenRegisterTicket={() => setIsRegisterModalOpen(true)}
        isDrawMode={currentView === 'live_draw'}
      />
    </div>
  );
}
