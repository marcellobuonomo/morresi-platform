import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AgendaDay } from '../../core/api/models';
import {
  HOUR_PX,
  initials,
  minuteOfDay,
  minutesToPx,
  offShiftRanges,
  placeAppointments,
} from './agenda-layout';

/** Colori dell'avatar quando il collaboratore non ha un calendar_color (sfondo, testo). */
const AVATAR_PALETTE: [string, string][] = [
  ['#EBF8FE', '#0075A8'],
  ['#FFF3E5', '#B35C00'],
  ['#FDEDF6', '#A8326E'],
  ['#E8F8F4', '#0B7A5F'],
  ['#F1EEFE', '#5B43C9'],
  ['#F0F7E6', '#4E7A12'],
];

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'In attesa di pagamento',
  BOOKED: 'Prenotato',
  CONFIRMED: 'Confermato',
  ARRIVED: 'Arrivato',
  COMPLETED: 'Completato',
  NO_SHOW: 'Mancata presentazione',
};

/** Griglia giorno (presentational): una colonna per collaboratore, 96 px per ora. */
@Component({
  selector: 'app-agenda-grid',
  templateUrl: './agenda-grid.html',
  styleUrl: './agenda-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaGrid {
  readonly day = input.required<AgendaDay>();
  readonly isToday = input(false);

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly hours = Array.from({ length: 24 }, (_, h) => h);
  protected readonly hourPx = HOUR_PX;
  protected readonly dayHeight = 24 * HOUR_PX;

  protected readonly columns = computed(() => {
    const day = this.day();
    return day.staff.map((staff, index) => {
      const [bg, fg] = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
      return {
        staff,
        initials: initials(staff.fullName),
        avatarBg: bg,
        avatarFg: staff.calendarColor ?? fg,
        offShift: offShiftRanges(staff.shifts, day.date),
        blocks: placeAppointments(staff.appointments, day.date),
      };
    });
  });

  /** Ora attuale nel fuso del salone, aggiornata ogni minuto. */
  private readonly nowMinute = signal(this.salonMinuteNow());
  protected readonly nowTop = computed(() => minutesToPx(this.nowMinute()));
  protected readonly nowLabel = computed(() => {
    const m = this.nowMinute();
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.nowMinute.set(this.salonMinuteNow()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // A ogni cambio di giorno scorre a mezz'ora prima del primo turno o appuntamento (o alle 9:00), come su Fresha.
    afterRenderEffect(() => {
      const day = this.day();
      const starts = day.staff.flatMap((s) =>
        [...s.shifts, ...s.appointments].map((r) => minuteOfDay(r.start, day.date)),
      );
      const first = starts.length ? Math.min(...starts) : 9 * 60;
      this.scroller().nativeElement.scrollTop = minutesToPx(Math.max(first - 30, 0));
    });
  }

  protected hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  protected timeRange(start: string, end: string): string {
    return `${start.slice(11, 16)} - ${end.slice(11, 16)}`;
  }

  protected statusLabel(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected price(minor: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
  }

  private salonMinuteNow(): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return value('hour') * 60 + value('minute');
  }
}
