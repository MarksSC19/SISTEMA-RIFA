export type PlatformRole = 'super_admin' | 'admin' | 'live_draw' | 'verification';

export type RaffleStatus = 'activa' | 'cerrada' | 'sorteo' | 'borrador';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  dni?: string;
  role: 'super_admin' | 'admin';
  assignedRaffleId?: string;
  assignedQuota?: number;
  avatarInitials: string;
}

export interface Prize {
  id: string;
  raffleId: string;
  order: number; // 1 = 1er premio, 2 = 2do premio, etc.
  name: string; // Ej: "Microondas"
  description?: string;
  category?: string;
  valueEstimate?: number;
  link?: string;
  isDrawn: boolean;
  winnerTicket?: {
    ticketNumber: string;
    winnerName: string;
    dni: string;
    drawTimestamp: string;
    drawId: string;
  };
}

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
  prizes?: Prize[];
  winner?: {
    ticketNumber: string;
    winnerName: string;
    dni: string;
    drawTimestamp: string;
    drawId: string;
    prizeName?: string;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  dni?: string;
  email: string;
  password?: string;
  assignedRafflesCount: number;
  totalSold: number;
  assignedQuota: number; // Meta de tickets asignada por el Superadmin (ej: 20)
  status: 'activo' | 'inactivo';
  avatarInitials: string;
  assignedRaffleId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  raffle: string;
  detail: string;
}

export interface SystemConfig {
  organizationName: string;
  currencyName: string;
  currencySymbol: string;
  supportPhone: string;
  receiptMessage: string;
}
