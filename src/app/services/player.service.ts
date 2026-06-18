import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  collection, onSnapshot, addDoc, doc,
  updateDoc, deleteDoc, increment
} from 'firebase/firestore';
import { db } from '../app.config';

export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD' | '';

export interface Player {
  id: string;
  name: string;
  rating: number;
  role: PlayerRole;
  totalGoals: number;
  gamesPlayed: number;
  mvpAwards: number;
  isActive: boolean;
}

export interface PlayerEndMatchUpdate {
  goals: number;
  ratingDelta: number; 
  isMvp: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private playersCollection = collection(db, 'players');

  getPlayers(): Observable<Player[]> {
    return new Observable((observer) => {
      return onSnapshot(this.playersCollection, (snapshot) => {
        const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
        observer.next(players);
      }, (error) => observer.error(error));
    });
  }

  async addPlayer(player: Omit<Player, 'id'>): Promise<void> {
    await addDoc(this.playersCollection, player);
  }

  async updateRating(id: string, rating: number): Promise<void> {
    const playerRef = doc(db, 'players', id);
    await updateDoc(playerRef, { rating });
  }

  async deletePlayer(id: string): Promise<void> {
    const playerRef = doc(db, 'players', id);
    await deleteDoc(playerRef);
  }

  async bulkUpdateAfterMatch(
    updates: Record<string, PlayerEndMatchUpdate>
  ): Promise<void> {
    const promises = Object.entries(updates).map(([playerId, upd]) => {
      const playerRef = doc(db, 'players', playerId);
      return updateDoc(playerRef, {
        totalGoals: increment(upd.goals),
        gamesPlayed: increment(1),
        mvpAwards:   increment(upd.isMvp ? 1 : 0),
        rating:      increment(upd.ratingDelta)
      });
    });
    await Promise.all(promises);
  }
}