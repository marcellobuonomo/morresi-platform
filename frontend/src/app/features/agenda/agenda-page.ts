import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Agenda, StaffColumn } from '../../core/api/models';
import { Icon } from '../../shared/icon';
import {
  AgendaView,
  daysBetween,
  minutesToTime,
  rangeLabel,
  shortDate,
  stepDate,
  todayInSalon,
  VIEWS,
  visibleRange,
} from './agenda-dates';
import { onDay } from './agenda-layout';
import { AgendaService } from './agenda.service';
import { AppointmentDrawer } from './appointment-drawer';
import { DatePicker } from './date-picker';
import { MatrixView } from './matrix-view';
import { MonthView } from './month-view';
import { NewAppointmentDrawer } from './new-appointment-drawer';
import { TeamFilter, TeamSelection } from './team-filter';
import { GridColumn, SlotRequest, TimeGrid } from './time-grid';
import { CalendarSettingsDrawer, FiltersDrawer, WaitlistDrawer } from './toolbar-drawers';

type Popover = 'date' | 'team' | 'view' | 'add';
type ToolbarDrawer = 'filters' | 'settings' | 'waitlist';

/**
 * Pagina agenda (container). Giorno, vista e collaboratori stanno nell'URL come su Fresha:
 * /admin/agenda?date=2026-11-05&view=week&staff=working
 */
@Component({
  selector: 'app-agenda-page',
  imports: [
    Icon,
    TimeGrid,
    MatrixView,
    MonthView,
    DatePicker,
    TeamFilter,
    AppointmentDrawer,
    NewAppointmentDrawer,
    CalendarSettingsDrawer,
    FiltersDrawer,
    WaitlistDrawer,
  ],
  templateUrl: './agenda-page.html',
  styleUrl: './agenda-page.scss',
  host: { '(document:keydown.escape)': 'popover.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPage {
  private readonly agenda = inject(AgendaService);
  private readonly router = inject(Router);

  // Query param (binding degli input dal router)
  readonly date = input<string>();
  readonly view = input<string>();
  readonly staff = input<string>();

  protected readonly today = todayInSalon();
  protected readonly views = VIEWS;
  protected readonly day = computed(() => this.date() ?? this.today);
  protected readonly currentView = computed<AgendaView>(
    () => VIEWS.find((v) => v.id === this.view())?.id ?? 'day',
  );
  protected readonly viewLabel = computed(() => VIEWS.find((v) => v.id === this.currentView())!.label);
  protected readonly selection = computed<TeamSelection>(() => {
    const staff = this.staff();
    return !staff || staff === 'working' ? 'working' : staff === 'all' ? 'all' : staff.split(',');
  });

  protected readonly range = computed(() => visibleRange(this.currentView(), this.day()));
  protected readonly days = computed(() => daysBetween(this.range().from, this.range().to));
  protected readonly label = computed(() => rangeLabel(this.currentView(), this.day()));

  protected readonly data = rxResource({
    params: () => this.range(),
    stream: ({ params }) => this.agenda.getAgenda(params.from, params.to),
  });

  /** Ultimi dati arrivati: mentre carica il nuovo intervallo resta visibile la griglia, senza sfarfallio. */
  protected readonly agendaData = linkedSignal<Agenda | undefined, Agenda | undefined>({
    source: () => this.data.value(),
    computation: (value, previous) => value ?? previous?.value,
  });

  /** Collaboratori in attività, per il filtro e per i colori degli avatar (ordine del salone). */
  protected readonly activeStaff = computed(() => (this.agendaData()?.staff ?? []).filter((s) => s.active));
  protected readonly colorIndex = computed(
    () => new Map((this.agendaData()?.staff ?? []).map((s, i) => [s.id, i] as [string, number])),
  );

  protected readonly visibleStaff = computed(() => {
    const all = this.agendaData()?.staff ?? [];
    const selection = this.selection();
    if (selection === 'all') {
      return all.filter((s) => s.active || s.appointments.length > 0);
    }
    if (selection === 'working') {
      return all.filter((s) => s.shifts.length > 0 || s.appointments.length > 0);
    }
    return all.filter((s) => selection.includes(s.id));
  });

  protected readonly teamLabel = computed(() => {
    const selection = this.selection();
    if (selection === 'working') {
      return 'Membri del team di turno';
    }
    if (selection === 'all') {
      return 'Tutti i membri del team';
    }
    const names = this.visibleStaff().map((s) => s.fullName);
    return names.length === 1 ? names[0] : `${selection.length} membri del team`;
  });

  /** 3 giorni / settimana di un solo collaboratore: griglia oraria con i giorni come colonne. */
  protected readonly singleStaff = computed(() => {
    const visible = this.visibleStaff();
    return this.currentView() !== 'day' && this.currentView() !== 'month' && visible.length === 1 ? visible[0] : null;
  });

  protected readonly gridColumns = computed((): GridColumn[] => {
    const single = this.singleStaff();
    if (single) {
      return this.days().map((d) => this.column(single, d, 'day'));
    }
    return this.visibleStaff().map((s) => this.column(s, this.day(), 'staff'));
  });

  // Popover della toolbar e cassetti
  protected readonly popover = signal<Popover | null>(null);
  protected readonly toolbarDrawer = signal<ToolbarDrawer | null>(null);
  protected readonly openAppointmentId = signal<string | null>(null);
  protected readonly newAppointment = signal<{ label: string } | null>(null);
  protected readonly hourPx = signal(96);

  protected toggle(popover: Popover): void {
    this.popover.update((current) => (current === popover ? null : popover));
  }

  protected goTo(date: string): void {
    this.popover.set(null);
    this.navigate({ date });
  }

  protected step(direction: 1 | -1): void {
    this.goTo(stepDate(this.currentView(), this.day(), direction));
  }

  protected setView(view: AgendaView): void {
    this.popover.set(null);
    this.navigate({ view });
  }

  protected setTeam(selection: TeamSelection): void {
    this.navigate({ staff: Array.isArray(selection) ? selection.join(',') : selection });
  }

  protected showStaff(staffId: string, view?: AgendaView): void {
    this.navigate({ staff: staffId, view: view ?? this.currentView() });
  }

  protected openDay(date: string): void {
    this.navigate({ date, view: 'day' });
  }

  protected openNewAppointment(slot?: SlotRequest): void {
    this.popover.set(null);
    const staff = slot && this.agendaData()?.staff.find((s) => s.id === slot.staffId);
    this.newAppointment.set({
      label: slot ? `${shortDate(slot.date)} · ${minutesToTime(slot.minute)} · ${staff?.displayName ?? ''}` : '',
    });
  }

  protected applyZoom(hourPx: number): void {
    this.hourPx.set(hourPx);
    this.toolbarDrawer.set(null);
  }

  private column(staff: StaffColumn, date: string, header: 'staff' | 'day'): GridColumn {
    return {
      key: `${staff.id}|${date}`,
      date,
      staff,
      colorIndex: this.colorIndex().get(staff.id) ?? 0,
      header,
      shifts: onDay(staff.shifts, date),
      blocks: onDay(staff.blocks, date),
      appointments: onDay(staff.appointments, date),
    };
  }

  private navigate(params: Record<string, string>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}
