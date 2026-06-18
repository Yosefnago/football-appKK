import { Routes } from '@angular/router';
import { App } from './app';
import { RsvpComponent } from './rsvp/rsvp.component';


export const routes: Routes = [
  { path: '', component: App },
  { path: 'rsvp/:id', component: RsvpComponent }
];