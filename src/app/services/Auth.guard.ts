import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './Auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return new Promise<boolean | ReturnType<Router['createUrlTree']>>(resolve => {
    const waitForAuth = () => {
      const user = auth.currentUser();

      if (user === undefined) {
        setTimeout(waitForAuth, 50);
        return;
      }

      if (!user) {
        resolve(router.createUrlTree(['/login']));
        return;
      }

      const waitForRole = () => {
        const appUser = auth.appUser();

        if (appUser === undefined) {
          setTimeout(waitForRole, 50);
          return;
        }

        resolve(true);
      };

      waitForRole();
    };

    waitForAuth();
  });
};