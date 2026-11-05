import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, output, viewChild } from '@angular/core';
import { Icon } from '../../shared/icon';

/** Ricerca globale (per ora solo l'aspetto): popover in alto al centro, come su Fresha. */
@Component({
  selector: 'app-search-panel',
  imports: [Icon],
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <div class="panel" role="dialog" aria-label="Cerca">
      <label class="field">
        <app-icon name="search" [size]="20" />
        <input #input type="search" placeholder="Cerca" />
        <app-icon name="sliders" [size]="20" />
      </label>
      <p class="hint">Cerca qualsiasi cosa in Morresi Hair Stylist</p>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
    }
    .backdrop {
      position: absolute;
      inset: 0;
    }
    .panel {
      position: absolute;
      top: 10px;
      left: 50%;
      width: 640px;
      transform: translateX(-50%);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 32px rgb(0 0 0 / 14%);
      overflow: hidden;
    }
    .field {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 52px;
      padding: 0 16px;
      border-bottom: 1px solid #ececec;
      color: #6b6b6b;
    }
    input {
      flex: 1;
      border: none;
      outline: none;
      font: inherit;
      font-size: 15px;
      color: #0d0d0d;
    }
    .hint {
      margin: 0;
      padding: 40px 16px 48px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
    }
  `,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPanel {
  readonly closed = output<void>();
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  constructor() {
    afterNextRender(() => this.input().nativeElement.focus());
  }
}
