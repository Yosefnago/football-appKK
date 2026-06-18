import { Injectable } from '@angular/core';
import { Player } from './player.service';

@Injectable({ providedIn: 'root' })
export class TeamGeneratorService {
  generateBalancedTeams(players: Player[], playerCount: number, teamCount: number): Player[][] {
    const teams: Player[][] = Array.from({ length: teamCount }, () => []);
    
    const gks = players.filter(p => p.role === 'GK');
    const fieldPlayers = players.filter(p => p.role !== 'GK').sort((a, b) => b.rating - a.rating);

    if (gks.length > 0) {
      for (let i = 0; i < teamCount; i++) {
        const selectedGk = gks[i % gks.length];
        teams[i].push({ ...selectedGk });
      }
    }

    fieldPlayers.forEach((player, index) => {
      const isEvenRow = Math.floor(index / teamCount) % 2 === 0;
      const teamIndex = isEvenRow ? (index % teamCount) : (teamCount - 1 - (index % teamCount));
      teams[teamIndex].push({ ...player });
    });

    return teams;
  }
}