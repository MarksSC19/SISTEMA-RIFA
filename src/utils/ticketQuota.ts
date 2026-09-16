import { RAW_ADMIN_DATA } from '../mockData';
import { Ticket } from '../types';

export interface AdminBooklet {
  adminNumber: number;
  adminName: string;
  adminDni: string;
  startNumber: number;
  endNumber: number;
  label: string; // Ej: "#0021 al #0040"
}

/**
 * Obtiene el talonario exclusivo preasignado a un administrador.
 * Cada administrador del 1 al 31 tiene un bloque único de 20 boletos (Total 620).
 * Admin 1:  #0001 al #0020
 * Admin 2:  #0021 al #0040 (Jheyson Ryam Jorge Vasquez - Superadmin)
 * ...
 * Admin 31: #0601 al #0620
 */
export const getAdminBooklet = (adminIdentifier?: string | null): AdminBooklet => {
  let n = 2; // Por defecto Jheyson (Admin 2) si no se especifica

  if (adminIdentifier) {
    const clean = adminIdentifier.trim();
    const admMatch = clean.match(/adm-(\d+)/i);
    if (admMatch) {
      n = parseInt(admMatch[1], 10);
    } else {
      const byDni = RAW_ADMIN_DATA.find(
        a => a.dni === clean || 
             a.email.toLowerCase() === clean.toLowerCase() || 
             a.name.toLowerCase() === clean.toLowerCase()
      );
      if (byDni) {
        n = byDni.n;
      }
    }
  }

  // Asegurar rango válido [1, 31]
  n = Math.max(1, Math.min(31, n));

  const adminInfo = RAW_ADMIN_DATA.find(a => a.n === n) || RAW_ADMIN_DATA[1];
  const startNumber = (n - 1) * 20 + 1;
  const endNumber = n * 20;

  return {
    adminNumber: n,
    adminName: adminInfo.name,
    adminDni: adminInfo.dni,
    startNumber,
    endNumber,
    label: `#${String(startNumber).padStart(4, '0')} al #${String(endNumber).padStart(4, '0')}`,
  };
};

/**
 * Retorna los números de boleto que aún están libres y disponibles en el talonario del admin.
 */
export const getAdminAvailableNumbers = (
  booklet: AdminBooklet,
  existingTickets: Ticket[]
): number[] => {
  const occupiedNumbers = new Set(
    existingTickets
      .filter(t => t.number >= booklet.startNumber && t.number <= booklet.endNumber && t.isValid !== false)
      .map(t => t.number)
  );

  const available: number[] = [];
  for (let num = booklet.startNumber; num <= booklet.endNumber; num++) {
    if (!occupiedNumbers.has(num)) {
      available.push(num);
    }
  }
  return available;
};
