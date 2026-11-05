/** Etichette e colori degli stati: prenotato azzurro e completato grigio come su Fresha, gli altri scelti da noi. */
export const STATUS: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'In attesa di pagamento', color: '#d6e8f9' },
  BOOKED: { label: 'Prenotato', color: '#97c6f0' },
  CONFIRMED: { label: 'Confermato', color: '#97c6f0' },
  ARRIVED: { label: 'Arrivato', color: '#f6d58b' },
  COMPLETED: { label: 'Completato', color: '#dee3e7' },
  NO_SHOW: { label: 'Mancata presentazione', color: '#f5b8b8' },
  CANCELLED: { label: 'Annullato', color: '#ececec' },
};

/** Voci del menu stato nel cassetto (come Fresha, senza "Iniziato"). */
export const STATUS_MENU = ['BOOKED', 'CONFIRMED', 'ARRIVED', 'NO_SHOW'];

/** Colore delle fasce bloccate (es. "SICK" su Fresha). */
export const BLOCK_COLOR = '#aab2ba';

export const BLOCK_LABEL: Record<string, string> = {
  TIME_OFF: 'Ferie',
  SICK: 'Malattia',
  BREAK: 'Pausa',
  TRAINING: 'Formazione',
  OTHER: 'Bloccato',
};

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status;
}

export function statusColor(status: string): string {
  return STATUS[status]?.color ?? '#97c6f0';
}

export function formatPrice(minor: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}
