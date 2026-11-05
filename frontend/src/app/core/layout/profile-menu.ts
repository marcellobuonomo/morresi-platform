import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** Menu utente in alto a destra (per ora solo l'aspetto: l'utente vero arriva con il login, B-02). */
@Component({
  selector: 'app-profile-menu',
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <div class="menu" role="menu">
      <div class="who">
        <span class="avatar">MH</span>
        <div>
          <strong>Morresi Hair Stylist</strong>
          <p>Amministratore</p>
        </div>
      </div>
      <hr />
      <button type="button" role="menuitem">Il mio profilo</button>
      <button type="button" role="menuitem">Impostazioni personali</button>
      <hr />
      <button type="button" role="menuitem">Assistenza e supporto</button>
      <button type="button" role="menuitem">Italiano</button>
      <button type="button" role="menuitem">Esci</button>
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
    .menu {
      position: absolute;
      top: 60px;
      right: 16px;
      width: 300px;
      padding: 8px;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 8px 32px rgb(0 0 0 / 14%);
    }
    .who {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      p {
        margin: 2px 0 0;
        font-size: 13px;
        color: #6b6b6b;
      }
    }
    .avatar {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #ebf8fe;
      color: #0075a8;
      font-weight: 600;
    }
    hr {
      margin: 6px 0;
      border: none;
      border-top: 1px solid #ececec;
    }
    button {
      display: block;
      width: 100%;
      padding: 10px 8px;
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
  `,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMenu {
  readonly closed = output<void>();
}
