import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { PlayerService, Player, PlayerRole } from '../services/player.service';
import { MatchService, Match } from '../services/match.service';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { app, db } from '../app.config';

type RsvpStep = 'loading' | 'login' | 'register' | 'rsvp' | 'confirm' | 'done';

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './rsvp.component.html',
  styleUrl: './rsvp.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RsvpComponent implements OnInit {
  private route     = inject(ActivatedRoute);
  private playerSvc = inject(PlayerService);
  private matchSvc  = inject(MatchService);
  private cdr       = inject(ChangeDetectorRef);
  private fireAuth  = getAuth(app);

  matchId        = '';
  currentMatch: Match | null   = null;
  currentPlayer: Player | null = null;

  step: RsvpStep = 'loading';

  newName  = '';
  newRole: PlayerRole = '';

  attendance: boolean | null = null;
  selectedRole: PlayerRole   = '';

  loginError    = '';
  loading       = false;
  alreadyExists = false;

  roles = [
    { value: 'GK',  label: 'שוער',  icon: '🧤' },
    { value: 'DEF', label: 'הגנה',  icon: '🛡️' },
    { value: 'MID', label: 'קישור', icon: '⚙️' },
    { value: 'FWD', label: 'התקפה', icon: '⚽' },
  ];

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id') || '';
    this.init();
  }

  private async init(): Promise<void> {
    const match = await this.matchSvc.getActiveMatch();
    if (!match || match.id !== this.matchId) {
      this.step = 'done';
      this.cdr.markForCheck();
      return;
    }
    this.currentMatch = match;

    const user = this.fireAuth.currentUser;
    if (!user) {
      this.step = 'login';
      this.cdr.markForCheck();
      return;
    }

    await this.loadPlayerForUser(user.uid);
  }

  private async loadPlayerForUser(uid: string): Promise<void> {
    const player = await this.playerSvc.getPlayerByUid(uid);

    if (!player) {
      const regSnap = await getDoc(doc(db, 'registrations', uid));
      if (regSnap.exists()) {
        this.alreadyExists = true;
        this.step = 'register';
        this.cdr.markForCheck();
        return;
      }

      const user   = this.fireAuth.currentUser;
      this.newName = user?.displayName || '';
      this.newRole = '';
      this.step    = 'register';
    } else {
      this.currentPlayer = player;
      const existing     = this.currentMatch?.rsvps?.[player.id];
      if (existing) {
        this.attendance   = existing.status === 'accepted';
        this.selectedRole = (existing.preferredRole as PlayerRole) || player.role || '';
      } else {
        this.attendance   = null;
        this.selectedRole = player.role || '';
      }
      this.step = 'rsvp';
    }
    this.cdr.markForCheck();
  }

  async loginWithGoogle(): Promise<void> {
    this.loading    = true;
    this.loginError = '';
    this.cdr.markForCheck();
    try {
      const provider = new GoogleAuthProvider();
      const result   = await signInWithPopup(this.fireAuth, provider);
      await this.loadPlayerForUser(result.user.uid);
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        this.loginError = 'ההתחברות נכשלה. נסה שוב.';
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async registerAndContinue(): Promise<void> {
    if (!this.newName.trim() || !this.newRole) return;
    const user = this.fireAuth.currentUser;
    if (!user) return;

    this.loading = true;
    this.cdr.markForCheck();

    await this.playerSvc.createPlayerWithUid(user.uid, {
      name:        this.newName.trim(),
      role:        this.newRole,
      rating:      70,
      totalGoals:  0,
      gamesPlayed: 0,
      mvpAwards:   0,
      isActive:    true
    });

    await setDoc(doc(db, 'registrations', user.uid), {
      registeredAt: new Date().toISOString(),
      email: user.email || ''
    });

    this.loading = false;
    await this.loadPlayerForUser(user.uid);
  }

  selectAttendance(coming: boolean): void {
    this.attendance = coming;
    if (!coming) {
      this.step = 'confirm';
      this.cdr.markForCheck();
    }
  }

  goToConfirm(): void {
    if (!this.selectedRole) {
      alert('יש לבחור תפקיד מועדף');
      return;
    }
    this.step = 'confirm';
    this.cdr.markForCheck();
  }

  async submitRsvp(): Promise<void> {
    if (!this.currentPlayer || !this.matchId) return;
    const user   = this.fireAuth.currentUser;
    const status = this.attendance ? 'accepted' : 'declined';

    await this.matchSvc.updateRsvp(
      this.matchId,
      this.currentPlayer.id,
      status,
      this.selectedRole,
      user?.uid
    );

    this.step = 'done';
    this.cdr.markForCheck();
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d    = new Date(iso);
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return `יום ${days[d.getDay()]}, ${d.toLocaleDateString('he-IL')} בשעה ${d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}`;
  }

  roleLabel(role: PlayerRole): string {
    const map: Record<string, string> = { GK:'שוער', DEF:'הגנה', MID:'קישור', FWD:'התקפה' };
    return role ? (map[role] ?? role) : '';
  }
}