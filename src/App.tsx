import React, { useState, useEffect } from 'react';
import { PlatformRole, Raffle, Ticket, AdminUser, AuditLog, Prize, AuthUser, SystemConfig } from './types';
import { 
  INITIAL_RAFFLES, 
  INITIAL_TICKETS, 
  INITIAL_ADMINS, 
  INITIAL_AUDIT,
  INITIAL_PRIZES,
  DEMO_AUTH_USERS 
} from './mockData';
import { SuperAdminView } from './components/SuperAdminView';
import { AdminPanelView } from './components/AdminPanelView';
import { TicketRegistrationModal } from './components/TicketRegistrationModal';
import { LiveDrawView } from './components/LiveDrawView';
import { TicketVerificationView } from './components/TicketVerificationView';
import { PerspectiveSwitcher } from './components/PerspectiveSwitcher';
import { LoginView } from './components/LoginView';
import { MustChangePasswordModal } from './components/MustChangePasswordModal';
import api from './services/api';

export default function App() {
  // Version check to guarantee strictly single Gran Rifa 2026 with 31 admins and 7 official prizes
  const DATA_VERSION_KEY = 'rifas_version_single_raffle_v8';
  const isUpToDate = typeof window !== 'undefined' && localStorage.getItem(DATA_VERSION_KEY) === 'true';

  // Authentication state persisted in localStorage
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('rifas_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Raffles state
  const [raffles, setRaffles] = useState<Raffle[]>(() => {
    if (!isUpToDate) return INITIAL_RAFFLES;
    const saved = localStorage.getItem('rifas_app_raffles');
    return saved ? JSON.parse(saved) : INITIAL_RAFFLES;
  });

  // Prizes state (7 official prizes)
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    if (!isUpToDate) return INITIAL_PRIZES;
    const saved = localStorage.getItem('rifas_app_prizes');
    return saved ? JSON.parse(saved) : INITIAL_PRIZES;
  });

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (!isUpToDate) return INITIAL_TICKETS;
    const saved = localStorage.getItem('rifas_app_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  // Admins state (31 admins with quota = 20)
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    if (!isUpToDate) return INITIAL_ADMINS;
    const saved = localStorage.getItem('rifas_app_admins');
    return saved ? JSON.parse(saved) : INITIAL_ADMINS;
  });
  
  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    if (!isUpToDate) return INITIAL_AUDIT;
    const saved = localStorage.getItem('rifas_app_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT;
  });

  // Mark data as updated
  useEffect(() => {
    try {
      localStorage.setItem(DATA_VERSION_KEY, 'true');
    } catch {
      // Safe fallback
    }
  }, []);

  // System Configuration state
  const [config, setConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('rifas_app_config');
    return saved ? JSON.parse(saved) : {
      organizationName: 'Plataforma Oficial de Rifas Junín',
      currencyName: 'Soles',
      currencySymbol: 'S/',
      supportPhone: '+51 987 654 321',
      receiptMessage: '¡Gracias por apoyar nuestra causa! Este comprobante digital certifica su participación válida.',
    };
  });

  const [currentView, setCurrentView] = useState<PlatformRole>('super_admin');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('rf-024');
  const [selectedPrizeIdForDraw, setSelectedPrizeIdForDraw] = useState<string | undefined>(undefined);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedTicketForVerify, setSelectedTicketForVerify] = useState<Ticket>(() => {
    return tickets[0] || INITIAL_TICKETS[0];
  });

  // Sincronización en tiempo real con la base de datos de producción (PostgreSQL :5433)
  useEffect(() => {
    let isMounted = true;
    const syncWithDatabase = async () => {
      try {
        const [backendPrizes, backendConfig] = await Promise.all([
          api.getPrizes().catch(() => null),
          api.getConfig().catch(() => null),
        ]);

        if (isMounted) {
          if (backendPrizes && Array.isArray(backendPrizes) && backendPrizes.length > 0) {
            setPrizes(backendPrizes);
          }
          if (backendConfig && backendConfig.organizationName) {
            setConfig(backendConfig);
          }
        }

        if (currentUser) {
          const [backendAdmins, backendTickets, backendAudit] = await Promise.all([
            api.getAdmins().catch(() => null),
            api.getTickets().catch(() => null),
            api.getAuditLogs().catch(() => null),
          ]);

          if (isMounted) {
            if (backendAdmins && Array.isArray(backendAdmins) && backendAdmins.length > 0) {
              setAdmins(backendAdmins);
            }
            if (backendTickets && Array.isArray(backendTickets) && backendTickets.length > 0) {
              setTickets(backendTickets);
            }
            if (backendAudit && Array.isArray(backendAudit) && backendAudit.length > 0) {
              setAuditLogs(backendAudit);
            }
          }
        }
      } catch (err) {
        console.warn('[Sync] Operando con caché local:', err);
      }
    };

    syncWithDatabase();
  }, [currentUser]);

  // Sync to local storage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('rifas_auth_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('rifas_auth_user');
      }
    } catch {
      // Safe fallback
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_raffles', JSON.stringify(raffles));
    } catch {
      // Safe fallback
    }
  }, [raffles]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_prizes', JSON.stringify(prizes));
    } catch {
      // Safe fallback
    }
  }, [prizes]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_tickets', JSON.stringify(tickets));
    } catch {
      // Safe fallback
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_admins', JSON.stringify(admins));
    } catch {
      // Safe fallback
    }
  }, [admins]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_audit', JSON.stringify(auditLogs));
    } catch {
      // Safe fallback
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('rifas_app_config', JSON.stringify(config));
    } catch {
      // Safe fallback
    }
  }, [config]);

  // Detect QR code scan / public verification from URL: ?verify=CODE or ?code=CODE
  useEffect(() => {
    const handleUrlVerification = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const verifyCode = params.get('verify') || params.get('code');
      if (verifyCode) {
        const query = verifyCode.trim().toLowerCase();
        const found = tickets.find(
          t => t.verificationCode.toLowerCase() === query ||
               t.formattedNumber.toLowerCase() === query ||
               t.formattedNumber.replace('#', '') === query ||
               t.dni === query
        );
        if (found) {
          setSelectedTicketForVerify(found);
          const targetRaffle = raffles.find(r => r.id === found.raffleId);
          if (targetRaffle) setSelectedRaffleId(targetRaffle.id);
          setCurrentView('verification');
        }
      }
    };

    handleUrlVerification();
    window.addEventListener('popstate', handleUrlVerification);
    return () => window.removeEventListener('popstate', handleUrlVerification);
  }, [tickets, raffles]);

  const activeRaffle = raffles.find(r => r.id === selectedRaffleId) || raffles[0] || INITIAL_RAFFLES[0];
  const raffleTickets = tickets.filter(t => t.raffleId === activeRaffle?.id);

  // Next ticket number calculation (starts at 1 -> #0001 up to 620)
  const nextTicketNumber = tickets.length > 0 
    ? Math.max(...tickets.map(t => t.number)) + 1 
    : 1;

  // Cuota disponible para el administrador en sesión (máx 20 por admin)
  const currentAdmin = admins.find(a => 
    (currentUser?.email && a.email.toLowerCase() === currentUser.email.toLowerCase()) || 
    (currentUser?.dni && a.dni === currentUser.dni) || 
    (currentUser?.name && a.name === currentUser.name)
  );
  const currentAdminSold = currentAdmin?.totalSold || 0;
  const availableQuota = currentUser?.role === 'super_admin' ? 620 : Math.max(0, 20 - currentAdminSold);

  // Login handler
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'super_admin') {
      setCurrentView('super_admin');
    } else {
      if (user.assignedRaffleId) {
        setSelectedRaffleId(user.assignedRaffleId);
      }
      setCurrentView('admin');
    }
  };

  // Password change completion handler
  const handlePasswordChanged = (updatedUser: AuthUser) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('rifas_auth_user', JSON.stringify(updatedUser));
    } catch {
      // safe fallback
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rifas_auth_user');
  };

  // Raffle CRUD
  const handleSaveRaffle = (savedRaffle: Raffle) => {
    setRaffles(prev => {
      const idx = prev.findIndex(r => r.id === savedRaffle.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedRaffle;
        return copy;
      }
      return [savedRaffle, ...prev];
    });

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Gestión de Rifa',
      user: currentUser?.name || 'Marks',
      raffle: savedRaffle.code,
      detail: `Rifa "${savedRaffle.title}" configurada con precio ${savedRaffle.currency}${savedRaffle.ticketPrice}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteRaffle = (raffleId: string) => {
    const target = raffles.find(r => r.id === raffleId);
    setRaffles(prev => prev.filter(r => r.id !== raffleId));
    setPrizes(prev => prev.filter(p => p.raffleId !== raffleId));

    if (target) {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: dateStr,
        action: 'Eliminación de Rifa',
        user: currentUser?.name || 'Marks',
        raffle: target.code,
        detail: `Rifa "${target.title}" (${target.code}) eliminada del sistema.`,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Admin CRUD
  const handleSaveAdmin = (savedAdmin: AdminUser, password?: string) => {
    setAdmins(prev => {
      const idx = prev.findIndex(a => a.id === savedAdmin.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedAdmin;
        return copy;
      }
      return [...prev, savedAdmin];
    });

    // Synchronize demo auth credentials
    const demoIdx = DEMO_AUTH_USERS.findIndex(u => u.email.toLowerCase() === savedAdmin.email.toLowerCase());
    if (demoIdx >= 0) {
      DEMO_AUTH_USERS[demoIdx].name = savedAdmin.name;
      if (password) DEMO_AUTH_USERS[demoIdx].password = password;
      DEMO_AUTH_USERS[demoIdx].assignedRaffleId = savedAdmin.assignedRaffleId;
    } else {
      DEMO_AUTH_USERS.push({
        id: `user-${savedAdmin.id}`,
        name: savedAdmin.name,
        email: savedAdmin.email,
        password: password || 'password123',
        role: 'admin',
        assignedRaffleId: savedAdmin.assignedRaffleId,
        avatarInitials: savedAdmin.avatarInitials,
      });
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Gestión de Administrador',
      user: currentUser?.name || 'Marks',
      raffle: 'Plataforma',
      detail: `Operador "${savedAdmin.name}" (${savedAdmin.email}) configurado. Estado: ${savedAdmin.status}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteAdmin = (adminId: string) => {
    const target = admins.find(a => a.id === adminId);
    setAdmins(prev => prev.filter(a => a.id !== adminId));

    if (target) {
      const demoIdx = DEMO_AUTH_USERS.findIndex(u => u.email.toLowerCase() === target.email.toLowerCase());
      if (demoIdx >= 0) DEMO_AUTH_USERS.splice(demoIdx, 1);

      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: dateStr,
        action: 'Eliminación de Operador',
        user: currentUser?.name || 'Marks',
        raffle: 'Plataforma',
        detail: `Operador "${target.name}" (${target.email}) dado de baja del sistema.`,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Prize CRUD
  const handleSavePrize = (prize: Prize) => {
    setPrizes(prev => {
      const idx = prev.findIndex(p => p.id === prize.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = prize;
        return updated;
      }
      return [prize, ...prev];
    });

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Configuración de Premio',
      user: currentUser?.name || 'Marks',
      raffle: raffles.find(r => r.id === prize.raffleId)?.code || activeRaffle.code,
      detail: `Premio "${prize.name}" (${prize.order}° Lugar) registrado/actualizado.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDeletePrize = (prizeId: string) => {
    const target = prizes.find(p => p.id === prizeId);
    setPrizes(prev => prev.filter(p => p.id !== prizeId));

    if (target) {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: dateStr,
        action: 'Eliminación de Premio',
        user: currentUser?.name || 'Marks',
        raffle: raffles.find(r => r.id === target.raffleId)?.code || activeRaffle.code,
        detail: `Premio "${target.name}" eliminado del catálogo de la rifa.`,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Ticket CRUD
  const handleTicketsCreated = (newTickets: Ticket[]) => {
    if (!newTickets || newTickets.length === 0) return;
    setTickets(prev => [...newTickets, ...prev]);

    const count = newTickets.length;
    setRaffles(prev => prev.map(r => {
      if (r.id === activeRaffle.id) {
        return {
          ...r,
          soldTickets: (r.soldTickets || 0) + count,
        };
      }
      return r;
    }));

    if (currentUser) {
      setAdmins(prev => prev.map(a => {
        if (
          (currentUser.email && a.email.toLowerCase() === currentUser.email.toLowerCase()) || 
          (currentUser.dni && a.dni === currentUser.dni) || 
          a.name === currentUser.name
        ) {
          return {
            ...a,
            totalSold: (a.totalSold || 0) + count,
          };
        }
        return a;
      }));
    }

    const first = newTickets[0];
    const last = newTickets[newTickets.length - 1];
    const numRange = newTickets.length === 1 ? first.formattedNumber : `${first.formattedNumber} al ${last.formattedNumber} (${count} tickets)`;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Emisión de Tickets',
      user: currentUser?.name || 'Marks',
      raffle: activeRaffle.code,
      detail: `Boletos ${numRange} emitidos a ${first.buyerName} (DNI ${first.dni}). Total: S/ ${(count * 10).toFixed(2)}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleTicketCreated = (newTicket: Ticket) => {
    handleTicketsCreated([newTicket]);
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Actualización de Ticket',
      user: currentUser?.name || 'Marks',
      raffle: activeRaffle.code,
      detail: `Ticket ${updatedTicket.formattedNumber} actualizado: ${updatedTicket.buyerName} (DNI ${updatedTicket.dni}).`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteTicket = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    setTickets(prev => prev.filter(t => t.id !== ticketId));

    setRaffles(prev => prev.map(r => {
      if (r.id === target.raffleId) {
        return {
          ...r,
          soldTickets: Math.max(0, r.soldTickets - 1),
        };
      }
      return r;
    }));

    if (target.registeredBy) {
      setAdmins(prev => prev.map(a => {
        if (a.name === target.registeredBy) {
          return {
            ...a,
            totalSold: Math.max(0, (a.totalSold || 0) - 1),
          };
        }
        return a;
      }));
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Anulación de Ticket',
      user: currentUser?.name || 'Marks',
      raffle: activeRaffle.code,
      detail: `Ticket ${target.formattedNumber} anulado. Contador de ventas ajustado.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Config Update
  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Ajuste de Configuración',
      user: currentUser?.name || 'Marks',
      raffle: 'Plataforma',
      detail: `Parámetros institucionales actualizados: ${newConfig.organizationName}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleSelectRaffleForAdmin = (raffleId: string) => {
    setSelectedRaffleId(raffleId);
    setCurrentView('admin');
  };

  const handleSelectRaffleForDraw = (raffleId: string, prizeId?: string) => {
    setSelectedRaffleId(raffleId);
    setSelectedPrizeIdForDraw(prizeId);
    setCurrentView('live_draw');
  };

  const handleViewVerification = (ticket: Ticket) => {
    setSelectedTicketForVerify(ticket);
    setCurrentView('verification');
  };

  const handleWinnerSelected = (winnerTicket: Ticket, wonPrize?: Prize) => {
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const drawId = `DRAW-${activeRaffle.code.replace('#', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Update raffle winner
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
            prizeName: wonPrize?.name,
          },
        };
      }
      return r;
    }));

    // Update specific prize
    if (wonPrize) {
      setPrizes(prev => prev.map(p => {
        if (p.id === wonPrize.id) {
          return {
            ...p,
            isDrawn: true,
            winnerTicket: {
              ticketNumber: winnerTicket.formattedNumber,
              winnerName: winnerTicket.buyerName,
              dni: winnerTicket.dni,
              drawTimestamp: dateFormatted,
              drawId,
            },
          };
        }
        return p;
      }));
    }

    const prizeLabel = wonPrize ? `para el premio [${wonPrize.name}]` : '';
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      action: 'Certificación de Ganador',
      user: 'Sorteo CSPRNG',
      raffle: activeRaffle.code,
      detail: `Ganador certificado: ${winnerTicket.formattedNumber} (${winnerTicket.buyerName}) ${prizeLabel}. Sorteo ID: ${drawId}.`,
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

  const handleResetPrizes = (raffleId: string) => {
    setPrizes(prev => prev.map(p => {
      if (p.raffleId === raffleId) {
        return {
          ...p,
          isDrawn: false,
          winnerTicket: undefined,
        };
      }
      return p;
    }));
  };

  // Synchronize body background with current view to prevent any white gap
  React.useEffect(() => {
    if (currentView === 'live_draw') {
      document.body.style.backgroundColor = '#07090E';
    } else {
      document.body.style.backgroundColor = '#F5F5F3';
    }
  }, [currentView]);

  const isPublicVerification = currentView === 'verification' && !currentUser;
  if (!currentUser && !isPublicVerification) {
    return <LoginView onLoginSuccess={handleLogin} />;
  }

  return (
    <div
      className={`min-h-screen font-['Geist',sans-serif] relative ${
        currentView === 'live_draw'
          ? 'h-screen max-h-screen overflow-hidden bg-[#07090E] text-white p-0 m-0'
          : 'bg-[#F5F5F3] text-[#0F1115] pb-32'
      }`}
    >
      {/* Dynamic Views Rendering */}
      {currentView === 'super_admin' && currentUser && (
        <SuperAdminView
          raffles={raffles}
          admins={admins}
          auditLogs={auditLogs}
          prizes={prizes}
          currentUser={currentUser}
          config={config}
          onSelectRaffleForAdmin={handleSelectRaffleForAdmin}
          onSelectRaffleForDraw={handleSelectRaffleForDraw}
          onSavePrize={handleSavePrize}
          onDeletePrize={handleDeletePrize}
          onSaveRaffle={handleSaveRaffle}
          onDeleteRaffle={handleDeleteRaffle}
          onSaveAdmin={handleSaveAdmin}
          onDeleteAdmin={handleDeleteAdmin}
          onSaveConfig={handleSaveConfig}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'admin' && currentUser && (
        <AdminPanelView
          raffle={activeRaffle}
          tickets={raffleTickets}
          prizes={prizes}
          currentUser={currentUser}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          onGoToLiveDraw={handleSelectRaffleForDraw}
          onVerifyTicket={handleViewVerification}
          onBackToOverview={() => setCurrentView('super_admin')}
          onToggleRaffleStatus={handleToggleRaffleStatus}
          onUpdateTicket={handleUpdateTicket}
          onDeleteTicket={handleDeleteTicket}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'live_draw' && currentUser && (
        <LiveDrawView
          raffle={activeRaffle}
          tickets={raffleTickets.length > 0 ? raffleTickets : INITIAL_TICKETS}
          prizes={prizes}
          initialPrizeId={selectedPrizeIdForDraw}
          onBack={() => setCurrentView(currentUser.role === 'super_admin' ? 'super_admin' : 'admin')}
          onWinnerSelected={handleWinnerSelected}
          onViewVerification={handleViewVerification}
          onResetPrizes={() => handleResetPrizes(activeRaffle.id)}
        />
      )}

      {currentView === 'verification' && (
        <TicketVerificationView
          ticket={selectedTicketForVerify}
          raffle={activeRaffle}
          allTickets={tickets}
          isPublicView={!currentUser}
          onGoToLogin={() => setCurrentView('super_admin')}
          onBack={() => {
            if (currentUser) {
              setCurrentView(currentUser.role === 'super_admin' ? 'super_admin' : 'admin');
            } else {
              window.history.replaceState({}, '', window.location.pathname);
              setCurrentView('super_admin');
            }
          }}
          onSelectTicket={(t) => setSelectedTicketForVerify(t)}
        />
      )}

      {/* Ticket Registration Modal (Screen 3) with multi-ticket support */}
      <TicketRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        nextTicketNumber={nextTicketNumber}
        raffleTitle={activeRaffle?.title || ''}
        raffleCode={activeRaffle?.code || ''}
        onTicketCreated={handleTicketCreated}
        onTicketsCreated={handleTicketsCreated}
        registeredByName={currentUser?.name}
        maxAvailable={availableQuota}
        onViewVerification={(t) => {
          setIsRegisterModalOpen(false);
          handleViewVerification(t);
        }}
      />

      {/* Mandatory password change modal on first login */}
      {currentUser && currentUser.mustChangePassword && (
        <MustChangePasswordModal
          isOpen={Boolean(currentUser.mustChangePassword)}
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChanged}
        />
      )}

      {/* Floating Perspective Switcher allowing inspection of views */}
      <PerspectiveSwitcher
        currentView={currentView}
        currentUser={currentUser}
        onSelectView={(v) => setCurrentView(v)}
        onOpenRegisterTicket={() => setIsRegisterModalOpen(true)}
        onLogout={handleLogout}
        isDrawMode={currentView === 'live_draw'}
      />
    </div>
  );
}
