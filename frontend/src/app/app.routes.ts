import { Routes } from '@angular/router';
import { Shell } from './core/layout/shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/agenda' },
  {
    path: 'admin',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agenda' },
      {
        path: 'agenda',
        loadComponent: () => import('./features/agenda/agenda-page').then((m) => m.AgendaPage),
      },
    ],
  },
];
