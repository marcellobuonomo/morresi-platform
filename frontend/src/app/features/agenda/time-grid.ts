import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Appointment, StaffColumn, TimeBlock, TimeRange } from '../../core/api/models';
import { Icon } from '../../shared/icon';
import { AgendaView, dayOfMonth, minutesToTime, SALON_TIMEZONE, timeOf, weekdayLong } from './agenda-dates';
import {
  DAY_MINUTES,
  initials,
  minuteOfDay,
  minutesToPx,
  offShiftRanges,
  PlacedBlock,
  placeAppointments,
} from './agenda-layout';
import { avatarColors } from './avatar';
import { BLOCK_COLOR, BLOCK_LABEL, formatPrice, statusColor, statusLabel } from './appointment-status';

/** Una colonna della griglia: un collaboratore in un giorno. */
export interface GridColumn {
  key: string;
  date: string;
  staff: StaffColumn;
  colorIndex: number;
  /** 'staff' = intestazione con avatar (vista giorno), 'day' = intestazione con il giorno (un solo collaboratore) */
  header: 'staff' | 'day';
  shifts: TimeRange[];
  blocks: TimeBlock[];
  appointments: Appointment[];
}

export interface SlotRequest {
  staffId: string;
  date: string;
  minute: number;
}

interface Slot {
  key: string;
  minute: number;
}

const STAFF_VIEWS: { view: AgendaView; label: string; icon: string }[] = [
  { view: 'day', label: 'Visualizzazione giornaliera', icon: 'day' },
  { view: '3days', label: 'Visualizzazione a 3 giorni', icon: 'three-days' },
  { view: 'week', label: 'Visualizzazione settimanale', icon: 'week' },
  { view: 'month', label: 'Visualizzazione mensile', icon: 'month' },
];

/** Griglia oraria (presentational): colonne affiancate, ore in verticale, passo di 15 minuti. */
@Component({
  selector: 'app-time-grid',
  imports: [Icon],
  templateUrl: './time-grid.html',
  styleUrl: './time-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeGrid {
  readonly columns = input.required<GridColumn[]>();
  readonly hourPx = input(96);
  readonly today = input.required<string>();
  /** Collaboratore mostrato a sinistra quando le colonne sono giorni */
  readonly singleStaff = input<StaffColumn | null>(null);

  readonly appointmentOpen = output<string>();
  readonly newAppointment = output<SlotRequest>();
  readonly staffView = output<{ staffId: string; view: AgendaView }>();
  readonly dayOpen = output<string>();

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly staffViews = STAFF_VIEWS;
  protected readonly hours = Array.from({ length: 24 }, (_, h) => h);
  protected readonly dayHeight = computed(() => 24 * this.hourPx());
  protected readonly quarterPx = computed(() => this.hourPx() / 4);

  protected readonly layout = computed(() => {
    const hourPx = this.hourPx();
    return this.columns().map((col) => ({
      col,
      initials: initials(col.staff.fullName),
      avatar: avatarColors(col.colorIndex, col.staff.calendarColor),
      offShift: offShiftRanges(col.shifts, col.date, hourPx),
      blocks: col.blocks.map((b) => ({
        block: b,
        top: minutesToPx(minuteOfDay(b.start, col.date), hourPx),
        height: minutesToPx(minuteOfDay(b.end, col.date) - minuteOfDay(b.start, col.date), hourPx),
      })),
      appointments: placeAppointments(col.appointments, col.date, hourPx),
    }));
  });

  protected readonly hasToday = computed(() => this.columns().some((c) => c.date === this.today()));

  // Stato delle interazioni (solo visivo)
  protected readonly hoverSlot = signal<Slot | null>(null);
  protected readonly slotMenu = signal<Slot | null>(null);
  protected readonly hoverCard = signal<{ key: string; block: PlacedBlock<Appointment> } | null>(null);
  protected readonly staffMenu = signal<string | null>(null);

  /** Ora attuale nel fuso del salone, aggiornata ogni minuto. */
  private readonly nowMinute = signal(salonMinuteNow());
  protected readonly nowTop = computed(() => minutesToPx(this.nowMinute(), this.hourPx()));
  protected readonly nowLabel = computed(() => minutesToTime(this.nowMinute()));

  constructor() {
    const timer = setInterval(() => this.nowMinute.set(salonMinuteNow()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Quando cambiano le colonne scorre a mezz'ora prima del primo turno o appuntamento (o alle 9:00), come su Fresha.
    afterRenderEffect(() => {
      const starts = this.columns().flatMap((c) =>
        [...c.shifts, ...c.appointments].map((r) => minuteOfDay(r.start, c.date)).filter((m) => m < DAY_MINUTES),
      );
      const first = starts.length ? Math.min(...starts) : 9 * 60;
      this.scroller().nativeElement.scrollTop = minutesToPx(Math.max(first - 30, 0), this.hourPx());
    });
  }

  protected onColumnMove(event: MouseEvent, key: string): void {
    if ((event.target as HTMLElement).closest('.appt, .block')) {
      this.hoverSlot.set(null);
      return;
    }
    this.hoverSlot.set({ key, minute: this.minuteAt(event) });
  }

  protected onColumnClick(event: MouseEvent, key: string): void {
    if ((event.target as HTMLElement).closest('.appt, .block, .slot-menu')) {
      return;
    }
    this.slotMenu.set({ key, minute: this.minuteAt(event) });
  }

  protected addAppointment(col: GridColumn, minute: number): void {
    this.slotMenu.set(null);
    this.staffMenu.set(null);
    this.newAppointment.emit({ staffId: col.staff.id, date: col.date, minute });
  }

  protected chooseStaffView(staffId: string, view: AgendaView): void {
    this.staffMenu.set(null);
    this.staffView.emit({ staffId, view });
  }

  protected firstShiftMinute(col: GridColumn): number {
    return col.shifts.length ? minuteOfDay(col.shifts[0].start, col.date) : 9 * 60;
  }

  protected slotTop(minute: number): number {
    return minutesToPx(minute, this.hourPx());
  }

  protected hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  protected timeRange(a: Appointment): string {
    return `${timeOf(a.start)} - ${timeOf(a.end)}`;
  }

  protected duration(a: Appointment): number {
    return (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60_000;
  }

  protected readonly minutesToTime = minutesToTime;
  protected readonly statusColor = statusColor;
  protected readonly statusLabel = statusLabel;
  protected readonly formatPrice = formatPrice;
  protected readonly weekdayLong = weekdayLong;
  protected readonly dayOfMonth = dayOfMonth;
  protected readonly blockColor = BLOCK_COLOR;
  protected readonly initials = initials;

  protected blockLabel(block: TimeBlock): string {
    return block.reason ?? BLOCK_LABEL[block.type] ?? block.type;
  }

  private minuteAt(event: MouseEvent): number {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const quarter = Math.floor((event.clientY - rect.top) / this.quarterPx());
    return Math.min(Math.max(quarter, 0), 95) * 15;
  }
}

function salonMinuteNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return value('hour') * 60 + value('minute');
}
