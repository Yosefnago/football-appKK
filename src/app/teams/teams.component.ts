import {
  Component, Input, OnInit, OnChanges, SimpleChanges,
  Output, EventEmitter, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';

import { Player, PlayerRole } from '../services/player.service';
import { MatchService } from '../services/match.service';

interface PitchSlot { id: string; }
interface PitchRow  { name: string; slots: PitchSlot[]; }

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.css'
})
export class TeamsComponent implements OnInit, OnChanges {
  @Input() teams:    Player[][] = [];
  @Input() matchId:  string     = '';
  @Input() readOnly  = false;

  @Output() locked = new EventEmitter<Player[][]>();

  roles: PlayerRole[] = ['GK', 'DEF', 'MID', 'FWD'];

  pitchRows: PitchRow[] = [
    { name: 'FWD', slots: [{id:'fwd-1'},{id:'fwd-2'},{id:'fwd-3'},{id:'fwd-4'},{id:'fwd-5'}] },
    { name: 'CAM', slots: [{id:'cam-1'},{id:'cam-2'},{id:'cam-3'},{id:'cam-4'},{id:'cam-5'}] },
    { name: 'MID', slots: [{id:'mid-1'},{id:'mid-2'},{id:'mid-3'},{id:'mid-4'},{id:'mid-5'}] },
    { name: 'CDM', slots: [{id:'cdm-1'},{id:'cdm-2'},{id:'cdm-3'},{id:'cdm-4'},{id:'cdm-5'}] },
    { name: 'DEF', slots: [{id:'def-1'},{id:'def-2'},{id:'def-3'},{id:'def-4'},{id:'def-5'}] },
    { name: 'GK',  slots: [{id:'gk-1'}] },
  ];

  boardState: { [teamIndex: number]: { [slotId: string]: Player[] } } = {};

  private lastTeamsRef: Player[][] = [];

  constructor(private matchService: MatchService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.initializeBoard(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teams'] && !changes['teams'].firstChange) {
      const newTeams: Player[][] = changes['teams'].currentValue;
      if (newTeams !== this.lastTeamsRef) {
        this.initializeBoard();
        this.cdr.detectChanges();
      }
    }
  }

  initializeBoard() {
    this.lastTeamsRef = this.teams;
    this.boardState   = {};

    this.teams.forEach((team, teamIndex) => {
      this.boardState[teamIndex] = {};
      this.pitchRows.forEach(row =>
        row.slots.forEach(slot => {
          this.boardState[teamIndex][`team${teamIndex}-${slot.id}`] = [];
        })
      );

      team.forEach(player => {
        const p = player as any;

        if (p._slotId) {
          const saved = p._slotId as string;
          if (this.boardState[teamIndex][saved] !== undefined) {
            this.boardState[teamIndex][saved].push(player);
            return; 
          }
        }

        const role = player.role || 'MID';
        let placed = false;
        const preferredRow = this.pitchRows.find(r => r.name === role) || this.pitchRows[2];

        for (const slot of preferredRow.slots) {
          const id = `team${teamIndex}-${slot.id}`;
          if (this.boardState[teamIndex][id].length === 0) {
            this.boardState[teamIndex][id].push(player);
            placed = true; break;
          }
        }
        if (!placed) {
          for (let r = this.pitchRows.length - 1; r >= 0; r--) {
            for (const s of this.pitchRows[r].slots) {
              const id = `team${teamIndex}-${s.id}`;
              if (this.boardState[teamIndex][id].length === 0) {
                this.boardState[teamIndex][id].push(player);
                placed = true; break;
              }
            }
            if (placed) break;
          }
        }
      });
    });
  }

  drop(event: CdkDragDrop<Player[]>) {
    if (this.readOnly) return;
    if (event.previousContainer === event.container) return;

    const prev   = event.previousContainer.data;
    const target = event.container.data;

    if (target.length > 0) {
      const a = prev[0], b = target[0];
      prev[0] = b; target[0] = a;
    } else {
      transferArrayItem(prev, target, event.previousIndex, event.currentIndex);
    }
    this.cdr.detectChanges();
  }

  changePlayerRole(player: Player, newRole: PlayerRole) {
    player.role = newRole;
    this.cdr.detectChanges();
  }

  private collectTeams(): Player[][] {
    const finalTeams: Player[][] = [];
    Object.keys(this.boardState)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(idxStr => {
        const idx = Number(idxStr);
        finalTeams[idx] = [];
        Object.entries(this.boardState[idx]).forEach(([slotId, slotArr]) => {
          if (slotArr.length > 0) {
            finalTeams[idx].push({ ...slotArr[0], _slotId: slotId } as any);
          }
        });
      });
    return finalTeams;
  }

  async saveConfiguration() {
    if (!this.matchId || this.readOnly) return;
    const finalTeams = this.collectTeams();
    try {
      await this.matchService.lockMatchAndSaveTeams(this.matchId, finalTeams);
      this.locked.emit(finalTeams);
      alert('ההרכבים ננעלו בהצלחה!');
    } catch (error) {
      console.error(error);
    }
  }

  async exportPitchImage() {
    const element = document.getElementById('tactical-pitch-canvas');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        useCORS: true, scale: 2, backgroundColor: '#f8fafc'
      });
      const canShare = 'share' in navigator && 'canShare' in navigator;
      if (canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return this.triggerDownload(canvas);
          const file = new File([blob], `tactical-board-${this.matchId}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ title: 'לוח טקטי — מנהל קבוצה', text: 'הרכבי המשחק', files: [file] });
              return;
            } catch (_) { /* user cancelled */ }
          }
          this.triggerDownload(canvas);
        }, 'image/png');
      } else {
        this.triggerDownload(canvas);
      }
    } catch (error) { console.error(error); }
  }

  private triggerDownload(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.download = `tactical-board-${this.matchId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}