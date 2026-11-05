import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { Drawer } from '../../shared/drawer';
import { Icon } from '../../shared/icon';

interface Tab {
  label: string;
  icon: string;
}

/** Notifiche con la struttura di Fresha e DATI DI ESEMPIO: quelle vere arrivano con B-04. */
@Component({
  selector: 'app-notifications-drawer',
  imports: [Drawer, Icon],
  template: `
    <app-drawer label="Notifiche" [width]="560" (closed)="closed.emit()">
      <div class="split">
        <div class="tabs" role="tablist">
          @for (t of tabs; track t.label) {
            <button type="button" role="tab" [class.on]="tab() === t.label" (click)="tab.set(t.label)">
              <app-icon [name]="t.icon" [size]="20" />
              <span>{{ t.label }}</span>
            </button>
          }
        </div>
        <div class="body">
          <h2>{{ tab() }}</h2>
          <p class="muted"><strong>Dati di esempio</strong></p>
          @for (n of items; track n.title) {
            <article class="card notification">
              <div>
                <strong>{{ n.title }}</strong>
                <p class="muted">{{ n.when }}</p>
                <p>{{ n.text }}</p>
              </div>
              <span class="initial">{{ n.title[0] }}</span>
            </article>
          }
        </div>
      </div>
    </app-drawer>
  `,
  styleUrl: './header-panels.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsDrawer {
  readonly closed = output<void>();

  protected readonly tabs: Tab[] = [
    { label: 'Appuntamenti', icon: 'calendar' },
    { label: 'Recensioni', icon: 'heart' },
    { label: 'Attività', icon: 'list' },
  ];
  protected readonly tab = signal('Appuntamenti');
  protected readonly items = [
    { title: 'Kamen ha prenotato online: 30 £', when: '4 ore fa', text: 'Gentleman haircut il mar 10 nov alle 17:00 con Mattia.' },
    { title: 'Noemi ha prenotato online: 69 £', when: '5 ore fa', text: 'Haircut/blow dry il ven 12 feb alle 15:30 con Roberta.' },
    { title: 'Francesca ha spostato online', when: '5 ore fa', text: 'Full colour/blow dry spostato alle 12:00 del sab 19 dic.' },
  ];
}
