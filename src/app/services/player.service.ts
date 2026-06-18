import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Player {
  id: string;
  name: string;
  rating: number;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  // Swap this BehaviorSubject for Firestore/HTTP later — the public API stays the same.
  private readonly players = new BehaviorSubject<Player[]>([
    { id: '1', name: 'דוד כהן', rating: 1850, role: 'חלוץ' },
    { id: '2', name: 'ירון שלום', rating: 1780, role: 'מגן' },
    { id: '3', name: 'ניר ברנט', rating: 1720, role: 'קשר' },
    { id: '4', name: 'אלי לוי', rating: 1620, role: 'קשר' },
    { id: '5', name: 'שמואל גינזבורג', rating: 1550, role: 'שוער' },
    { id: '6', name: 'מוטי ברק', rating: 1500, role: 'קשר' },
    { id: '7', name: 'גיל אדרי', rating: 1480, role: 'חלוץ' }
  ]);

  getPlayers(): Observable<Player[]> {
    return this.players.asObservable();
  }

  async addPlayer(name: string, rating = 1500): Promise<void> {
    const player: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      rating
    };
    this.players.next([...this.players.value, player]);
  }

  async updateRating(id: string, rating: number): Promise<void> {
    this.players.next(
      this.players.value.map(p => (p.id === id ? { ...p, rating } : p))
    );
  }

  async deletePlayer(id: string): Promise<void> {
    this.players.next(this.players.value.filter(p => p.id !== id));
  }
}