import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Drawer } from '../../shared/drawer';
import { Icon } from '../../shared/icon';
import { AgendaService } from './agenda.service';
import { formatPrice } from './appointment-status';

/** Colori della barra laterale per categoria, come su Fresha. */
const CATEGORY_COLORS = ['#e86ab3', '#97c6f0', '#f6b26b', '#7bc8a4', '#a78bfa', '#f28b82'];

/**
 * Nuovo appuntamento come su Fresha: cliente a sinistra, servizi per categoria a destra.
 * Per ora solo consultazione: la scelta e il salvataggio arrivano con A-04.
 */
@Component({
  selector: 'app-new-appointment-drawer',
  imports: [Drawer, Icon],
  template: `
    <app-drawer label="Nuovo appuntamento" [width]="660" (closed)="closed.emit()">
      <div class="layout">
        <aside class="client">
          <button type="button" class="add-client">
            <span class="icon"><app-icon name="user-plus" [size]="22" /></span>
            <strong>Aggiungi cliente</strong>
            <span class="muted">Oppure lascia vuoto per clienti senza appuntamento</span>
          </button>
        </aside>
        <section class="services">
          <h2>Seleziona un servizio</h2>
          @if (slotLabel()) {
            <p class="muted">{{ slotLabel() }}</p>
          }
          <label class="search">
            <app-icon name="search" [size]="18" />
            <input type="search" placeholder="Cerca per nome del servizio" (input)="query.set($any($event.target).value)" />
          </label>
          @for (cat of categories(); track cat.name; let i = $index) {
            <h3>{{ cat.name ?? 'Altri servizi' }} <span class="count">{{ cat.services.length }}</span></h3>
            @for (s of cat.services; track s.id) {
              <button type="button" class="service" [style.border-left-color]="color(i)">
                <span>
                  <strong>{{ s.name }}</strong>
                  <span class="muted">{{ duration(s.durationMinutes) }}</span>
                </span>
                <span class="price">
                  @if (s.priceType === 'FROM') {
                    <span class="muted">a partire da</span>
                  }
                  {{ formatPrice(s.priceMinor) }}
                </span>
              </button>
            }
          }
        </section>
      </div>
    </app-drawer>
  `,
  styleUrl: './new-appointment-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewAppointmentDrawer {
  private readonly agenda = inject(AgendaService);

  /** Es. "gio 5 nov · 15:45 · Salvatore", vuoto se aperto da "Aggiungi" */
  readonly slotLabel = input('');
  readonly closed = output<void>();

  protected readonly query = signal('');
  private readonly services = rxResource({ stream: () => this.agenda.getServices() });

  protected readonly categories = computed(() => {
    const q = this.query().trim().toLowerCase();
    return (this.services.value()?.categories ?? [])
      .map((c) => ({ ...c, services: c.services.filter((s) => s.name.toLowerCase().includes(q)) }))
      .filter((c) => c.services.length > 0);
  });

  protected readonly formatPrice = formatPrice;

  protected color(index: number): string {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  }

  protected duration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return [h ? `${h} ${h === 1 ? 'ora' : 'ore'}` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  }
}
