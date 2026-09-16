/**
 * Utilidades de fecha y hora para la República del Perú (Zona Horaria America/Lima, UTC-5)
 * Evita el desfase de +5 horas cuando el backend o frontend corre en servidores con hora UTC (como Render)
 */

export const getPeruDate = (): Date => {
  return new Date();
};

/**
 * Retorna la hora formateada en formato 12 horas: ej. "11:42 a. m." o "08:15 p. m." en hora peruana
 */
export const formatPeruTime = (dateInput?: string | number | Date | null): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * Retorna la fecha completa: ej. "16 Sep 2026 · 11:42 a. m." en hora peruana
 */
export const formatPeruDateTime = (dateInput?: string | number | Date | null): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * Retorna formato ISO local aproximado de Perú: YYYY-MM-DD HH:mm:ss
 */
export const formatPeruDateIso = (dateInput?: string | number | Date | null): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();
  
  const formatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach(p => { map[p.type] = p.value; });
  
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
};
