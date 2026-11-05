/** Date in formato ISO (2026-11-05), sempre nel fuso del salone. */

export type AgendaView = 'day' | '3days' | 'week' | 'month';

export const VIEWS: { id: AgendaView; label: string; icon: string }[] = [
  { id: 'day', label: 'Giorno', icon: 'day' },
  { id: '3days', label: '3 giorni', icon: 'three-days' },
  { id: 'week', label: 'Settimana', icon: 'week' },
  { id: 'month', label: 'Mese', icon: 'month' },
];

export const SALON_TIMEZONE = 'Europe/London';

export function todayInSalon(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SALON_TIMEZONE }).format(new Date());
}

function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function addMonths(iso: string, months: number): string {
  const date = toDate(iso);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toIso(date);
}

/** Lunedì della settimana che contiene la data. */
export function startOfWeek(iso: string): string {
  const weekday = (toDate(iso).getUTCDay() + 6) % 7; // 0 = lunedì
  return addDays(iso, -weekday);
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

/** Giorni mostrati da una vista. Il mese mostra settimane intere, da lunedì a domenica. */
export function visibleRange(view: AgendaView, date: string): { from: string; to: string } {
  switch (view) {
    case 'day':
      return { from: date, to: date };
    case '3days':
      return { from: date, to: addDays(date, 2) };
    case 'week': {
      const from = startOfWeek(date);
      return { from, to: addDays(from, 6) };
    }
    case 'month': {
      const first = `${date.slice(0, 8)}01`;
      const last = addDays(addMonths(date, 1), -1);
      return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) };
    }
  }
}

/** Data dopo le frecce ‹ ›: un passo della vista. */
export function stepDate(view: AgendaView, date: string, direction: 1 | -1): string {
  switch (view) {
    case 'day':
      return addDays(date, direction);
    case '3days':
      return addDays(date, 3 * direction);
    case 'week':
      return addDays(date, 7 * direction);
    case 'month':
      return addMonths(date, direction);
  }
}

function format(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('it-IT', { ...options, timeZone: 'UTC' }).format(toDate(iso));
}

/** Etichetta della toolbar: "gio 5 nov", "02–08 nov 2026", "30 ott–01 nov 2026", "novembre 2026". */
export function rangeLabel(view: AgendaView, date: string): string {
  if (view === 'day') {
    return format(date, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  if (view === 'month') {
    return format(date, { month: 'long', year: 'numeric' });
  }
  const { from, to } = visibleRange(view, date);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const start = sameMonth ? from.slice(8) : format(from, { day: '2-digit', month: 'short' });
  return `${start}–${format(to, { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

export function weekdayLong(iso: string): string {
  return format(iso, { weekday: 'long' });
}

export function weekdayShort(iso: string): string {
  return format(iso, { weekday: 'short' });
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8));
}

export function monthLong(iso: string): string {
  return format(iso, { month: 'long' });
}

export function monthYear(iso: string): string {
  return format(iso, { month: 'long', year: 'numeric' });
}

/** Etichetta lunga per il cassetto: "gio 5 nov". */
export function shortDate(iso: string): string {
  return format(iso, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "2026-11-05T15:00:00" → "15:00" */
export function timeOf(isoLocal: string): string {
  return isoLocal.slice(11, 16);
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
