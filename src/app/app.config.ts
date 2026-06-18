import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAugmQ1Fu2FNPY8Dy9JEaBlvr9QxkJiLms",
  authDomain: "football-app-70405.firebaseapp.com",
  projectId: "football-app-70405",
  storageBucket: "football-app-70405.firebasestorage.app",
  messagingSenderId: "426892907370",
  appId: "1:426892907370:web:31de93e18038aa0cbfcb13"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};