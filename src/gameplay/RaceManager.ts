import * as THREE from 'three';
import { GameEvent, PlayerProgress } from '../types/game';
import { CheckpointSystem } from './CheckpointSystem';
import { AIController } from './AIController';
import { PoliceSystem } from './PoliceSystem';
import { AudioManager } from '../core/AudioManager';

export interface RaceResults {
  event: GameEvent;
  position: number;
  totalRacers: number;
  time: number;
  creditsEarned: number;
  xpEarned: number;
  isNewRecord: boolean;
  score?: number;
  speed?: number;
}

export class RaceManager {
  public activeEvent: GameEvent | null = null;
  public checkpointSystem: CheckpointSystem;
  public aiController: AIController;
  public policeSystem: PoliceSystem;
  private audioManager: AudioManager;

  // Race states
  public isRacing: boolean = false;
  public isStarting: boolean = false;
  public countdownTimer: number = 3.99;
  public raceTimer: number = 0;
  public playerLap: number = 1;
  public totalLaps: number = 1;
  public playerDistanceTraveled: number = 0;
  public driftZoneScore: number = 0;

  private onRaceCompleteCallback?: (results: RaceResults) => void;

  constructor(checkpointSystem: CheckpointSystem, aiController: AIController, policeSystem: PoliceSystem, audioManager: AudioManager) {
    this.checkpointSystem = checkpointSystem;
    this.aiController = aiController;
    this.policeSystem = policeSystem;
    this.audioManager = audioManager;
  }

  public startEvent(event: GameEvent, playerPos: THREE.Vector3, playerHeading: THREE.Vector3) {
    this.activeEvent = event;
    this.isStarting = true;
    this.isRacing = false;
    this.countdownTimer = 3.99;
    this.raceTimer = 0;
    this.playerLap = 1;
    this.totalLaps = event.laps || 1;
    this.playerDistanceTraveled = 0;
    this.driftZoneScore = 0;

    // 1. Setup Checkpoints if present
    if (event.checkpoints && event.checkpoints.length > 0) {
      this.checkpointSystem.setup(event.checkpoints);
    } else {
      this.checkpointSystem.clear();
    }

    // 2. Setup AI Opponents for race / circuit / hill climb / championship
    if (event.aiOpponentCount && event.checkpoints) {
      this.aiController.setup(
        event.aiOpponentCount,
        playerPos,
        playerHeading,
        event.checkpoints,
        this.totalLaps
      );
    } else {
      this.aiController.clear();
    }

    // 3. Police Escape Event setup
    if (event.type === 'police_escape') {
      this.policeSystem.startPursuit(3, playerPos, playerHeading);
      this.audioManager.setPoliceSiren(true);
    } else {
      this.policeSystem.stopPursuit();
      this.audioManager.setPoliceSiren(false);
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, playerSpeedKmh: number, isDrifting: boolean, driftPoints: number): {
    countdownText: string | null;
    isFinished: boolean;
  } {
    if (!this.activeEvent) return { countdownText: null, isFinished: false };

    // 1. Starting countdown sequence
    if (this.isStarting) {
      const prevInt = Math.floor(this.countdownTimer);
      this.countdownTimer -= dt;
      const curInt = Math.floor(this.countdownTimer);

      if (curInt !== prevInt && curInt >= 0) {
        if (curInt === 0) {
          this.audioManager.playCountdownBeep(true);
        } else {
          this.audioManager.playCountdownBeep(false);
        }
      }

      if (this.countdownTimer <= 0) {
        this.isStarting = false;
        this.isRacing = true;
      }

      const txt = curInt === 3 ? '3' : curInt === 2 ? '2' : curInt === 1 ? '1' : curInt === 0 ? 'GO!' : null;
      return { countdownText: txt, isFinished: false };
    }

    if (!this.isRacing) return { countdownText: null, isFinished: false };

    this.raceTimer += dt;
    this.playerDistanceTraveled += (playerSpeedKmh / 3.6) * dt;

    // 2. Update AI opponents
    this.aiController.update(dt, this.isRacing, this.raceTimer, playerPos);

    // 3. Checkpoint progression
    if (this.activeEvent.checkpoints) {
      const passInfo = this.checkpointSystem.checkPass(playerPos);
      if (passInfo.passed) {
        this.audioManager.playCheckpointChime();
        if (passInfo.finished) {
          if (this.playerLap < this.totalLaps) {
            this.playerLap++;
            this.checkpointSystem.setup(this.activeEvent.checkpoints);
          } else {
            // Race Finish!
            this.completeRace();
            return { countdownText: null, isFinished: true };
          }
        }
      }
    }

    // 4. Speed Trap Check
    if (this.activeEvent.type === 'speed_trap') {
      const targetPos = new THREE.Vector3(...this.activeEvent.position);
      if (playerPos.distanceTo(targetPos) < 18.0) {
        this.audioManager.playCheckpointChime();
        this.completeSpeedTrap(playerSpeedKmh);
        return { countdownText: null, isFinished: true };
      }
    }

    // 5. Drift Zone accumulation
    if (this.activeEvent.type === 'drift_zone') {
      const center = new THREE.Vector3(...this.activeEvent.position);
      if (playerPos.distanceTo(center) < 140.0) {
        if (isDrifting) {
          this.driftZoneScore += driftPoints;
        }
      } else if (this.driftZoneScore > 0) {
        // Exited zone
        this.completeDriftZone();
        return { countdownText: null, isFinished: true };
      }
    }

    // 6. Police Pursuit Escape check
    if (this.activeEvent.type === 'police_escape') {
      const pursuitResult = this.policeSystem.update(dt, playerPos, playerSpeedKmh);
      if (pursuitResult.escaped) {
        this.completePoliceEscape(true);
        return { countdownText: null, isFinished: true };
      } else if (pursuitResult.busted) {
        this.completePoliceEscape(false);
        return { countdownText: null, isFinished: true };
      }
    }

    return { countdownText: null, isFinished: false };
  }

  private completeRace() {
    if (!this.activeEvent) return;
    this.isRacing = false;
    const { position, totalRacers } = this.aiController.getRacePosition(this.playerDistanceTraveled, this.playerLap);

    // Multiplier for podium
    const posMultiplier = position === 1 ? 1.0 : position === 2 ? 0.75 : position === 3 ? 0.55 : 0.35;
    const credits = Math.floor(this.activeEvent.rewardCredits * posMultiplier);
    const xp = Math.floor(this.activeEvent.rewardXP * posMultiplier);

    const results: RaceResults = {
      event: this.activeEvent,
      position,
      totalRacers,
      time: this.raceTimer,
      creditsEarned: credits,
      xpEarned: xp,
      isNewRecord: true,
    };

    this.onRaceCompleteCallback?.(results);
  }

  private completeSpeedTrap(speedKmh: number) {
    if (!this.activeEvent) return;
    this.isRacing = false;
    const target = this.activeEvent.targetSpeed || 200;
    const ratio = Math.min(1.5, speedKmh / target);
    const credits = Math.floor(this.activeEvent.rewardCredits * ratio);
    const xp = Math.floor(this.activeEvent.rewardXP * ratio);

    const results: RaceResults = {
      event: this.activeEvent,
      position: 1,
      totalRacers: 1,
      time: this.raceTimer,
      speed: Math.round(speedKmh),
      creditsEarned: credits,
      xpEarned: xp,
      isNewRecord: speedKmh >= target,
    };
    this.onRaceCompleteCallback?.(results);
  }

  private completeDriftZone() {
    if (!this.activeEvent) return;
    this.isRacing = false;
    const target = this.activeEvent.targetDriftScore || 10000;
    const ratio = Math.min(1.5, this.driftZoneScore / target);
    const credits = Math.floor(this.activeEvent.rewardCredits * ratio);
    const xp = Math.floor(this.activeEvent.rewardXP * ratio);

    const results: RaceResults = {
      event: this.activeEvent,
      position: 1,
      totalRacers: 1,
      time: this.raceTimer,
      score: this.driftZoneScore,
      creditsEarned: credits,
      xpEarned: xp,
      isNewRecord: this.driftZoneScore >= target,
    };
    this.onRaceCompleteCallback?.(results);
  }

  private completePoliceEscape(escaped: boolean) {
    if (!this.activeEvent) return;
    this.isRacing = false;
    this.audioManager.setPoliceSiren(false);

    const credits = escaped ? this.activeEvent.rewardCredits : 0;
    const xp = escaped ? this.activeEvent.rewardXP : 100;

    const results: RaceResults = {
      event: this.activeEvent,
      position: escaped ? 1 : 2,
      totalRacers: 1,
      time: this.raceTimer,
      creditsEarned: credits,
      xpEarned: xp,
      isNewRecord: escaped,
    };
    this.onRaceCompleteCallback?.(results);
  }

  public cancelEvent() {
    this.activeEvent = null;
    this.isStarting = false;
    this.isRacing = false;
    this.checkpointSystem.clear();
    this.aiController.clear();
    this.policeSystem.stopPursuit();
    this.audioManager.setPoliceSiren(false);
  }

  public onRaceComplete(cb: (results: RaceResults) => void) {
    this.onRaceCompleteCallback = cb;
  }
}
