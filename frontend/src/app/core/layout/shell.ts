import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/icon';
import { InsightsDrawer } from './insights-drawer';
import { NotificationsDrawer } from './notifications-drawer';
import { ProfileMenu } from './profile-menu';
import { SearchPanel } from './search-panel';

interface NavItem {
  label: string;
  icon: string;
  /** Solo il calendario porta a una pagina; le altre voci per ora non fanno nulla. */
  link?: string;
}

type HeaderPanel = 'search' | 'insights' | 'notifications' | 'profile';

/** Struttura dell'area admin come su Fresha: barra in alto (64 px) e menu laterale nero (72 px). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, SearchPanel, InsightsDrawer, NotificationsDrawer, ProfileMenu],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly nav: NavItem[] = [
    { label: 'Homepage', icon: 'home' },
    { label: 'Calendario', icon: 'calendar', link: '/admin/agenda' },
    { label: 'Vendite', icon: 'tag' },
    { label: 'Clienti', icon: 'smile' },
    { label: 'Catalogo', icon: 'book' },
    { label: 'Marketing', icon: 'megaphone' },
    { label: 'Team', icon: 'users' },
    { label: 'Report', icon: 'chart' },
    { label: 'Impostazioni', icon: 'settings' },
  ];

  protected readonly openPanel = signal<HeaderPanel | null>(null);

  protected toggle(panel: HeaderPanel): void {
    this.openPanel.update((current) => (current === panel ? null : panel));
  }

  protected close(): void {
    this.openPanel.set(null);
  }
}
