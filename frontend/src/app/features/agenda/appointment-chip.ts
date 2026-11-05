import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Appointment } from '../../core/api/models';
import { Icon } from '../../shared/icon';
import { timeOf } from './agenda-dates';
import { statusColor } from './appointment-status';

/** Riga compatta di un appuntamento (viste 3 giorni, settimana, mese e popover "Altri N"). */
@Component({
  selector: 'app-appointment-chip',
  imports: [Icon],
  template: `
    <span class="time">{{ time() }}</span>
    <strong>{{ appointment().clientName ?? 'Senza appuntamento' }}</strong>
    <span class="icons">
      @if (appointment().paid) {
        <app-icon name="tag-filled" [size]="14" title="Pagato interamente" />
      }
      @if (appointment().hasNotes) {
        <app-icon name="note" [size]="14" title="Appuntamento con note" />
      }
      @if (appointment().online) {
        <app-icon name="cloud" [size]="14" title="Prenotazione online" />
      }
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 23px;
      padding: 0 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      cursor: pointer;
    }
    :host(:hover) {
      border-color: #6950f3;
    }
    strong {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .icons {
      display: flex;
      gap: 2px;
      margin-left: auto;
    }
  `,
  host: { '[style.background]': 'color()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentChip {
  readonly appointment = input.required<Appointment>();
  /** true = "10:30 - 11:00" (3 giorni), false = "10:30" (settimana, mese) */
  readonly showEnd = input(false);

  protected readonly color = computed(() => statusColor(this.appointment().status));
  protected readonly time = computed(() => {
    const a = this.appointment();
    return this.showEnd() ? `${timeOf(a.start)} - ${timeOf(a.end)}` : timeOf(a.start);
  });
}
