export type RegionId = 'city' | 'mountains' | 'desert' | 'coast';

export type EventType = 
  | 'sprint' 
  | 'circuit' 
  | 'drift_zone' 
  | 'speed_trap' 
  | 'hill_climb' 
  | 'rally' 
  | 'police_escape'
  | 'time_trial'
  | 'championship';

export type CarCategory = 
  | 'starter' 
  | 'street' 
  | 'jdm' 
  | 'muscle' 
  | 'supercar' 
  | 'hypercar' 
  | 'rally' 
  | 'drift';

export type DrivetrainType = 'RWD' | 'AWD' | 'FWD';

export interface CarStats {
  power: number;       // 1 - 10
  torque: number;      // 1 - 10
  weight: number;      // kg
  topSpeed: number;    // km/h
  acceleration: number;// 0-100 time in seconds (lower is faster)
  braking: number;     // 1 - 10
  grip: number;        // 1 - 10
  handling: number;    // 1 - 10
  drift: number;       // 1 - 10
}

export interface CarUpgrades {
  engine: number;       // 0 - 3
  turbo: number;        // 0 - 3
  transmission: number; // 0 - 3
  brakes: number;       // 0 - 3
  suspension: number;   // 0 - 3
  tires: number;        // 0 - 3
  weightReduction: number; // 0 - 3
  drivetrain: DrivetrainType;
  gearRatio: number;    // 0.8 to 1.2
}

export interface CarCustomization {
  paintColor: string;
  finish: 'gloss' | 'metallic' | 'matte';
  rimColor: string;
  windowTint: string;
  underglow: string | null; // hex color or null
  spoilerStyle: 'none' | 'ducktail' | 'gt_wing' | 'carbon_race';
  wheelStyle: 'sport' | 'mesh' | 'five_spoke' | 'deep_dish';
}

export interface CarDefinition {
  id: string;
  name: string;
  category: CarCategory;
  description: string;
  price: number;
  stats: CarStats;
  baseColor: string;
  modelStyle: {
    chassisScale: [number, number, number];
    bodyShape: 'coupe' | 'sedan' | 'muscle' | 'supercar' | 'rally' | 'hyper';
    cabinOffset: [number, number, number];
    cabinScale: [number, number, number];
    wheelRadius: number;
    wheelWidth: number;
    wheelBase: number;
    trackWidth: number;
  };
}

export interface GameEvent {
  id: string;
  title: string;
  region: RegionId;
  type: EventType;
  description: string;
  position: [number, number, number];
  rewardCredits: number;
  rewardXP: number;
  targetTime?: number;
  targetSpeed?: number;
  targetDriftScore?: number;
  laps?: number;
  checkpoints?: [number, number, number][];
  aiOpponentCount?: number;
  unlockedLevel?: number;
}

export interface PlayerProgress {
  credits: number;
  xp: number;
  level: number;
  currentCarId: string;
  ownedCars: string[];
  carUpgrades: Record<string, CarUpgrades>;
  carCustomizations: Record<string, CarCustomization>;
  completedEvents: Record<string, { bestTime?: number; bestScore?: number; bestSpeed?: number }>;
  discoveredRegions: RegionId[];
  discoveredLocations: string[];
  championshipRound: number; // 0 to 5
  totalDistanceDriven: number;
  totalDriftScore: number;
  totalRacesWon: number;
}

export type WeatherType = 'clear' | 'rain' | 'fog' | 'storm';
export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';

export type SurfaceType = 'asphalt' | 'dirt' | 'grass' | 'water';

export interface GameSettings {
  graphics: 'low' | 'medium' | 'high';
  audioVolume: number;
  musicVolume: number;
  masterVolume?: number;
  cameraMode: 'chase' | 'close' | 'far' | 'hood' | 'cinematic';
  speedUnit: 'kmh' | 'mph';
  steeringSensitivity: number;
}
