import { ChangeDetectionStrategy, Component, input, OnInit, output, signal } from '@angular/core';
import { Drawer } from '../../shared/drawer';
import { Icon } from '../../shared/icon';

/** Livelli di zoom del calendario (altezza di un'ora). Fresha parte da "Medio piccolo". */
export const ZOOM_LEVELS = [
  { label: 'Piccolo', hourPx: 64 },
  { label: 'Medio piccolo', hourPx: 96 },
  { label: 'Medio', hourPx: 128 },
  { label: 'Medio grande', hourPx: 160 },
  { label: 'Grande', hourPx: 192 },
];

/** Impostazioni del calendario: lo zoom funziona, le azioni rapide sono sempre attive. */
@Component({
  selector: 'app-calendar-settings-drawer',
  imports: [Drawer],
  template: `
    <app-drawer label="Impostazioni del calendario" (closed)="closed.emit()">
      <div class="body">
        <h2>Impostazioni del calendario</h2>
        <div class="zoom-head">
          <strong>Zoom per il calendario</strong>
          <span>{{ levels[level()].label }}</span>
        </div>
        <input
          type="range"
          min="0"
          [max]="levels.length - 1"
          [value]="level()"
          (input)="level.set(+$any($event.target).value)"
        />
        <hr />
        <label class="toggle">
          <span>
            <strong>Mostra azioni rapide sul calendario</strong>
            <small>Aggiungi rapidamente appuntamenti o fasce orarie bloccate cliccando su uno spazio libero.</small>
          </span>
          <input type="checkbox" checked disabled />
        </label>
      </div>
      <footer><button type="button" class="apply" (click)="applied.emit(levels[level()].hourPx)">Applica le modifiche</button></footer>
    </app-drawer>
  `,
  styleUrl: './toolbar-drawers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSettingsDrawer implements OnInit {
  readonly hourPx = input.required<number>();
  readonly closed = output<void>();
  readonly applied = output<number>();

  protected readonly levels = ZOOM_LEVELS;
  protected readonly level = signal(1);

  ngOnInit(): void {
    this.level.set(Math.max(ZOOM_LEVELS.findIndex((z) => z.hourPx === this.hourPx()), 0));
  }
}

/** "Tutti i filtri" con le sezioni di Fresha (per ora solo l'aspetto). */
@Component({
  selector: 'app-filters-drawer',
  imports: [Drawer, Icon],
  template: `
    <app-drawer label="Tutti i filtri" (closed)="closed.emit()">
      <div class="body">
        <h2>Tutti i filtri</h2>
        @for (f of filters; track f.label) {
          <button type="button" class="filter-row">
            <app-icon [name]="f.icon" [size]="20" />
            <span>{{ f.label }}</span>
            <app-icon name="chevron-down" [size]="18" />
          </button>
        }
      </div>
      <footer class="two">
        <button type="button" class="secondary">Cancella filtri</button>
        <button type="button" class="apply" (click)="closed.emit()">Applica</button>
      </footer>
    </app-drawer>
  `,
  styleUrl: './toolbar-drawers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersDrawer {
  readonly closed = output<void>();

  protected readonly filters = [
    { label: "Stato dell'appuntamento", icon: 'calendar' },
    { label: 'Canale', icon: 'cloud' },
    { label: 'Stato del pagamento', icon: 'cash' },
    { label: 'Servizi', icon: 'tag' },
    { label: "Data di creazione dell'appuntamento", icon: 'calendar' },
    { label: 'Membro del team specifico', icon: 'heart' },
    { label: 'Tag cliente', icon: 'tag' },
  ];
}

/** Lista d'attesa con le schede di Fresha (i dati veri arrivano con C-09). */
@Component({
  selector: 'app-waitlist-drawer',
  imports: [Drawer],
  template: `
    <app-drawer label="Lista d'attesa" (closed)="closed.emit()">
      <div class="body">
        <div class="title-row">
          <h2>Lista d'attesa</h2>
          <button type="button" class="apply small">Aggiungi</button>
        </div>
        <div class="tabs" role="tablist">
          @for (t of tabs; track t) {
            <button type="button" role="tab" [class.on]="tab() === t" (click)="tab.set(t)">{{ t }}</button>
          }
        </div>
        <p class="empty">Nessun cliente in lista d'attesa.</p>
      </div>
    </app-drawer>
  `,
  styleUrl: './toolbar-drawers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitlistDrawer {
  readonly closed = output<void>();

  protected readonly tabs = ['In attesa', 'Scaduto', 'Prenotati'];
  protected readonly tab = signal('In attesa');
}
