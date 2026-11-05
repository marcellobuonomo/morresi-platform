import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * Cassetto laterale come su Fresha: entra da destra sotto la barra in alto, con la X tonda alla sua sinistra.
 * Si chiude con la X, con Esc o cliccando fuori.
 */
@Component({
  selector: 'app-drawer',
  imports: [Icon],
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <aside class="panel" [style.width.px]="width()" role="dialog" [attr.aria-label]="label()">
      <button type="button" class="close" aria-label="Chiudi" (click)="closed.emit()">
        <app-icon name="x" [size]="20" />
      </button>
      <ng-content />
    </aside>
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
      top: 0;
      right: 0;
      bottom: 0;
      max-width: calc(100vw - 72px);
      display: flex;
      flex-direction: column;
      background: #fff;
      box-shadow: -8px 0 24px rgb(0 0 0 / 8%);
      animation: slide-in 160ms ease-out;
    }
    .close {
      position: absolute;
      top: 12px;
      left: -60px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e5e5e5;
      border-radius: 50%;
      background: #fff;
      color: #0d0d0d;
      cursor: pointer;
      box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
    }
    @keyframes slide-in {
      from {
        transform: translateX(24px);
        opacity: 0;
      }
    }
  `,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  readonly width = input(480);
  readonly label = input('');
  readonly closed = output<void>();
}
