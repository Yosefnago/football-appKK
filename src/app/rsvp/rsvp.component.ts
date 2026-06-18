import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core'; 
import { AsyncPipe, CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import { PlayerService, Player, PlayerRole } from '../services/player.service';
import { MatchService, Match } from '../services/match.service';

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [AsyncPipe, FormsModule, CommonModule],
  templateUrl: './rsvp.component.html',
  styleUrl: './rsvp.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RsvpComponent implements OnInit {
  matchId = '';
  players$!: Observable<Player[]>;
  currentMatch: Match | null = null;
  
  // Form State
  isAttending: boolean | null = null;
  selectedPlayerId = '';
  selectedRole: PlayerRole = '';
  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private matchService: MatchService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id') || '';
    
    this.players$ = this.playerService.getPlayers();
    
    this.matchService.getActiveMatchObservable(this.matchId).subscribe(match => {
      this.currentMatch = match;
      this.cdr.detectChanges(); 
    });
  }

  setAttendance(attending: boolean): void {
    this.isAttending = attending;
    if (!attending) {
      this.selectedRole = '';
    }
  }

  onPlayerSelect(): void {
    const existingRsvp = this.currentMatch?.rsvps?.[this.selectedPlayerId];
    
    if (existingRsvp) {
      this.isAttending = (existingRsvp.status === 'accepted');
      this.selectedRole = (existingRsvp.preferredRole as PlayerRole) || '';
    } else {
      this.selectedRole = '';
    }
  }

  async submitRsvp(): Promise<void> {
    if (!this.selectedPlayerId || !this.matchId) return;
    
    if (this.isAttending && !this.selectedRole) {
      alert('יש לבחור תפקיד מועדף למשחק');
      return;
    }

    const status = this.isAttending ? 'accepted' : 'declined';
    
    try {
      await this.matchService.updateRsvp(this.matchId, this.selectedPlayerId, status, this.selectedRole);

      setTimeout(() => {
        this.submitted = true;
        this.cdr.markForCheck(); 
        this.cdr.detectChanges(); 
      }, 0);

    } catch (error) {
      console.error('Failed to commit RSVP:', error);
      alert('שגיאה בעדכון הנתונים, נסה שוב.');
    }
  }
}