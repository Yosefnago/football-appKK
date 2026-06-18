import { Injectable, signal } from '@angular/core';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut, onAuthStateChanged, User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '../app.config';

export type UserRole = 'admin' | 'organizer' | 'viewer';

export interface AppUser {
  uid:         string;
  displayName: string;
  photoURL:    string;
  role:        UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private auth = getAuth(app);

  readonly currentUser = signal<User | null | undefined>(undefined);
  readonly appUser     = signal<AppUser | null | undefined>(undefined);

  constructor() {
    onAuthStateChanged(this.auth, async user => {
      this.currentUser.set(user);
      if (user) {
        const role = await this.fetchRole(user.uid);
        this.appUser.set({
          uid:         user.uid,
          displayName: user.displayName ?? '',
          photoURL:    user.photoURL    ?? '',
          role
        });
      } else {
        this.appUser.set(null);
      }
    });
  }

  private async fetchRole(uid: string): Promise<UserRole> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const role = snap.data()['role'] as UserRole;
        if (['admin', 'organizer', 'viewer'].includes(role)) return role;
      }
      return 'viewer';
    } catch {
      return 'viewer';
    }
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    window.location.href = '/login';
  }

  get isResolved():    boolean { return this.currentUser() !== undefined; }
  get isLoggedIn():    boolean { return !!this.currentUser(); }
  get isAuthorized():  boolean { return this.appUser() !== null && this.appUser() !== undefined; }
  get isAdmin():       boolean { return this.appUser()?.role === 'admin'; }
  get isOrganizer():   boolean {
    const r = this.appUser()?.role;
    return r === 'admin' || r === 'organizer';
  }
  get isViewer(): boolean { return !!this.appUser(); }

  get userDisplayName(): string { return this.appUser()?.displayName ?? ''; }
  get userPhotoURL():    string { return this.appUser()?.photoURL    ?? ''; }
  get userRole(): string {
    const map: Record<UserRole, string> = {
      admin: 'מנהל', organizer: 'מארגן', viewer: 'צפייה'
    };
    const r = this.appUser()?.role;
    return r ? map[r] : '';
  }
}