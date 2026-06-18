import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { PlayerService, Player, PlayerRole, PlayerEndMatchUpdate } from './services/player.service';
import { MatchService, Match, TeamResult, PlayerMatchStat } from './services/match.service';
import { TeamGeneratorService } from './services/TeamGeneratorService';
import { TeamsComponent } from './teams/teams.component';

export interface FinishPlayerRow {
  id: string;
  name: string;
  currentRating: number;
  teamIndex: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterOutlet, TeamsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  readonly Math = Math;

  activeMatch: Match | null = null;
  isRsvpRoute = false;

  newPlayerName   = '';
  newPlayerRating = 0;
  newPlayerRole: PlayerRole = '';

  isDatePickerVisible   = false;
  selectedMatchDate     = '';
  isMatchCreationActive = false;
  generatedMatchLink    = '';
  generatedTeams: Player[][] = [];

  // Teams count modal 
  isTeamsCountModalOpen   = false;
  teamsCountInput         = 2;
  pendingAcceptedPlayers: Player[] = [];

  // Active match 
  teamRosterOpen: boolean[] = [];

  // Finish modal 
  isFinishModalOpen   = false;
  playerGoalInputs:   Record<string, number> = {};
  playerRatingInputs: Record<string, number> = {};
  selectedMvpId       = '';
  finishPlayerRows: FinishPlayerRow[] = [];
  finishTeamOpen: boolean[] = [];

  // Observables 
  players$!:          Observable<Player[]>;
  matches$!:          Observable<Match[]>;
  completedMatches$!: Observable<Match[]>;
  acceptedPlayers$!:  Observable<Player[]>;
  declinedPlayers$!:  Observable<Player[]>;

  totalTeamGoals$!:   Observable<number>;
  totalMatches$!:     Observable<number>;
  avgGoalsPerMatch$!: Observable<number>;
  topRatedPlayers$!:  Observable<Player[]>;
  topScorers$!:       Observable<Player[]>;

  constructor(
    private playerService:        PlayerService,
    private matchService:         MatchService,
    private teamGeneratorService: TeamGeneratorService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isRsvpRoute = e.urlAfterRedirects.includes('/rsvp/');
      this.cdr.detectChanges();
    });
  }

  async ngOnInit(): Promise<void> {
    this.players$          = this.playerService.getPlayers();
    this.matches$          = this.matchService.getMatches();
    this.completedMatches$ = this.matchService.getCompletedMatches();
    this.initDashboardStats();

    const m = await this.matchService.getActiveMatch();
    if (m) {
      this.activeMatch        = m;
      this.selectedMatchDate  = m.date;
      this.generatedMatchLink = `${window.location.origin}/rsvp/${m.id}`;

      if (m.status === 'registration') {
        this.isMatchCreationActive = true;
        this.initRsvpStreams(m.id);
      } else if ((m.status === 'draft' || m.status === 'locked') && m.teams) {
        this.isMatchCreationActive = false;
        const keys = Object.keys(m.teams).sort();
        this.generatedTeams  = keys.map(k => m.teams![k]);
        this.teamRosterOpen  = this.generatedTeams.map(() => false);
      }
      this.cdr.detectChanges();
    }
  }

  // Stats 
  private initDashboardStats(): void {
    this.topRatedPlayers$ = this.players$.pipe(
      map(ps => [...ps].sort((a, b) => b.rating - a.rating).slice(0, 3))
    );
    this.topScorers$ = this.players$.pipe(
      map(ps => [...ps].sort((a, b) => (b.totalGoals||0) - (a.totalGoals||0)).slice(0, 3))
    );
    this.totalTeamGoals$ = this.players$.pipe(
      map(ps => ps.reduce((s, p) => s + (p.totalGoals||0), 0))
    );
    this.totalMatches$ = this.matches$.pipe(
      map(ms => ms.filter(m => m.status === 'completed').length)
    );
    this.avgGoalsPerMatch$ = combineLatest([this.totalTeamGoals$, this.totalMatches$]).pipe(
      map(([g, m]) => m > 0 ? Number((g/m).toFixed(1)) : 0)
    );
  }

  private initRsvpStreams(matchId: string): void {
    const match$ = this.matchService.getActiveMatchObservable(matchId);
    this.acceptedPlayers$ = combineLatest([this.players$, match$]).pipe(
      map(([ps, m]) => ps.filter(p => m.rsvps?.[p.id]?.status === 'accepted'))
    );
    this.declinedPlayers$ = combineLatest([this.players$, match$]).pipe(
      map(([ps, m]) => ps.filter(p => m.rsvps?.[p.id]?.status === 'declined'))
    );
  }

  //  Match creation 
  async confirmMatchCreation(): Promise<void> {
    if (this.activeMatch) { alert('כבר קיים משחק פעיל!'); return; }
    if (!this.selectedMatchDate) { alert('יש לבחור תאריך ושעה.'); return; }
    try {
      const id = await this.matchService.createMatch(this.selectedMatchDate);
      this.generatedMatchLink    = `${window.location.origin}/rsvp/${id}`;
      this.isDatePickerVisible   = false;
      this.isMatchCreationActive = true;
      this.activeMatch = await this.matchService.getActiveMatch();
      if (this.activeMatch) this.initRsvpStreams(this.activeMatch.id);
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async openTeamsCountModal(): Promise<void> {
    if (!this.activeMatch) return;
    const accepted = await firstValueFrom(this.acceptedPlayers$);
    if (!accepted || accepted.length < 4) {
      alert(`מינימום 4 שחקנים. (כרגע: ${accepted?.length || 0})`); return;
    }
    this.pendingAcceptedPlayers = accepted;
    this.teamsCountInput        = 2;
    this.isTeamsCountModalOpen  = true;
  }

  async generateDraftTeams(): Promise<void> {
    if (!this.activeMatch || !this.pendingAcceptedPlayers.length) return;
    const n = this.teamsCountInput;
    if (!n || n < 2 || n > this.pendingAcceptedPlayers.length) {
      alert('מספר קבוצות לא תקין.'); return;
    }
    this.isTeamsCountModalOpen = false;
    try {
      const teams = this.teamGeneratorService.generateBalancedTeams(
        this.pendingAcceptedPlayers, this.pendingAcceptedPlayers.length, n
      );
      await this.matchService.saveTeamsDraft(this.activeMatch.id, teams);
      this.generatedTeams        = teams;
      this.teamRosterOpen        = teams.map(() => false);
      this.isMatchCreationActive = false;
      this.activeMatch           = await this.matchService.getActiveMatch();
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  onTeamsLocked(finalTeams: Player[][]): void {
    this.generatedTeams = finalTeams;
    this.teamRosterOpen = finalTeams.map(() => false);
    this.matchService.getActiveMatch().then(m => {
      this.activeMatch = m;
      this.cdr.detectChanges();
    });
  }

  //  Active match toggles 
  toggleTeamRoster(index: number): void {
    this.teamRosterOpen[index] = !this.teamRosterOpen[index];
  }

  //  Finish modal 
  openFinishModal(): void {
    this.playerGoalInputs   = {};
    this.playerRatingInputs = {};
    this.selectedMvpId      = '';
    this.finishPlayerRows   = [];
    // All teams expanded by default
    this.finishTeamOpen     = this.generatedTeams.map(() => true);

    this.generatedTeams.forEach((team, teamIndex) => {
      team.forEach(player => {
        this.playerGoalInputs[player.id]   = 0;
        this.playerRatingInputs[player.id] = player.rating;
        this.finishPlayerRows.push({
          id: player.id, name: player.name,
          currentRating: player.rating, teamIndex
        });
      });
    });
    this.isFinishModalOpen = true;
  }

  closeFinishModal(): void { this.isFinishModalOpen = false; }

  toggleFinishTeam(idx: number): void {
    this.finishTeamOpen[idx] = !this.finishTeamOpen[idx];
  }

  getTeamGoalTotal(teamIndex: number): number {
    return (this.generatedTeams[teamIndex] || [])
      .reduce((s, p) => s + (this.playerGoalInputs[p.id] || 0), 0);
  }

  async submitFinishMatch(): Promise<void> {
    if (!this.activeMatch) return;

    const teamResults: Record<string, TeamResult> = {};
    this.generatedTeams.forEach((_, i) => {
      teamResults[`group${i+1}`] = { goals: this.getTeamGoalTotal(i) };
    });

    const playerStats: Record<string, PlayerMatchStat> = {};
    const playerUpdates: Record<string, PlayerEndMatchUpdate> = {};

    this.finishPlayerRows.forEach(row => {
      const newRating = this.playerRatingInputs[row.id] ?? row.currentRating;
      playerStats[row.id] = {
        goals: this.playerGoalInputs[row.id] || 0,
        isMvp: this.selectedMvpId === row.id
      };
      playerUpdates[row.id] = {
        goals:       this.playerGoalInputs[row.id] || 0,
        ratingDelta: newRating - row.currentRating,
        isMvp:       this.selectedMvpId === row.id
      };
    });

    try {
      await this.matchService.completeMatch(
        this.activeMatch.id, teamResults, playerStats, this.selectedMvpId
      );
      await this.playerService.bulkUpdateAfterMatch(playerUpdates);

      this.isFinishModalOpen     = false;
      this.activeMatch           = null;
      this.generatedTeams        = [];
      this.teamRosterOpen        = [];
      this.isMatchCreationActive = false;
      this.cdr.detectChanges();
      alert('המשחק הסתיים! הנתונים עודכנו בהצלחה.');
    } catch (e) {
      console.error(e);
      alert('שגיאה בסיום המשחק. נסה שוב.');
    }
  }

  // History helpers 
  formatMatchDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return `יום ${days[d.getDay()]}, ${d.toLocaleDateString('he-IL')} · ${d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}`;
  }

  getTeamKeys(match: Match): string[] {
    return Object.keys(match.teams || {}).sort();
  }

  getMatchups(match: Match): [string, string][] {
    const keys = this.getTeamKeys(match);
    const pairs: [string, string][] = [];
    for (let i = 0; i < keys.length; i++)
      for (let j = i+1; j < keys.length; j++)
        pairs.push([keys[i], keys[j]]);
    return pairs;
  }

  teamKeyIndex(key: string): number {
    return parseInt(key.replace('group',''), 10) - 1;
  }

  getMvpName(match: Match, players: Player[] | null): string {
    if (!match.mvpId || !players) return '';
    return players.find(p => p.id === match.mvpId)?.name || '';
  }

  getMvpPlayerName(id: string): string {
    for (const team of this.generatedTeams) {
      const p = team.find(pl => pl.id === id);
      if (p) return p.name;
    }
    return '';
  }

  // ── Players 
  async addPlayer(): Promise<void> {
    const name = this.newPlayerName.trim();
    if (!name || !this.newPlayerRole) return;
    try {
      await this.playerService.addPlayer({
        name, rating: this.newPlayerRating || 60, role: this.newPlayerRole,
        totalGoals: 0, gamesPlayed: 0, mvpAwards: 0, isActive: true
      } as Player);
      this.newPlayerName = ''; this.newPlayerRating = 0; this.newPlayerRole = '';
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async deletePlayer(id: string): Promise<void> {
    await this.playerService.deletePlayer(id);
  }

  getPlayerInitial(name: string): string { return name?.charAt(0) ?? ''; }

  get formattedMatchDate(): string {
    if (!this.selectedMatchDate) return '';
    const d = new Date(this.selectedMatchDate);
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return `יום ${days[d.getDay()]}, ${d.toLocaleDateString('he-IL')} בשעה ${d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}`;
  }

  copyLink(el: HTMLInputElement): void {
    el.select(); document.execCommand('copy'); alert('הלינק הועתק!');
  }
}