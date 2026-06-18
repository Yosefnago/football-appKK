import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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


@Injectable({ providedIn: 'root' })
export class PlayerService {
  private playersCollection = collection(db, 'players');

  getPlayers(): Observable<Player[]> {
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(this.playersCollection, (snapshot) => {
        const players = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        
        observer.next(players);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async addPlayer(playerData: Omit<Player, 'id'>): Promise<void> {
    await addDoc(this.playersCollection, playerData);
  }

  async updateRating(id: string, rating: number): Promise<void> {
    const playerRef = doc(db, 'players', id);
    await updateDoc(playerRef, { rating });
  }

  async deletePlayer(id: string): Promise<void> {
    const playerRef = doc(db, 'players', id);
    await deleteDoc(playerRef);
  }
}