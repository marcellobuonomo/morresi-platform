import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Appointment, StaffColumn } from '../../core/api/models';
import { AppointmentChip } from './appointment-chip';
import { dayOfMonth, monthLong, shortDate } from './agenda-dates';
import { onDay } from './agenda-layout';

/** Massimo di appuntamenti per giorno, poi "Altri N" (come su Fresha). */
const MAX_CHIPS = 2;
const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

interface DayCell {
  date: string;
  working: boolean;
  appointments: Appointment[];
}

/** Vista mese: settimane intere da lunedì a domenica, appuntamenti di tutti i collaboratori selezionati. */
@Component({
  selector: 'app-month-view',
  imports: [AppointmentChip],
  template: `
    <div class="month">
      <div class="weekdays">
        @for (w of weekdays; track w) {
          <span>{{ w }}</span>
        }
      </div>
      <div class="days" [style.--weeks]="weeks()">
        @for (cell of cells(); track cell.date) {
          <div class="cell" [class.off]="!cell.working && cell.appointments.length === 0">
            <button
              type="button"
              class="date"
              [class.today]="cell.date === today()"
              [class.other]="cell.date.slice(0, 7) !== month()"
              (click)="dayOpen.emit(cell.date)"
            >
              @if (dayOfMonth(cell.date) === 1) {
                1 {{ monthLong(cell.date) }}
              } @else {
                {{ dayOfMonth(cell.date) }}
              }
            </button>
            @for (a of cell.appointments.slice(0, maxChips); track a.itemId) {
              <app-appointment-chip [appointment]="a" (click)="appointmentOpen.emit(a.appointmentId)" />
            }
            @if (cell.appointments.length > maxChips) {
              <button type="button" class="more" (click)="moreOpen.set(cell.date)">
                Altri {{ cell.appointments.length - maxChips }}
              </button>
            }
            @if (moreOpen() === cell.date) {
              <div class="backdrop" (click)="moreOpen.set(null)"></div>
              <div class="popover" role="dialog">
                <div class="pop-head">
                  <strong>{{ shortDate(cell.date) }}</strong>
                  <button type="button" aria-label="Chiudi" (click)="moreOpen.set(null)">×</button>
                </div>
                @for (a of cell.appointments; track a.itemId) {
                  <app-appointment-chip [appointment]="a" (click)="appointmentOpen.emit(a.appointmentId)" />
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './month-view.scss',
  host: { '(document:keydown.escape)': 'moreOpen.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthView {
  readonly staff = input.required<StaffColumn[]>();
  readonly days = input.required<string[]>();
  /** Mese mostrato, es. "2026-11" */
  readonly month = input.required<string>();
  readonly today = input.required<string>();

  readonly appointmentOpen = output<string>();
  readonly dayOpen = output<string>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly maxChips = MAX_CHIPS;
  protected readonly moreOpen = signal<string | null>(null);
  protected readonly weeks = computed(() => this.days().length / 7);

  protected readonly cells = computed(() =>
    this.days().map(
      (date): DayCell => ({
        date,
        working: this.staff().some((s) => onDay(s.shifts, date).length > 0),
        appointments: this.staff()
          .flatMap((s) => onDay(s.appointments, date))
          .sort((a, b) => a.start.localeCompare(b.start)),
      }),
    ),
  );

  protected readonly dayOfMonth = dayOfMonth;
  protected readonly monthLong = monthLong;
  protected readonly shortDate = shortDate;
}
