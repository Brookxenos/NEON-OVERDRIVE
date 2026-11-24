import { DEFAULT_GAME_SETTINGS, GameSettingsData } from '../settings/GameSettings';
import { CarId, DEFAULT_CAR_ID, isValidCarId } from '../vehicle/CarCatalog';

export interface SaveData {
  bestScore: number;
  bestDistance: number;
  totalRuns: number;
  totalOrbs: number;
  coins: number;
  unlockedCars: CarId[];
  selectedCarId: CarId;
  progressionVersion: number;
}

const STATS_STORAGE_KEY = 'neon_overdrive_save_v1';
const SETTINGS_STORAGE_KEY = 'neon_overdrive_settings_v1';
const CURRENT_PROGRESSION_VERSION = 3;

const DEFAULT_SAVE_DATA: SaveData = {
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  totalOrbs: 0,
  coins: 0,
  unlockedCars: [DEFAULT_CAR_ID],
  selectedCarId: DEFAULT_CAR_ID,
  progressionVersion: CURRENT_PROGRESSION_VERSION,
};

export class SaveManager {
  public loadSaveData(): SaveData {
    try {
      const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
      if (!raw) {
        return {
          ...DEFAULT_SAVE_DATA,
          unlockedCars: [...DEFAULT_SAVE_DATA.unlockedCars],
        };
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const isCurrentProgression = parsed.progressionVersion === CURRENT_PROGRESSION_VERSION;

      const rawUnlocked =
        isCurrentProgression && Array.isArray(parsed.unlockedCars) ? parsed.unlockedCars : [];
      const unlockedSet = new Set<CarId>([DEFAULT_CAR_ID]);
      for (const item of rawUnlocked) {
        if (isValidCarId(item)) {
          unlockedSet.add(item);
        }
      }
      const unlockedCars = Array.from(unlockedSet);
      const selectedCarId =
        isCurrentProgression &&
        isValidCarId(parsed.selectedCarId) &&
        unlockedSet.has(parsed.selectedCarId)
          ? parsed.selectedCarId
          : DEFAULT_CAR_ID;

      const nextData: SaveData = {
        bestScore:
          typeof parsed.bestScore === 'number' && parsed.bestScore >= 0
            ? Math.floor(parsed.bestScore)
            : 0,
        bestDistance:
          typeof parsed.bestDistance === 'number' && parsed.bestDistance >= 0
            ? Math.floor(parsed.bestDistance)
            : 0,
        totalRuns:
          typeof parsed.totalRuns === 'number' && parsed.totalRuns >= 0
            ? Math.floor(parsed.totalRuns)
            : 0,
        totalOrbs:
          typeof parsed.totalOrbs === 'number' && parsed.totalOrbs >= 0
            ? Math.floor(parsed.totalOrbs)
            : 0,
        coins:
          isCurrentProgression && typeof parsed.coins === 'number' && parsed.coins >= 0
            ? Math.floor(parsed.coins)
            : 0,
        unlockedCars,
        selectedCarId,
        progressionVersion: CURRENT_PROGRESSION_VERSION,
      };

      if (!isCurrentProgression) {
        this.writeSaveData(nextData);
      }

      return nextData;
    } catch {
      return {
        ...DEFAULT_SAVE_DATA,
        unlockedCars: [...DEFAULT_SAVE_DATA.unlockedCars],
      };
    }
  }

  public writeSaveData(data: SaveData): void {
    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }

  public loadSettings(): GameSettingsData {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GAME_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettingsData>;
      return {
        graphicsQuality: parsed.graphicsQuality === 'balanced' ? 'balanced' : 'high',
        masterVolume:
          typeof parsed.masterVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.masterVolume))
            : DEFAULT_GAME_SETTINGS.masterVolume,
        musicEnabled:
          typeof parsed.musicEnabled === 'boolean'
            ? parsed.musicEnabled
            : DEFAULT_GAME_SETTINGS.musicEnabled,
        sfxEnabled:
          typeof parsed.sfxEnabled === 'boolean'
            ? parsed.sfxEnabled
            : DEFAULT_GAME_SETTINGS.sfxEnabled,
        muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
        showTouchControls:
          parsed.showTouchControls === 'always' || parsed.showTouchControls === 'off'
            ? parsed.showTouchControls
            : 'auto',
      };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  public writeSettings(settings: GameSettingsData): void {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage restrictions
    }
  }
}
