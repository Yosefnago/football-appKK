import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { OnboardingService } from './app/services/Onboarding.service';
import { app } from './app/app.config';
import { PlayerRole } from './app/services/player.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  template: `
    <router-outlet></router-outlet>

    @if (showOnboarding) {
      <div class="onboard-overlay">
        <div class="onboard-card">

          <div class="onboard-brand">
            <div class="onboard-crest">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7.5l3.2 2.3-1.2 3.7H9.9l-1.2-3.7L12 7.5z"></path>
                <path d="M12 7.5V4M15.2 9.8l3-1M13.9 13.5l1.9 3M10.1 13.5l-1.9 3M8.8 9.8l-3-1"></path>
              </svg>
            </div>
            <h2 class="onboard-title">ברוך הבא!</h2>
            <p class="onboard-sub">מלא את הפרטים שלך פעם אחת</p>
          </div>

          <div class="onboard-field">
            <label>שם מלא</label>
            <input class="onboard-input" type="text" placeholder="למשל: יוסי כהן"
                   [(ngModel)]="onboardName">
          </div>

          <div class="onboard-field">
            <label>תפקיד מועדף במשחק</label>
            <div class="onboard-roles">
              @for (r of roles; track r.value) {
                <button class="onboard-role-btn"
                        [class.selected]="onboardRole === r.value"
                        (click)="onboardRole = $any(r.value)">
                  <span class="onboard-role-icon">{{ r.icon }}</span>
                  <span>{{ r.label }}</span>
                </button>
              }
            </div>
          </div>

          <button class="onboard-submit"
                  (click)="saveOnboarding()"
                  [disabled]="!onboardName.trim() || !onboardRole || onboardLoading">
            @if (onboardLoading) {
              <span class="onboard-spinner"></span>
            }
            כניסה למערכת
          </button>

        </div>
      </div>
    }
  `,
  styles: [`
    .onboard-overlay {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0.75);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999;
      direction: rtl;
      padding: 20px;
    }
    .onboard-card {
      background: #fff;
      border-radius: 18px;
      padding: 36px 32px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.2);
    }
    .onboard-brand {
      display: flex; flex-direction: column; align-items: center;
      margin-bottom: 28px;
    }
    .onboard-crest {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(150deg, #2d6a4f, #1b4332);
      display: grid; place-items: center;
      box-shadow: 0 6px 16px rgba(45,106,79,0.3);
      margin-bottom: 12px;
    }
    .onboard-crest svg { width: 28px; height: 28px; }
    .onboard-title {
      margin: 0 0 4px; font-size: 22px; font-weight: 800; color: #0f172a;
      font-family: 'Secular One', sans-serif;
    }
    .onboard-sub { margin: 0; font-size: 13px; color: #64748b; }
    .onboard-field { margin-bottom: 20px; }
    .onboard-field label {
      display: block; font-size: 13px; font-weight: 700;
      color: #475569; margin-bottom: 8px;
    }
    .onboard-input {
      width: 100%; padding: 11px 13px;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      font-family: inherit; font-size: 15px; color: #0f172a;
      background: #f8fafc; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .onboard-input:focus { outline: none; border-color: #2d6a4f; background: #fff; }
    .onboard-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .onboard-role-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 8px; border: 2px solid #e2e8f0; border-radius: 10px;
      background: #f8fafc; font-family: inherit; font-size: 13px;
      font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s;
    }
    .onboard-role-btn:hover { border-color: #2d6a4f; background: #f0fdf4; color: #2d6a4f; }
    .onboard-role-btn.selected { border-color: #2d6a4f; background: #2d6a4f; color: #fff; }
    .onboard-role-icon { font-size: 20px; }
    .onboard-submit {
      width: 100%; padding: 13px; background: #2d6a4f; color: #fff;
      border: none; border-radius: 10px; font-family: inherit;
      font-size: 15px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: background 0.15s; margin-top: 4px;
    }
    .onboard-submit:hover:not(:disabled) { background: #1b4332; }
    .onboard-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .onboard-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AppShellComponent implements OnInit {
  private onboardingSvc = inject(OnboardingService);
  private cdr           = inject(ChangeDetectorRef);
  private router        = inject(Router);
  private fireAuth       = getAuth(app);

  private isRsvpRoute = false;

  showOnboarding  = false;
  onboardName     = '';
  onboardRole: PlayerRole = '';
  onboardLoading  = false;

  roles = [
    { value: 'GK',  label: 'שוער',  icon: '🧤' },
    { value: 'DEF', label: 'הגנה',  icon: '🛡️' },
    { value: 'MID', label: 'קישור', icon: '⚙️' },
    { value: 'FWD', label: 'התקפה', icon: '⚽' },
  ];

  ngOnInit(): void {
    this.isRsvpRoute = this.router.url.includes('/rsvp/');

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isRsvpRoute = e.urlAfterRedirects.includes('/rsvp/');
    });

    onAuthStateChanged(this.fireAuth, async (user) => {
      if (!user) return;
      if (this.isRsvpRoute) return;

      try {
        const result = await this.onboardingSvc.checkStatus(user.uid);
        if (result.alreadyRegistered) return;

        this.onboardName    = user.displayName || '';
        this.showOnboarding = true;
        this.cdr.detectChanges();
      } catch (e) {
        console.error('onboarding check failed', e);
      }
    });
  }

  async saveOnboarding(): Promise<void> {
    if (!this.onboardName.trim() || !this.onboardRole) return;
    const user = this.fireAuth.currentUser;
    if (!user) return;

    this.onboardLoading = true;
    this.cdr.detectChanges();

    await this.onboardingSvc.completeRegistration(
      user.uid,
      user.email || '',
      this.onboardName.trim(),
      this.onboardRole
    );

    this.showOnboarding = false;
    this.onboardLoading = false;
    this.cdr.detectChanges();
  }
}