import { Injectable, inject } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../app.config';
import { PlayerService, Player, PlayerRole } from './player.service';

export interface OnboardingResult {
  alreadyRegistered: boolean;
  player: Player | null;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private playerSvc = inject(PlayerService);

  async checkStatus(uid: string): Promise<OnboardingResult> {
    const player = await this.playerSvc.getPlayerByUid(uid);
    if (player) {
      return { alreadyRegistered: true, player };
    }

    const regSnap = await getDoc(doc(db, 'registrations', uid));
    if (regSnap.exists()) {
      return { alreadyRegistered: true, player: null };
    }

    return { alreadyRegistered: false, player: null };
  }

  async completeRegistration(
    uid: string,
    email: string,
    name: string,
    role: PlayerRole
  ): Promise<Player> {
    await this.playerSvc.createPlayerWithUid(uid, {
      name,
      role,
      rating: 70,
      totalGoals: 0,
      gamesPlayed: 0,
      mvpAwards: 0,
      isActive: true
    });

    await setDoc(doc(db, 'registrations', uid), {
      registeredAt: new Date().toISOString(),
      email
    });

    return {
      id: uid,
      name,
      role,
      rating: 70,
      totalGoals: 0,
      gamesPlayed: 0,
      mvpAwards: 0,
      isActive: true
    };
  }
}