import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './Auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.appUser).pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      
      return router.createUrlTree(['/login']);
    })
  );
};