import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Appointment, StaffColumn } from '../../core/api/models';
import { AppointmentChip } from './appointment-chip';
import { dayOfMonth, shortDate, weekdayLong } from './agenda-dates';
import { initials, onDay } from './agenda-layout';
import { avatarColors } from './avatar';

/** Massimo di appuntamenti per cella, poi "Altri N" (come su Fresha). */
const MAX_CHIPS = 4;

interface Cell {
  key: string;
  date: string;
  working: boolean;
  appointments: Appointment[];
}

/**
 * Viste 3 giorni e settimana con più collaboratori, come su Fresha: righe = collaboratori,
 * colonne = giorni, in ogni cella gli appuntamenti in ordine di orario.
 */
@Component({
  selector: 'app-matrix-view',
  imports: [AppointmentChip],
  template: `
    <div class="matrix" [style.--days]="days().length">
      <div class="head">
        <div class="corner"></div>
        @for (d of days(); track d) {
          <button
            type="button"
            class="day-head"
            [class.today]="d === today()"
            [class.past]="d < today()"
            (click)="dayOpen.emit(d)"
          >
            <span class="day-num">{{ dayOfMonth(d) }}</span>
            <span>{{ weekdayLong(d) }}</span>
          </button>
        }
      </div>

      @for (row of rows(); track row.staff.id) {
        <div class="row">
          <button type="button" class="staff" (click)="staffOpen.emit(row.staff.id)">
            <span class="avatar" [style.background]="row.avatar.bg" [style.color]="row.avatar.fg">{{ row.initials }}</span>
            <span class="name">{{ row.staff.fullName }}</span>
          </button>
          @for (cell of row.cells; track cell.key) {
            <div class="cell" [class.off]="!cell.working && cell.appointments.length === 0">
              @for (a of cell.appointments.slice(0, maxChips); track a.itemId) {
                <app-appointment-chip [appointment]="a" [showEnd]="showEnd()" (click)="appointmentOpen.emit(a.appointmentId)" />
              }
              @if (cell.appointments.length > maxChips) {
                <button type="button" class="more" (click)="moreOpen.set(cell.key)">Altri {{ cell.appointments.length - maxChips }}</button>
              }
              @if (moreOpen() === cell.key) {
                <div class="backdrop" (click)="moreOpen.set(null)"></div>
                <div class="popover" role="dialog">
                  <div class="pop-head">
                    <strong>{{ shortDate(cell.date) }} · {{ row.staff.displayName }}</strong>
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
      }
    </div>
  `,
  styleUrl: './matrix-view.scss',
  host: { '(document:keydown.escape)': 'moreOpen.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatrixView {
  readonly staff = input.required<StaffColumn[]>();
  readonly colorIndex = input.required<Map<string, number>>();
  readonly days = input.required<string[]>();
  readonly today = input.required<string>();
  /** 3 giorni: "10:30 - 11:00"; settimana: "10:30" */
  readonly showEnd = input(false);

  readonly appointmentOpen = output<string>();
  readonly dayOpen = output<string>();
  readonly staffOpen = output<string>();

  protected readonly maxChips = MAX_CHIPS;
  protected readonly moreOpen = signal<string | null>(null);

  protected readonly rows = computed(() =>
    this.staff().map((staff) => ({
      staff,
      initials: initials(staff.fullName),
      avatar: avatarColors(this.colorIndex().get(staff.id) ?? 0, staff.calendarColor),
      cells: this.days().map(
        (date): Cell => ({
          key: `${staff.id}|${date}`,
          date,
          working: onDay(staff.shifts, date).length > 0,
          appointments: onDay(staff.appointments, date),
        }),
      ),
    })),
  );

  protected readonly dayOfMonth = dayOfMonth;
  protected readonly weekdayLong = weekdayLong;
  protected readonly shortDate = shortDate;
}
