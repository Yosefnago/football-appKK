import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  collection, onSnapshot, addDoc, doc,
  updateDoc, query, where, limit, getDocs
} from 'firebase/firestore';
import { Player } from './player.service';
import { db } from '../app.config';

export type MatchStatus = 'registration' | 'draft' | 'locked' | 'completed';

export interface RsvpState {
  status: 'accepted' | 'declined';
  preferredRole?: string;
}

export interface TeamResult {
  goals: number;
}

export interface PlayerMatchStat {
  goals: number;
  isMvp: boolean;
}

export interface Match {
  id: string;
  date: string;
  status: MatchStatus;
  rsvps: Record<string, RsvpState>;
  teams?: Record<string, Player[]>;
  teamResults?: Record<string, TeamResult>;
  playerStats?: Record<string, PlayerMatchStat>;
  mvpId?: string;
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private matchesCollection = collection(db, 'matches');

  getMatches(): Observable<Match[]> {
    return new Observable((observer) => {
      return onSnapshot(this.matchesCollection, (snapshot) => {
        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
        observer.next(matches);
      }, (error) => observer.error(error));
    });
  }

  getCompletedMatches(): Observable<Match[]> {
    const q = query(this.matchesCollection, where('status', '==', 'completed'));
    return new Observable((observer) => {
      return onSnapshot(q, (snapshot) => {
        const matches = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Match))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        observer.next(matches);
      }, (error) => observer.error(error));
    });
  }

  async createMatch(date: string): Promise<string> {
    const newMatch = { date, status: 'registration', rsvps: {} };
    const docRef = await addDoc(this.matchesCollection, newMatch);
    return docRef.id;
  }

  async updateRsvp(
    matchId: string,
    playerId: string,
    status: 'accepted' | 'declined',
    role?: string
  ): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      [`rsvps.${playerId}`]: { status, preferredRole: role || null }
    });
  }

  async getActiveMatch(): Promise<Match | null> {
    const q = query(
      this.matchesCollection,
      where('status', 'in', ['registration', 'draft', 'locked']),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty
      ? null
      : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Match);
  }

  getActiveMatchObservable(matchId: string): Observable<Match> {
    return new Observable(observer => {
      return onSnapshot(doc(db, 'matches', matchId), (d) => {
        observer.next({ id: d.id, ...d.data() } as Match);
      }, (error) => observer.error(error));
    });
  }

  async saveTeamsDraft(matchId: string, teams: Player[][]): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    const serializedTeams: Record<string, any> = {};
    teams.forEach((team, index) => {
      serializedTeams[`group${index + 1}`] = team.map(p => ({ ...p }));
    });
    await updateDoc(matchRef, { status: 'draft', teams: serializedTeams });
  }

  async updateDraftTeams(matchId: string, teams: Player[][]): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    const serializedTeams: Record<string, any> = {};
    teams.forEach((team, index) => {
      serializedTeams[`group${index + 1}`] = team.map(p => ({ ...p }));
    });
    await updateDoc(matchRef, { teams: serializedTeams });
  }

  async finalLockTeams(matchId: string, teams: Player[][]): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    const serializedTeams: Record<string, any> = {};
    teams.forEach((team, index) => {
      serializedTeams[`group${index + 1}`] = team.map(p => ({ ...p }));
    });
    await updateDoc(matchRef, { status: 'locked', teams: serializedTeams });
  }

  async lockMatchAndSaveTeams(matchId: string, teams: Player[][]): Promise<void> {
    return this.finalLockTeams(matchId, teams);
  }

  async completeMatch(
    matchId: string,
    teamResults: Record<string, TeamResult>,
    playerStats: Record<string, PlayerMatchStat>,
    mvpId: string
  ): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, { status: 'completed', teamResults, playerStats, mvpId });
  }
}