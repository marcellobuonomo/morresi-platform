import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AgendaGrid } from './agenda-grid';
import { AgendaService } from './agenda.service';

const SALON_TIMEZONE = 'Europe/London';

/** Oggi nel fuso del salone, in formato ISO (2026-11-05). */
function todayInSalon(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SALON_TIMEZONE }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Pagina agenda (container): il giorno sta nell'URL (?date=2026-10-31), come su Fresha. */
@Component({
  selector: 'app-agenda-page',
  imports: [AgendaGrid],
  templateUrl: './agenda-page.html',
  styleUrl: './agenda-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPage {
  private readonly agenda = inject(AgendaService);
  private readonly router = inject(Router);

  /** Query param ?date= (binding degli input dal router) */
  readonly date = input<string>();

  protected readonly day = computed(() => this.date() ?? todayInSalon());
  protected readonly isToday = computed(() => this.day() === todayInSalon());
  protected readonly dayLabel = computed(() =>
    new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(new Date(`${this.day()}T12:00:00Z`)),
  );

  protected readonly agendaDay = rxResource({
    params: () => this.day(),
    stream: ({ params }) => this.agenda.getDay(params),
  });

  protected goTo(isoDate: string): void {
    this.router.navigate([], { queryParams: { date: isoDate } });
  }

  protected today(): void {
    this.goTo(todayInSalon());
  }

  protected shift(days: number): void {
    this.goTo(addDays(this.day(), days));
  }
}
