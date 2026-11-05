import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Drawer } from '../../shared/drawer';
import { Icon } from '../../shared/icon';
import { minutesToTime, shortDate, timeOf } from './agenda-dates';
import { AgendaService } from './agenda.service';
import { formatPhone, formatPrice, STATUS_MENU, statusHead, statusLabel } from './appointment-status';

/**
 * Dettaglio appuntamento come su Fresha: a sinistra la scheda cliente, a destra data, stato, servizi e totale.
 * Per ora in sola lettura: i menu si aprono ma le voci non salvano nulla (arriva con A-04).
 */
@Component({
  selector: 'app-appointment-drawer',
  imports: [Drawer, Icon],
  templateUrl: './appointment-drawer.html',
  styleUrl: './appointment-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentDrawer {
  private readonly agenda = inject(AgendaService);

  readonly appointmentId = input.required<string>();
  readonly closed = output<void>();

  protected readonly detail = rxResource({
    params: () => this.appointmentId(),
    stream: ({ params }) => this.agenda.getAppointment(params),
  });

  protected readonly menu = signal<'status' | 'more' | 'client' | null>(null);
  protected readonly statusMenu = STATUS_MENU;

  protected readonly toPay = computed(() => {
    const d = this.detail.value();
    return d ? Math.max(d.totalMinor - d.paidMinor, 0) : 0;
  });

  /** Intestazione colorata per stato, come la scheda al passaggio del mouse (blu, grigia, rossa...). */
  protected readonly head = computed(() => statusHead(this.detail.value()?.status ?? 'BOOKED'));

  protected readonly shortDate = shortDate;
  protected readonly timeOf = timeOf;
  protected readonly statusLabel = statusLabel;
  protected readonly formatPrice = formatPrice;
  protected readonly formatPhone = formatPhone;

  protected endTime(start: string, durationMinutes: number): string {
    const [h, m] = timeOf(start).split(':').map(Number);
    return minutesToTime(h * 60 + m + durationMinutes);
  }

  protected durationLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  }

  protected clientSince(isoLocal: string): string {
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${isoLocal.slice(0, 10)}T12:00:00Z`),
    );
  }

  protected birthDate(iso: string): string {
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      new Date(`${iso}T12:00:00Z`),
    );
  }
}
