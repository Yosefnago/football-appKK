import { Component, inject } from '@angular/core';
import { AuthService } from './Auth.service';
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <div class="unauth-icon">🔒</div>
        <h2>אין הרשאת גישה</h2>
        <p>החשבון שלך לא מורשה להשתמש במערכת זו.<br>פנה למנהל לקבלת גישה.</p>
        <button class="btn-logout" (click)="auth.logout()">
          התנתק ונסה חשבון אחר
        </button>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f0;
      direction: rtl;
      padding: 20px;
    }
    .unauth-card {
      background: #fff;
      border: 1px solid #e2e4dc;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
    .unauth-icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 22px; color: #0f172a; }
    p  { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 28px; }
    .btn-logout {
      padding: 11px 24px;
      background: #1e293b;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .btn-logout:hover { background: #0f172a; }
  `]
})
export class UnauthorizedComponent {
  auth = inject(AuthService);
}