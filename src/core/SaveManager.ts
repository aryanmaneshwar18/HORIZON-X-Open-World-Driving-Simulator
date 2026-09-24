import { PlayerProgress, GameSettings, CarUpgrades, CarCustomization } from '../types/game';
import { CARS_DATABASE, DEFAULT_UPGRADES } from '../data/cars';

const SAVE_KEY = 'horizon_x_save_data_v1';
const SETTINGS_KEY = 'horizon_x_settings_v1';

export class SaveManager {
  private static defaultProgress: PlayerProgress = {
    credits: 15000,
    xp: 0,
    level: 1,
    currentCarId: 'apex_pulse_r',
    ownedCars: ['apex_pulse_r'],
    carUpgrades: {
      apex_pulse_r: { ...DEFAULT_UPGRADES },
    },
    carCustomizations: {
      apex_pulse_r: {
        paintColor: '#f97316',
        finish: 'metallic',
        rimColor: '#1e293b',
        windowTint: '#0f172a',
        underglow: '#f97316',
        spoilerStyle: 'none',
        wheelStyle: 'sport',
      },
    },
    completedEvents: {},
    discoveredRegions: ['city'],
    discoveredLocations: ['Metro Downtown', 'City Garage'],
    championshipRound: 0,
    totalDistanceDriven: 0,
    totalDriftScore: 0,
    totalRacesWon: 0,
  };

  private static defaultSettings: GameSettings = {
    graphics: 'high',
    audioVolume: 0.8,
    musicVolume: 0.6,
    cameraMode: 'chase',
    speedUnit: 'kmh',
    steeringSensitivity: 1.0,
  };

  public static loadProgress(): PlayerProgress {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...this.defaultProgress, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load save from localStorage:', e);
    }
    return { ...this.defaultProgress };
  }

  public static saveProgress(progress: PlayerProgress): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save progress to localStorage:', e);
    }
  }

  public static loadSettings(): GameSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return { ...this.defaultSettings };
  }

  public static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  public static resetSave(): PlayerProgress {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('Failed to reset save:', e);
    }
    return { ...this.defaultProgress };
  }

  // Level thresholds (e.g. lvl 1 = 0, lvl 2 = 1000, lvl 3 = 2500, etc.)
  public static getXPForLevel(lvl: number): number {
    return Math.floor(750 * Math.pow(lvl, 1.45));
  }

  public static getTitleForLevel(lvl: number): string {
    if (lvl >= 25) return 'HORIZON X CHAMPION';
    if (lvl >= 20) return 'RACING LEGEND';
    if (lvl >= 15) return 'MASTER DRIFTER';
    if (lvl >= 10) return 'PRO RACER';
    if (lvl >= 5) return 'STREET RACER';
    return 'ROOKIE';
  }
}
