import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { StaffColumn } from '../../core/api/models';
import { Icon } from '../../shared/icon';
import { initials } from './agenda-layout';

/** 'working' = di turno, 'all' = tutti, altrimenti gli id scelti uno per uno. */
export type TeamSelection = 'working' | 'all' | string[];

/** Filtro dei collaboratori come su Fresha: di turno, tutti, oppure una scelta con le caselle. */
@Component({
  selector: 'app-team-filter',
  imports: [Icon],
  template: `
    <div class="panel" role="dialog" aria-label="Membri del team">
      <label class="search">
        <app-icon name="search" [size]="16" />
        <input type="search" placeholder="Cerca" (input)="query.set($any($event.target).value)" />
      </label>
      <button type="button" class="option" [class.on]="selection() === 'working'" (click)="changed.emit('working')">
        <app-icon name="user-clock" [size]="18" /> Membri del team di turno
      </button>
      <button type="button" class="option" [class.on]="selection() === 'all'" (click)="changed.emit('all')">
        <app-icon name="users" [size]="18" /> Tutti i membri del team
      </button>
      <hr />
      <label class="check">
        <input type="checkbox" [checked]="allChecked()" (change)="changed.emit('all')" />
        <strong>Tutti i membri del team</strong>
      </label>
      @for (s of visibleStaff(); track s.id) {
        <label class="check">
          <input type="checkbox" [checked]="isChecked(s.id)" (change)="toggle(s.id)" />
          <span class="mini">{{ initials(s.fullName) }}</span>
          {{ s.fullName }}
        </label>
      }
    </div>
  `,
  styles: `
    .panel {
      position: absolute;
      top: 44px;
      left: 0;
      z-index: 20;
      width: 280px;
      padding: 10px;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 8px 32px rgb(0 0 0 / 16%);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      margin-bottom: 6px;
      padding: 0 10px;
      border: 1px solid #d3d3d3;
      border-radius: 8px;
      color: #6b6b6b;
      input {
        flex: 1;
        border: none;
        outline: none;
        font: inherit;
        font-size: 14px;
      }
    }
    .option,
    .check {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 8px;
      background: none;
      font: inherit;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      &:hover {
        background: #f5f5f5;
      }
    }
    .option.on {
      background: #f1eefe;
    }
    input[type='checkbox'] {
      width: 18px;
      height: 18px;
      accent-color: #6950f3;
    }
    .mini {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #f1eefe;
      color: #5b43c9;
      font-size: 10px;
      font-weight: 600;
    }
    hr {
      margin: 6px 0;
      border: none;
      border-top: 1px solid #ececec;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFilter {
  /** Collaboratori in attività */
  readonly staff = input.required<StaffColumn[]>();
  readonly selection = input.required<TeamSelection>();
  readonly changed = output<TeamSelection>();

  protected readonly query = signal('');
  protected readonly visibleStaff = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.staff().filter((s) => s.fullName.toLowerCase().includes(q));
  });
  protected readonly allChecked = computed(() => this.selection() === 'all');

  protected isChecked(id: string): boolean {
    const selection = this.selection();
    return selection === 'all' || (Array.isArray(selection) && selection.includes(id));
  }

  protected toggle(id: string): void {
    const selection = this.selection();
    const current = Array.isArray(selection) ? selection : selection === 'all' ? this.staff().map((s) => s.id) : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.changed.emit(next.length === this.staff().length ? 'all' : next);
  }

  protected readonly initials = initials;
}
