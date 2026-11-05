import { Appointment, TimeRange } from '../../core/api/models';

/** Altezza di un'ora nella griglia: 96 px come su Fresha ("Medio piccolo"); cambia con lo zoom. */
export const HOUR_PX = 96;
export const DAY_MINUTES = 24 * 60;

/** Un blocco posizionato nella colonna: top/height in px, left/width in % della colonna. */
export interface PlacedBlock<T> {
  item: T;
  top: number;
  height: number;
  left: number;
  width: number;
}

/** Minuti dalla mezzanotte del giorno mostrato; gli orari fuori dal giorno vengono tagliati a 0..1440. */
export function minuteOfDay(isoLocal: string, day: string): number {
  const date = isoLocal.slice(0, 10);
  if (date < day) {
    return 0;
  }
  if (date > day) {
    return DAY_MINUTES;
  }
  return Number(isoLocal.slice(11, 13)) * 60 + Number(isoLocal.slice(14, 16));
}

export function minutesToPx(minutes: number, hourPx = HOUR_PX): number {
  return (minutes * hourPx) / 60;
}

/**
 * Posiziona gli appuntamenti di una colonna. Quelli che si sovrappongono stanno affiancati in corsie
 * della stessa larghezza (es. due appuntamenti alle 18:00 → 50% ciascuno), come su Fresha.
 */
export function placeAppointments(
  appointments: Appointment[],
  day: string,
  hourPx = HOUR_PX,
): PlacedBlock<Appointment>[] {
  const sorted = appointments
    .map((item) => ({ item, start: minuteOfDay(item.start, day), end: minuteOfDay(item.end, day) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: PlacedBlock<Appointment>[] = [];
  let group: { item: Appointment; start: number; end: number; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    const lanes = laneEnds.length;
    for (const g of group) {
      placed.push({
        item: g.item,
        top: minutesToPx(g.start, hourPx),
        height: minutesToPx(g.end - g.start, hourPx),
        left: (g.lane * 100) / lanes,
        width: 100 / lanes,
      });
    }
    group = [];
    laneEnds = [];
  };

  for (const a of sorted) {
    if (a.start >= groupEnd) {
      closeGroup();
      groupEnd = -1;
    }
    let lane = laneEnds.findIndex((end) => end <= a.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(a.end);
    } else {
      laneEnds[lane] = a.end;
    }
    group.push({ ...a, lane });
    groupEnd = Math.max(groupEnd, a.end);
  }
  closeGroup();
  return placed;
}

/** Fasce fuori turno (tratteggiate): il complemento dei turni nel giorno. */
export function offShiftRanges(
  shifts: TimeRange[],
  day: string,
  hourPx = HOUR_PX,
): { top: number; height: number }[] {
  const ranges: { top: number; height: number }[] = [];
  let cursor = 0;
  const sorted = shifts
    .map((s) => ({ start: minuteOfDay(s.start, day), end: minuteOfDay(s.end, day) }))
    .sort((a, b) => a.start - b.start);
  for (const s of sorted) {
    if (s.start > cursor) {
      ranges.push({ top: minutesToPx(cursor, hourPx), height: minutesToPx(s.start - cursor, hourPx) });
    }
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < DAY_MINUTES) {
    ranges.push({ top: minutesToPx(cursor, hourPx), height: minutesToPx(DAY_MINUTES - cursor, hourPx) });
  }
  return ranges;
}

/** Elementi (turni, fasce bloccate, appuntamenti) che toccano il giorno. */
export function onDay<T extends { start: string; end: string }>(items: T[], day: string): T[] {
  return items.filter((i) => i.start.slice(0, 10) <= day && i.end.slice(0, 10) >= day && i.end !== `${day}T00:00:00`);
}

/** Iniziali per l'avatar: "Giuseppe Peppe" → "GP". */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
