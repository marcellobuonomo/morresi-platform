import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { Drawer } from '../../shared/drawer';

const PERIODS = ['Ieri', 'Oggi', 'Settimana', 'Mese'] as const;

/**
 * "Approfondimenti sulle prestazioni" con la struttura di Fresha e DATI DI ESEMPIO:
 * i numeri veri arrivano con le statistiche (A-07).
 */
@Component({
  selector: 'app-insights-drawer',
  imports: [Drawer],
  template: `
    <app-drawer label="Approfondimenti sulle prestazioni" (closed)="closed.emit()">
      <div class="body">
        <h2>Approfondimenti sulle prestazioni</h2>
        <p class="muted">Aggiornato proprio ora · <strong>dati di esempio</strong></p>

        <div class="segmented" role="tablist">
          @for (p of periods; track p) {
            <button type="button" role="tab" [class.on]="period() === p" (click)="period.set(p)">{{ p }}</button>
          }
        </div>

        <h3>Riepilogo</h3>
        <p class="muted">Rispetto allo stesso periodo della scorsa settimana</p>

        <section class="card">
          <div class="card-head"><span>Totale delle vendite</span><a>Vedi</a></div>
          <div class="big">1.909 £ <span class="up">↑ 17% in più</span></div>
          <div class="bars">
            @for (h of bars; track $index) {
              <span [style.height.%]="h"></span>
            }
          </div>
          <h4>Vendite per canale</h4>
          @for (c of channels; track c[0]) {
            <div class="row"><span>{{ c[0] }}</span><span>{{ c[1] }}</span></div>
          }
        </section>

        <div class="pair">
          <section class="card"><div class="card-head">Appuntamenti</div><div class="big">26</div></section>
          <section class="card"><div class="card-head">Vendita media</div><div class="big">127,28 £</div></section>
          <section class="card"><div class="card-head">Nuovi clienti</div><div class="big">6</div></section>
          <section class="card"><div class="card-head">Clienti abituali</div><div class="big">18</div></section>
        </div>

        <h3>Team</h3>
        <section class="card">
          <div class="card-head">Tasso di occupazione</div>
          <div class="big">60%</div>
          <h4>I migliori membri del team</h4>
          @for (m of team; track m[0]) {
            <div class="row"><span>{{ m[0] }}</span><span>{{ m[1] }}</span></div>
          }
        </section>
      </div>
    </app-drawer>
  `,
  styleUrl: './header-panels.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsDrawer {
  readonly closed = output<void>();

  protected readonly periods = PERIODS;
  protected readonly period = signal<(typeof PERIODS)[number]>('Oggi');
  protected readonly bars = [55, 80, 76, 64, 72, 52, 62];
  protected readonly channels = [
    ['Online', '969 £'],
    ['In salone', '919 £'],
    ['Marketing', '30 £'],
  ];
  protected readonly team = [
    ['Salvatore Morresi', '61%'],
    ['Franco Franco', '37%'],
    ['Mattia Amorico', '30%'],
  ];
}
