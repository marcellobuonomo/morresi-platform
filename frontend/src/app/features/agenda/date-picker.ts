import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '../../shared/icon';
import { addDays, addMonths, dayOfMonth, monthYear } from './agenda-dates';

const WEEKDAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

/** Scelta della data come su Fresha: due mesi affiancati e le scorciatoie "Tra N settimane". */
@Component({
  selector: 'app-date-picker',
  imports: [Icon],
  template: `
    <div class="picker" role="dialog" aria-label="Scegli la data">
      <div class="months">
        @for (m of months(); track m.first; let i = $index) {
          <div class="month">
            <div class="month-head">
              @if (i === 0) {
                <button type="button" class="nav" aria-label="Mese precedente" (click)="shift(-1)">
                  <app-icon name="chevron-left" [size]="18" />
                </button>
              } @else {
                <span></span>
              }
              <strong>{{ m.label }}</strong>
              @if (i === 1) {
                <button type="button" class="nav" aria-label="Mese successivo" (click)="shift(1)">
                  <app-icon name="chevron-right" [size]="18" />
                </button>
              } @else {
                <span></span>
              }
            </div>
            <div class="days">
              @for (w of weekdays; track w) {
                <span class="weekday">{{ w }}</span>
              }
              @for (d of m.days; track $index) {
                @if (d) {
                  <button
                    type="button"
                    class="day"
                    [class.selected]="d === selected()"
                    [class.today]="d === today()"
                    (click)="picked.emit(d)"
                  >
                    {{ dayOfMonth(d) }}
                  </button>
                } @else {
                  <span></span>
                }
              }
            </div>
          </div>
        }
      </div>
      <div class="shortcuts">
        @for (w of [1, 2, 3, 4, 5]; track w) {
          <button type="button" (click)="picked.emit(addDays(today(), 7 * w))">
            Tra {{ w }} {{ w === 1 ? 'settimana' : 'settimane' }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .picker {
      position: absolute;
      top: 44px;
      left: 0;
      z-index: 20;
      padding: 20px 24px;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 32px rgb(0 0 0 / 16%);
    }
    .months {
      display: flex;
      gap: 40px;
    }
    .month {
      width: 280px;
    }
    .month-head {
      display: grid;
      grid-template-columns: 32px 1fr 32px;
      align-items: center;
      margin-bottom: 12px;
      text-align: center;
      font-size: 15px;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: none;
      cursor: pointer;
      &:hover {
        background: #f2f2f2;
      }
    }
    .days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      text-align: center;
    }
    .weekday {
      font-size: 12px;
      color: #8a8a8a;
    }
    .day {
      height: 34px;
      border: 2px solid transparent;
      border-radius: 8px;
      background: none;
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      &:hover {
        background: #f2f2f2;
      }
      &.today {
        color: #6950f3;
        font-weight: 600;
      }
      &.selected {
        border-color: #6950f3;
        background: #6950f3;
        color: #fff;
      }
    }
    .shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
      button {
        height: 32px;
        padding: 0 14px;
        border: 1px solid #d3d3d3;
        border-radius: 999px;
        background: #fff;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        &:hover {
          background: #f5f5f5;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePicker {
  readonly selected = input.required<string>();
  readonly today = input.required<string>();
  readonly picked = output<string>();

  /** Primo mese mostrato (sposta con le frecce). */
  private readonly offset = signal(0);

  protected readonly weekdays = WEEKDAYS;
  protected readonly months = computed(() => {
    const first = addMonths(this.selected(), this.offset());
    return [first, addMonths(first, 1)].map((start) => {
      const end = addDays(addMonths(start, 1), -1);
      const leading = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7;
      const days: (string | null)[] = Array.from({ length: leading }, () => null);
      for (let d = start; d <= end; d = addDays(d, 1)) {
        days.push(d);
      }
      return { first: start, label: monthYear(start), days };
    });
  });

  protected shift(direction: number): void {
    this.offset.update((o) => o + direction);
  }

  protected readonly dayOfMonth = dayOfMonth;
  protected readonly addDays = addDays;
}
