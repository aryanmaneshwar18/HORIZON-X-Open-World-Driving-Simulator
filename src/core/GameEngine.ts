import * as THREE from 'three';
import { CARS_DATABASE, DEFAULT_UPGRADES } from '../data/cars';
import { GAME_EVENTS } from '../data/events';
import { GameEvent, PlayerProgress, GameSettings, RegionId } from '../types/game';
import { Terrain } from '../world/Terrain';
import { RoadSystem } from '../world/RoadSystem';
import { Environment } from '../world/Environment';
import { DayNight } from '../world/DayNight';
import { Weather } from '../world/Weather';
import { Traffic } from '../world/Traffic';
import { HorizonBackdrop } from '../world/HorizonBackdrop';
import { VehiclePhysics } from '../vehicles/VehiclePhysics';
import { VehicleRenderer } from '../vehicles/VehicleRenderer';
import { CameraManager } from '../vehicles/CameraManager';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { SaveManager } from './SaveManager';
import { CheckpointSystem } from '../gameplay/CheckpointSystem';
import { AIController } from '../gameplay/AIController';
import { PoliceSystem } from '../gameplay/PoliceSystem';
import { RaceManager, RaceResults } from '../gameplay/RaceManager';

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;

  // Subsystems
  public audio: AudioManager;
  public input: InputManager;
  public cameraManager: CameraManager;
  public terrain: Terrain;
  public roadSystem: RoadSystem;
  public environment: Environment;
  public dayNight: DayNight;
  public weather: Weather;
  public traffic: Traffic;
  public horizonBackdrop: HorizonBackdrop;
  public checkpointSystem: CheckpointSystem;
  public aiController: AIController;
  public policeSystem: PoliceSystem;
  public raceManager: RaceManager;

  // Player Vehicle
  public playerPhysics!: VehiclePhysics;
  public playerRenderer!: VehicleRenderer;

  // State
  public progress: PlayerProgress;
  public settings: GameSettings;
  public isPaused: boolean = false;
  public currentRegion: RegionId = 'city';
  public nearbyEvent: GameEvent | null = null;
  public activeRaceResults: RaceResults | null = null;
  public countdownText: string | null = null;

  // Perf & Loop
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private isDestroyed: boolean = false;

  // UI callbacks
  private onStateUpdateCallback?: () => void;
  private onRaceFinishedCallback?: (results: RaceResults) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Load save data & settings
    this.progress = SaveManager.loadProgress();
    this.settings = SaveManager.loadSettings();

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: this.settings.graphics !== 'low',
      stencil: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.graphics === 'high' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = this.settings.graphics !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 2. Camera & Core Systems
    this.cameraManager = new CameraManager();
    this.cameraManager.setMode(this.settings.cameraMode);
    this.audio = new AudioManager();
    this.input = new InputManager();

    // 3. World Systems
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh, this.terrain.oceanMesh);

    this.roadSystem = new RoadSystem(this.terrain);
    this.scene.add(this.roadSystem.root);

    this.environment = new Environment(this.terrain, this.roadSystem);
    this.scene.add(this.environment.root);

    this.dayNight = new DayNight(this.scene);
    this.weather = new Weather(this.scene);

    this.traffic = new Traffic(this.roadSystem);
    this.scene.add(this.traffic.root);

    this.horizonBackdrop = new HorizonBackdrop();
    this.scene.add(this.horizonBackdrop.root);

    // 4. Gameplay Systems
    this.checkpointSystem = new CheckpointSystem();
    this.scene.add(this.checkpointSystem.root);

    this.aiController = new AIController();
    this.scene.add(this.aiController.root);

    this.policeSystem = new PoliceSystem();
    this.scene.add(this.policeSystem.root);

    this.raceManager = new RaceManager(this.checkpointSystem, this.aiController, this.policeSystem, this.audio);
    this.raceManager.onRaceComplete((results) => {
      this.handleRaceCompletion(results);
    });

    // 5. Initialize Player Car
    this.spawnPlayerCar(this.progress.currentCarId, new THREE.Vector3(400, 1.5, -350), 0);

    // 6. Bind Input Handlers
    this.setupInputHandlers();

    // Window resize
    window.addEventListener('resize', this.onResize);

    // Start Main Loop
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public spawnPlayerCar(carId: string, position: THREE.Vector3, yawAngle: number = 0) {
    if (this.playerRenderer) {
      this.scene.remove(this.playerRenderer.root);
    }

    const carDef = CARS_DATABASE.find(c => c.id === carId) || CARS_DATABASE[0];
    const upgrades = this.progress.carUpgrades[carId] || { ...DEFAULT_UPGRADES };
    const custom = this.progress.carCustomizations[carId] || {
      paintColor: carDef.baseColor,
      finish: 'metallic',
      rimColor: '#1e293b',
      windowTint: '#0f172a',
      underglow: carDef.baseColor,
      spoilerStyle: 'none',
      wheelStyle: 'sport',
    };

    this.playerPhysics = new VehiclePhysics(carDef, upgrades, position);
    this.playerPhysics.resetTo(position, yawAngle);

    this.playerRenderer = new VehicleRenderer(carDef, custom);
    this.scene.add(this.playerRenderer.root);
  }

  private setupInputHandlers() {
    this.input.onReset(() => {
      const resetPt = this.roadSystem.getNearestRoadPoint(this.playerPhysics.state.position);
      this.playerPhysics.resetTo(resetPt.position, resetPt.yaw);
      this.audio.playCollisionSound(0.5);
    });

    this.input.onCameraToggle(() => {
      this.cameraManager.cycleMode();
      this.settings.cameraMode = this.cameraManager.mode;
      SaveManager.saveSettings(this.settings);
    });

    this.input.onCheatCredits(() => {
      this.progress.credits += 100000;
      this.audio.playCashSound();
      SaveManager.saveProgress(this.progress);
    });

    this.input.onCheatUnlock(() => {
      this.progress.credits += 250000;
      this.progress.level = 25;
      this.progress.discoveredRegions = ['city', 'mountains', 'desert', 'coast'];
      CARS_DATABASE.forEach(car => {
        if (!this.progress.ownedCars.includes(car.id)) {
          this.progress.ownedCars.push(car.id);
        }
      });
      SaveManager.saveProgress(this.progress);
      this.audio.playCashSound();
    });

    this.input.onCheatWeather(() => {
      const weathers: ('clear' | 'rain' | 'fog' | 'storm')[] = ['clear', 'rain', 'fog', 'storm'];
      const curIdx = weathers.indexOf(this.weather.currentWeather);
      const nextW = weathers[(curIdx + 1) % weathers.length];
      this.weather.setWeather(nextW);
    });
  }

  private animate = (currentTime: number) => {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.08, (currentTime - this.lastTime) * 0.001);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(dt, currentTime * 0.001);
    }

    this.renderer.render(this.scene, this.cameraManager.camera);
  };

  private update(dt: number, timeSec: number) {
    const inputs = this.input.getInput();

    // 1. Update Player Physics
    this.playerPhysics.update(dt, inputs, (x, z) => {
      const roadInfo = this.roadSystem.sampleRoadHeight(x, z);
      const ground = this.terrain.sample(x, z);
      if (roadInfo.onRoad && roadInfo.height >= ground.height - 0.2) {
        return {
          height: roadInfo.height,
          surface: 'asphalt' as const,
          normal: new THREE.Vector3(0, 1, 0),
        };
      }
      return ground;
    });

    const pState = this.playerPhysics.state;

    // 2. Obstacle Collisions against Buildings / Boulders / Trees
    const hitObs = this.environment.checkCollision(pState.position, 1.8);
    if (hitObs) {
      const normal = new THREE.Vector3(pState.position.x - hitObs.x, 0, pState.position.z - hitObs.z).normalize();
      this.playerPhysics.handleCollision(normal, 0.4);
      this.cameraManager.triggerShake(Math.min(2.0, (pState.speedKmh / 90) * 0.8));
      this.audio.playCollisionSound(Math.min(1.0, pState.speedKmh / 120));
    }

    // 3. Traffic Collision Check
    const hitTraffic = this.traffic.checkPlayerCollision(pState.position, 2.0);
    if (hitTraffic) {
      const normal = pState.position.clone().sub(hitTraffic.mesh.position).normalize();
      this.playerPhysics.handleCollision(normal, 0.5);
      this.cameraManager.triggerShake(1.2);
      this.audio.playCollisionSound(0.7);
    }

    // 4. Update 3D Visual Mesh for Player Car
    this.playerRenderer.root.position.copy(pState.position);
    this.playerRenderer.root.quaternion.copy(pState.quaternion);
    this.playerRenderer.update(dt, {
      steerAngle: pState.steerAngle,
      speedKmh: pState.speedKmh,
      isBraking: inputs.brake > 0.1,
      isNitroActive: pState.isNitroActive,
      pitch: pState.pitch,
      roll: pState.roll,
    });
    this.playerRenderer.setHeadlightsEnabled(this.dayNight.isNight());

    // 5. Update Camera
    this.cameraManager.update(
      dt,
      pState.position,
      pState.quaternion,
      pState.speedKmh,
      pState.isDrifting,
      pState.driftAngleDeg,
      pState.isNitroActive
    );

    // 6. Update Audio
    this.audio.updateVehicleAudio({
      speedKmh: pState.speedKmh,
      rpm: pState.rpm,
      gear: pState.gear,
      isDrifting: pState.isDrifting,
      driftIntensity: Math.min(1.0, pState.driftAngleDeg / 40),
      isNitroActive: pState.isNitroActive,
      isBraking: inputs.brake > 0.1,
    });

    // 7. Update World (Day/Night, Weather, Traffic, Environment)
    this.dayNight.update(dt, pState.position);
    this.weather.update(dt, this.cameraManager.camera.position);
    this.terrain.updateOcean(timeSec);
    this.traffic.update(dt, pState.position);
    this.environment.update(timeSec);
    this.checkpointSystem.update(timeSec);

    // 8. Update Active Race
    const raceUpdate = this.raceManager.update(
      dt,
      pState.position,
      pState.speedKmh,
      pState.isDrifting,
      Math.floor(pState.driftAngleDeg * dt * 8)
    );
    this.countdownText = raceUpdate.countdownText;

    // 9. Check Proximity to World Events (if not currently racing)
    if (!this.raceManager.isRacing && !this.raceManager.isStarting) {
      this.checkEventProximity(pState.position);
    } else {
      this.nearbyEvent = null;
    }

    // 10. Update Region detection & Exploration records
    this.updateRegionDetection(pState.position);

    // Total distance tracking
    this.progress.totalDistanceDriven += (pState.speedKmh / 3.6) * dt;
    this.progress.totalDriftScore = Math.max(this.progress.totalDriftScore, pState.driftScore);

    // Fire UI updates
    this.onStateUpdateCallback?.();
  }

  private updateRegionDetection(pos: THREE.Vector3) {
    let region: RegionId = 'city';
    if (pos.x < 0 && pos.z < 0) region = 'mountains';
    else if (pos.x < 0 && pos.z >= 0) region = 'desert';
    else if (pos.x >= 0 && pos.z >= 0) region = 'coast';
    else region = 'city';

    if (region !== this.currentRegion) {
      this.currentRegion = region;
      if (!this.progress.discoveredRegions.includes(region)) {
        this.progress.discoveredRegions.push(region);
        this.progress.credits += 5000;
        this.progress.xp += 400;
        this.audio.playCheckpointChime();
        SaveManager.saveProgress(this.progress);
      }
    }
  }

  private checkEventProximity(pos: THREE.Vector3) {
    let nearest: GameEvent | null = null;
    let minDist = 25.0; // Trigger prompt radius

    for (const evt of GAME_EVENTS) {
      const dist = Math.hypot(pos.x - evt.position[0], pos.z - evt.position[2]);
      if (dist < minDist) {
        minDist = dist;
        nearest = evt;
      }
    }

    this.nearbyEvent = nearest;
  }

  public launchEvent(event: GameEvent) {
    const heading = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerPhysics.state.quaternion);
    this.playerPhysics.state.velocity.set(0, 0, 0);
    this.playerPhysics.state.speedKmh = 0;
    this.raceManager.startEvent(event, this.playerPhysics.state.position, heading);
  }

  private handleRaceCompletion(results: RaceResults) {
    this.activeRaceResults = results;

    // Award player
    this.progress.credits += results.creditsEarned;
    this.progress.xp += results.xpEarned;
    if (results.position === 1) {
      this.progress.totalRacesWon++;
    }

    // Check level progression
    const neededXP = SaveManager.getXPForLevel(this.progress.level);
    if (this.progress.xp >= neededXP) {
      this.progress.level++;
      this.audio.playCashSound();
    }

    // Save event completion
    this.progress.completedEvents[results.event.id] = {
      bestTime: results.time,
      bestScore: results.score,
      bestSpeed: results.speed,
    };

    SaveManager.saveProgress(this.progress);
    this.audio.playCashSound();
    this.onRaceFinishedCallback?.(results);
  }

  public fastTravelTo(position: [number, number, number]) {
    const targetPos = new THREE.Vector3(position[0], position[1] + 1.0, position[2]);
    const nearestRoad = this.roadSystem.getNearestRoadPoint(targetPos);
    this.playerPhysics.resetTo(nearestRoad.position, nearestRoad.yaw);
    this.raceManager.cancelEvent();
  }

  private onResize = () => {
    this.cameraManager.handleResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public onStateUpdate(cb: () => void) {
    this.onStateUpdateCallback = cb;
  }

  public onRaceFinished(cb: (results: RaceResults) => void) {
    this.onRaceFinishedCallback = cb;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
