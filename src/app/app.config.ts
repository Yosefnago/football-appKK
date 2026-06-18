import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { environment } from '../environments/environment';

export const app         = initializeApp(environment.firebase);
export const firebaseApp = app;
export const db          = getFirestore(app);
export const auth        = getAuth(app);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};