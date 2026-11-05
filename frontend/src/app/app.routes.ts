import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/agenda' },
  {
    path: 'admin/agenda',
    loadComponent: () => import('./features/agenda/agenda-page').then((m) => m.AgendaPage),
  },
];
