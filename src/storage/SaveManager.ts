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

const CURRENT_SETTINGS_VERSION = 2;

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
      const parsed = JSON.parse(raw) as Partial<SaveData> | null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          ...DEFAULT_SAVE_DATA,
          unlockedCars: [...DEFAULT_SAVE_DATA.unlockedCars],
        };
      }
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
          typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore) && parsed.bestScore >= 0
            ? Math.floor(parsed.bestScore)
            : 0,
        bestDistance:
          typeof parsed.bestDistance === 'number' && Number.isFinite(parsed.bestDistance) && parsed.bestDistance >= 0
            ? Math.floor(parsed.bestDistance)
            : 0,
        totalRuns:
          typeof parsed.totalRuns === 'number' && Number.isFinite(parsed.totalRuns) && parsed.totalRuns >= 0
            ? Math.floor(parsed.totalRuns)
            : 0,
        totalOrbs:
          typeof parsed.totalOrbs === 'number' && Number.isFinite(parsed.totalOrbs) && parsed.totalOrbs >= 0
            ? Math.floor(parsed.totalOrbs)
            : 0,
        coins:
          isCurrentProgression &&
          typeof parsed.coins === 'number' &&
          Number.isFinite(parsed.coins) &&
          parsed.coins >= 0
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
      const parsed = JSON.parse(raw) as (Partial<GameSettingsData> & { settingsVersion?: number }) | null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ...DEFAULT_GAME_SETTINGS };
      }

      const isCurrentVersion = parsed.settingsVersion === CURRENT_SETTINGS_VERSION;
      const rawVol =
        typeof parsed.masterVolume === 'number' && Number.isFinite(parsed.masterVolume)
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : DEFAULT_GAME_SETTINGS.masterVolume;
      const masterVolume =
        !isCurrentVersion && Math.abs(rawVol - 0.75) < 0.001
          ? DEFAULT_GAME_SETTINGS.masterVolume
          : rawVol;

      const settings: GameSettingsData = {
        graphicsQuality: parsed.graphicsQuality === 'balanced' ? 'balanced' : 'high',
        masterVolume,
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

      if (!isCurrentVersion) {
        this.writeSettings(settings);
      }

      return settings;
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  public writeSettings(settings: GameSettingsData): void {
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...settings, settingsVersion: CURRENT_SETTINGS_VERSION }),
      );
    } catch {
      // Ignore storage restrictions
    }
  }
}
