export type PlatformRole = 'super_admin' | 'admin' | 'live_draw' | 'verification';

export type RaffleStatus = 'activa' | 'cerrada' | 'sorteo' | 'borrador';

export interface Ticket {
  id: string;
  number: number;
  formattedNumber: string;
  raffleId: string;
  buyerName: string;
  dni: string;
  phone: string;
  timestamp: string;
  timeFormatted: string;
  verificationCode: string;
  isValid: boolean;
  registeredBy: string;
}

export interface Raffle {
  id: string;
  code: string;
  title: string;
  description: string;
  status: RaffleStatus;
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  drawDate: string;
  currency: string;
  assignedAdmin: string;
  winner?: {
    ticketNumber: string;
    winnerName: string;
    dni: string;
    drawTimestamp: string;
    drawId: string;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  assignedRafflesCount: number;
  totalSold: number;
  status: 'activo' | 'inactivo';
  avatarInitials: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  raffle: string;
  detail: string;
}
