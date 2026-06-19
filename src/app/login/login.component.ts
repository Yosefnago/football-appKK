import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/Auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl:    './login.component.css'
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  loading = false;
  error   = '';

  async login(): Promise<void> {
    this.loading = true;
    this.error   = '';
    this.cdr.detectChanges();

    try {
      await this.auth.loginWithGoogle();
      await this.auth.waitUntilReady();
      this.router.navigateByUrl('/app');
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        this.error = 'ההתחברות נכשלה. נסה שוב.';
      }
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}