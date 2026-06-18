import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { PlayerService, Player } from './services/player.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  newPlayerName = '';
  newPlayerRating = 1500;
  players$!: Observable<Player[]>;
  isDatePickerVisible: boolean = false;
  selectedMatchDate: string = '';
  isMatchCreationActive: boolean = false;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.players$ = this.playerService.getPlayers();
  }

  async addPlayer(): Promise<void> {
    const name = this.newPlayerName.trim();
    if (!name) return;

    try {
      await this.playerService.addPlayer(name, this.newPlayerRating || 1500);
      this.newPlayerName = '';
      this.newPlayerRating = 1500;
    } catch (error) {
      console.error(error);
    }
  }

  async updateRating(id: string, value: string): Promise<void> {
    const rating = Number(value);
    if (Number.isNaN(rating) || rating < 0) return;
    await this.playerService.updateRating(id, rating);
  }

  async deletePlayer(id: string): Promise<void> {
    await this.playerService.deletePlayer(id);
  }

  getPlayerInitial(name: string): string {
    return name?.charAt(0) ?? '';
  }

  get formattedMatchDate(): string {
    if (!this.selectedMatchDate) {
      return '';
    }

    return new Date(this.selectedMatchDate).toLocaleString('he-IL', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  startNewGame() {
    this.isMatchCreationActive = true;
  }

  cancelGameCreation() {
    this.isMatchCreationActive = false;
  }
}