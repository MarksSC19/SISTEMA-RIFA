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
import { getAdminBooklet, getAdminAvailableNumbers } from './utils/ticketQuota';

const DATA_VERSION_KEY = 'rifas_version_v13_qr_clean';

export default function App() {
  const isUpToDate = typeof window !== 'undefined' && localStorage.getItem(DATA_VERSION_KEY) === 'true';

  // Si la versión es antigua, limpiar sesiones guardadas de pruebas anteriores
  if (typeof window !== 'undefined' && !isUpToDate) {
    try {
      localStorage.removeItem('rifas_auth_user');
      localStorage.removeItem('rifas_jwt_token');
      localStorage.setItem(DATA_VERSION_KEY, 'true');
    } catch {
      // safe fallback
    }
  }

  // Authentication state persisted in localStorage
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (!isUpToDate) return null;
    // Si la URL es de verificación pública (?verify=... o ?code=...), no restaurar ningún operador para que el participante vea limpio su ticket
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('verify') || p.get('code') || p.get('ticket')) {
        return null;
      }
    }
    const saved = localStorage.getItem('rifas_auth_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Si el usuario tenía cambio de contraseña pendiente, no dejarlo atrapado: volver a login limpio
      if (parsed && parsed.mustChangePassword) {
        localStorage.removeItem('rifas_auth_user');
        localStorage.removeItem('rifas_jwt_token');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Raffles state
  const [raffles, setRaffles] = useState<Raffle[]>(() => {
    if (!isUpToDate) return INITIAL_RAFFLES;
    const saved = localStorage.getItem('rifas_app_raffles');
    return saved ? JSON.parse(saved) : INITIAL_RAFFLES;
  });

  // Prizes state
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    if (!isUpToDate) return INITIAL_PRIZES;
    const saved = localStorage.getItem('rifas_app_prizes');
    return saved ? JSON.parse(saved) : INITIAL_PRIZES;
  });

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    return [];
  });

  // Admins state (31 admins with quota = 20)
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    return [];
  });
  
  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return [];
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

  // Si la URL contiene parámetros de verificación QR (?verify=... o ?code=...), ingresar directamente en modo público sin requerir login
  const [currentView, setCurrentView] = useState<PlatformRole>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('verify') || params.get('code') || params.get('ticket')) {
        return 'verification';
      }
    }
    return currentUser?.role==='admin'?'admin':'super_admin';
  });

  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('rf-024');
  const [selectedPrizeIdForDraw, setSelectedPrizeIdForDraw] = useState<string | undefined>(undefined);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedTicketForVerify, setSelectedTicketForVerify] = useState<Ticket | undefined>(undefined);
  const [syncError,setSyncError] = useState('');

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
          if (backendPrizes && Array.isArray(backendPrizes)) {
            setPrizes(backendPrizes);
          }
          if (backendConfig && backendConfig.organizationName) {
            setConfig(backendConfig);
          }
        }

        if (currentUser && !currentUser.mustChangePassword) {
          const {user: refreshedUser} = await api.getCurrentUser();
          if (isMounted && JSON.stringify(refreshedUser)!==JSON.stringify(currentUser)) {
            setCurrentUser(refreshedUser);
          }
          const [backendAdmins, backendTickets, backendAudit, backendRaffles] = await Promise.all([
            currentUser.role==='super_admin' ? api.getAdmins().catch(() => null) : Promise.resolve([]),
            api.getTickets().catch(() => null),
            currentUser.role === 'super_admin' ? api.getAuditLogs().catch(() => null) : Promise.resolve([]),
            api.getRaffles().catch(() => null),
          ]);

          if (isMounted) {
            setSyncError(backendTickets===null || backendRaffles===null || backendAdmins===null || backendAudit===null ? 'No se pudo actualizar la información del servidor. Las operaciones requieren conexión.' : '');
            if (backendRaffles) setRaffles(backendRaffles);
            if (backendAdmins && Array.isArray(backendAdmins)) {
              setAdmins(backendAdmins);
            }
            if (backendTickets && Array.isArray(backendTickets)) {
              setTickets(backendTickets);
            }
            if (backendAudit && Array.isArray(backendAudit)) {
              setAuditLogs(backendAudit);
            }
          }
        }
      } catch (err) {
        console.warn('[Sync] Operando con caché local:', err);
      }
    };

    syncWithDatabase();
    const timer=setInterval(syncWithDatabase,15000);
    return ()=>{isMounted=false;clearInterval(timer);};
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled=false;
    api.getCurrentUser().then(({user})=>{if(!cancelled && JSON.stringify(user)!==JSON.stringify(currentUser))setCurrentUser(user);}).catch(()=>{if(!cancelled){api.logout();setCurrentUser(null);setTickets([]);setAdmins([]);}});
    return ()=>{cancelled=true;};
  }, [currentUser?.id]);
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
    let isMounted = true;
    const handleUrlVerification = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const verifyCode = params.get('verify') || params.get('code') || params.get('ticket');
      if (verifyCode) {
        const query = verifyCode.trim();
        setCurrentView('verification'); // Acceso público inmediato al certificado de verificación

        // 1. Intentar verificación en la API de producción
        try {
          const res = await api.verifyPublicTicket(query);
          if (isMounted && res && res.ticket) {
            const t = res.ticket;
            const mapped: Ticket = {
              id: `t-${t.number}`,
              number: t.number,
              formattedNumber: t.formattedNumber,
              raffleId: t.raffleId || 'rf-024',
              price: t.price,
              buyerName: t.buyerName,
              dni: t.dni,
              phone: '***-***-***',
              timestamp: String(t.issuedAt || t.timestamp || new Date().toISOString()),
              timeFormatted: new Date(t.timestamp || Date.now()).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
              verificationCode: t.verificationCode,
              isValid: Boolean(res.valid),
              registeredBy: t.registeredBy || 'Administrador Autorizado',
            };
            setSelectedTicketForVerify(mapped);
            return;
          }
        } catch { if(isMounted)setSelectedTicketForVerify(undefined); }
      }
    };

    handleUrlVerification();
    window.addEventListener('popstate', handleUrlVerification);
    return () => {
      isMounted = false;
      window.removeEventListener('popstate', handleUrlVerification);
    };
  }, [tickets, raffles]);

  const activeRaffle = raffles.find(r => r.id === selectedRaffleId) || raffles[0] || INITIAL_RAFFLES[0];
  const raffleTickets = tickets.filter(t => t.raffleId === activeRaffle?.id);

  // Talonario exclusivo preasignado para el operador en sesión (CERO colisiones de numeración)
  const currentAdminBooklet = getAdminBooklet(
    currentUser?.dni || currentUser?.id || currentUser?.name, currentUser?.bookletNumber
  );
  const currentAdminSold = tickets.filter(t=>t.sellerAdminId===currentUser?.id && t.raffleId===activeRaffle.id && t.isValid!==false && t.status!=='cancelled').length;
  const currentAdminAvailableNumbers = getAdminAvailableNumbers(
    currentAdminBooklet,
    tickets.filter(t=>t.raffleId===activeRaffle.id)
  ).slice(0,Math.max(0,(currentUser?.assignedQuota||20)-currentAdminSold));
  const nextTicketNumber = currentAdminAvailableNumbers.length > 0 
    ? currentAdminAvailableNumbers[0] 
    : currentAdminBooklet.startNumber;
  const availableQuota = currentAdminAvailableNumbers.length;

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
    setTickets([]); setAdmins([]); setAuditLogs([]);
    localStorage.removeItem('rifas_auth_user');
    localStorage.removeItem('rifas_jwt_token');
  };

  // Raffle CRUD
  const handleSaveRaffle = async (savedRaffle: Raffle) => {
    if (!raffles.some(r=>r.id===savedRaffle.id)) await api.createRaffle(savedRaffle); else await api.saveRaffle(savedRaffle);
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

  const handleDeleteRaffle = async (raffleId: string) => {
    try{await api.deleteRaffle(raffleId);}catch(e:any){alert(e.message);return;}
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
  const handleSaveAdmin = async (savedAdmin: AdminUser, password?: string, isNew?: boolean) => {
    const shouldCreate = Boolean(isNew || !savedAdmin.id || savedAdmin.id.startsWith('adm-new'));
    const before=admins.find(a=>a.id===savedAdmin.id);
    const normalize=(name:string)=>name.trim().replace(/\s+/g,' ').toUpperCase();
    const checkDuplicate=shouldCreate || before?.archivedAt || (before && normalize(before.name)!==normalize(savedAdmin.name));
    const duplicate=checkDuplicate && admins.find(a=>a.id!==savedAdmin.id&&!a.archivedAt&&normalize(a.name)===normalize(savedAdmin.name));
    const allowSameName=!!duplicate && window.confirm(`Ya existe ${duplicate.name} con DNI ${duplicate.dni}. ¿Confirmas que la cuenta con DNI ${savedAdmin.dni} corresponde a otra persona?`);
    if(duplicate&&!allowSameName)throw new Error('Revise la cuenta existente antes de guardar.');

    if (shouldCreate) {
      const created=await api.createAdmin({name:savedAdmin.name,dni:savedAdmin.dni || '',email:savedAdmin.email,password,assignedQuota:savedAdmin.assignedQuota,assignedRaffleId:savedAdmin.assignedRaffleId,allowSameName});
      setAdmins(prev=>[...prev,created]);
    } else {
      await api.updateAdmin(savedAdmin.id,{name:savedAdmin.name,dni:savedAdmin.dni,email:savedAdmin.email,status:savedAdmin.status,password,assignedQuota:savedAdmin.assignedQuota,assignedRaffleId:savedAdmin.assignedRaffleId,allowSameName,restore:!!before?.archivedAt&&!savedAdmin.archivedAt});
      setAdmins(await api.getAdmins());
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: dateStr,
      action: 'Gestión de Administrador',
      user: currentUser?.name || 'Marks',
      raffle: 'Plataforma',
      detail: `Operador "${savedAdmin.name}" (${savedAdmin.email}) configurado. Estado: ${savedAdmin.status}.${password ? ' Contraseña actualizada.' : ''}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const target = admins.find(a => a.id === adminId);


    try {
      await api.deleteAdmin(adminId);
      setAdmins(await api.getAdmins());
    } catch (apiErr) {
      alert((apiErr as Error).message); return;
    }

    if (target) {
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
  const handleSavePrize = async (prize: Prize) => {
    if (!prizes.some(p=>p.id===prize.id)) await api.createPrize(prize);
    else await api.updatePrize(prize.id,{name:prize.name,category:prize.category,description:prize.description,order:prize.order,link:prize.link});
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

  const handleDeletePrize = async (prizeId: string) => {
    try{await api.deletePrize(prizeId);}catch(e:any){alert(e.message);return;}
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
          newTickets.some(t=>t.sellerAdminId===a.id && t.raffleId===a.assignedRaffleId)
        ) {
          return {
            ...a,
            totalSold: (a.totalSold || 0) + newTickets.filter(t=>t.sellerAdminId===a.id&&t.raffleId===a.assignedRaffleId).length,
            totalCollected: (a.totalCollected || 0) + newTickets.filter(t=>t.sellerAdminId===a.id&&t.raffleId===a.assignedRaffleId).reduce((sum,t)=>sum+Number(t.price||0),0),
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
      detail: `Boletos ${numRange} emitidos a ${first.buyerName} (DNI ${first.dni}). Total: S/ ${newTickets.reduce((sum,t)=>sum+Number(t.price||0),0).toFixed(2)}.`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleTicketCreated = (newTicket: Ticket) => {
    handleTicketsCreated([newTicket]);
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    try {
      // 1. Persistir directamente en base de datos PostgreSQL
      const result = await api.updateTicket(updatedTicket.id, {
        buyerName: updatedTicket.buyerName,
        dni: updatedTicket.dni,
        phone: updatedTicket.phone,
      });

      // 2. Actualizar estado reactivo en memoria
      setTickets(prev => prev.map(t => (t.id === updatedTicket.id || t.verificationCode === updatedTicket.verificationCode) ? { ...t, ...result.ticket } : t));

      // 3. Registrar auditoría local
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')} Sep ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: dateStr,
        action: 'Actualización de Ticket',
        user: currentUser?.name || 'Administrador',
        raffle: activeRaffle.code,
        detail: `Ticket ${updatedTicket.formattedNumber} actualizado: ${updatedTicket.buyerName} (DNI ${updatedTicket.dni}).`,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err: any) {
      console.error('Error al actualizar ticket en BD:', err);
      throw err;
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    try { await api.cancelTicket(ticketId); } catch (e: any) { alert(e.message); return; }
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, isValid: false, status: 'cancelled' } : t));

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
        if (a.id === target.sellerAdminId && a.assignedRaffleId===target.raffleId) {
          return {
            ...a,
            totalSold: Math.max(0, (a.totalSold || 0) - 1),
            totalCollected: Math.max(0,(a.totalCollected||0)-Number(target.price||0)),
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
  const handleSaveConfig = async (newConfig: SystemConfig) => {
    await api.updateConfig(newConfig);
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

  const handleToggleRaffleStatus = async (raffleId: string) => {
    const target=raffles.find(r=>r.id===raffleId);
    if(!target)return;
    try { await api.saveRaffle({...target,status:target.status==='activa'?'cerrada':'activa'}); } catch(e:any){alert(e.message);return;}
    setRaffles(prev => prev.map(r => {
      if (r.id === raffleId) {
        const nextStatus = r.status === 'activa' ? 'cerrada' : 'activa';
        return { ...r, status: nextStatus };
      }
      return r;
    }));
  };

  const handleResetPrizes = async (raffleId: string) => {
    try {
      await api.resetDraws(raffleId);
    } catch (err) {
      alert((err as Error).message);
      return;
    }
    setPrizes(prev => prev.map(p => {
      if (p.raffleId === raffleId) {
        return {
          ...p,
          isDrawn: false,
          winnerTicket: undefined,
          winnerTicketId: undefined,
          winnerName: undefined,
          winnerPhone: undefined,
          drawnAt: undefined,
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

  const isPublicVerification = currentView === 'verification';
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
      {syncError && <div role="alert" className="p-3 text-sm bg-amber-50 text-amber-800">{syncError}</div>}
      {currentView === 'super_admin' && currentUser?.role === 'super_admin' && (
        <SuperAdminView
          raffles={raffles}
          admins={admins}
          auditLogs={auditLogs}
          prizes={prizes}
          tickets={tickets}
          onVerifyTicket={handleViewVerification}
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
          onOpenRegisterTicket={() => setIsRegisterModalOpen(true)}
          onSwitchToSalesPanel={() => setCurrentView('admin')}
          personalSold={currentAdminSold}
          personalQuota={20}
          onUpdateCurrentUser={(updated) => {
            setCurrentUser(updated);
            try {
              localStorage.setItem('rifas_auth_user', JSON.stringify(updated));
            } catch {
              // safe fallback
            }
          }}
          onUpdateTicket={handleUpdateTicket}
          onResetPrizes={handleResetPrizes}
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
          tickets={tickets.filter(t => t.raffleId === activeRaffle?.id && t.isValid !== false)}
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

      {/* Ticket Registration Modal (Screen 3) with multi-ticket support and exclusive booklets */}
      <TicketRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        nextTicketNumber={nextTicketNumber}
        raffleTitle={activeRaffle?.title || ''}
        raffleCode={activeRaffle?.code || ''}
        raffleId={activeRaffle.id}
        ticketPrice={activeRaffle.ticketPrice}
        onTicketCreated={handleTicketCreated}
        onTicketsCreated={handleTicketsCreated}
        registeredByName={currentUser?.name}
        maxAvailable={availableQuota}
        adminBooklet={currentAdminBooklet}
        availableNumbers={currentAdminAvailableNumbers}
        onViewVerification={(t) => {
          setIsRegisterModalOpen(false);
          handleViewVerification(t);
        }}
      />

      {/* Mandatory password change modal on first login - NUNCA mostrar en verificación pública */}
      {currentUser && currentUser.mustChangePassword && currentView !== 'verification' && (
        <MustChangePasswordModal
          isOpen={Boolean(currentUser.mustChangePassword)}
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChanged}
          onLogout={handleLogout}
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
