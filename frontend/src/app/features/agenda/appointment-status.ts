/**
 * Etichette e colori degli stati, presi da Fresha (2026-11-05): colore del blocco in agenda (color) e
 * intestazione della scheda al passaggio del mouse (head / headText). Arrivato e in attesa di pagamento li
 * abbiamo scelti noi, perché su Fresha non c'erano esempi.
 */
export const STATUS: Record<string, { label: string; color: string; head: string; headText: string }> = {
  PENDING_PAYMENT: { label: 'In attesa di pagamento', color: '#d6e8f9', head: '#2d76ec', headText: '#fff' },
  BOOKED: { label: 'Prenotato', color: '#97c6f0', head: '#2d76ec', headText: '#fff' },
  CONFIRMED: { label: 'Confermato', color: '#97c6f0', head: '#2d76ec', headText: '#fff' },
  ARRIVED: { label: 'Arrivato', color: '#f6d58b', head: '#c98a00', headText: '#fff' },
  COMPLETED: { label: 'Completato', color: '#dee3e7', head: '#dee3e7', headText: '#0d0d0d' },
  NO_SHOW: { label: 'Mancata presentazione', color: '#ff8484', head: '#d4163a', headText: '#fff' },
  CANCELLED: { label: 'Annullato', color: '#ececec', head: '#6b7280', headText: '#fff' },
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

const DEFAULT = STATUS['BOOKED'];

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status;
}

export function statusColor(status: string): string {
  return (STATUS[status] ?? DEFAULT).color;
}

export function statusHead(status: string): { background: string; color: string } {
  const s = STATUS[status] ?? DEFAULT;
  return { background: s.head, color: s.headText };
}

/** "1 mancata presentazione", "3 mancate presentazioni" */
export function noShowLabel(count: number): string {
  return count === 1 ? '1 mancata presentazione' : `${count} mancate presentazioni`;
}

/** Come Fresha: "30 £", "127,28 £" (decimali solo se servono). */
export function formatPrice(minor: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/** Cellulare UK come su Fresha: "+447376187191" → "+44 7376 187191"; gli altri numeri restano come sono. */
export function formatPhone(phone: string): string {
  const uk = /^\+44(\d{4})(\d{6})$/.exec(phone);
  return uk ? `+44 ${uk[1]} ${uk[2]}` : phone;
}
