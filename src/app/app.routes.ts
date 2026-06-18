import { Routes } from '@angular/router';
import { authGuard } from './services/Auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'rsvp/:id',
    loadComponent: () =>
      import('./rsvp/rsvp.component').then(m => m.RsvpComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./app').then(m => m.App)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app'
  },
  {
    path: '**',
    redirectTo: 'app'
  }
];