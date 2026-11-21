export type GraphicsQuality = 'high' | 'balanced';
export type TouchControlsMode = 'auto' | 'always' | 'off';

export interface GameSettingsData {
  graphicsQuality: GraphicsQuality;
  masterVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  muted: boolean;
  showTouchControls: TouchControlsMode;
}

export const DEFAULT_GAME_SETTINGS: GameSettingsData = {
  graphicsQuality: 'high',
  masterVolume: 0.75,
  musicEnabled: true,
  sfxEnabled: true,
  muted: false,
  showTouchControls: 'auto',
};

export type SettingsListener = (settings: GameSettingsData) => void;

export class GameSettings {
  private data: GameSettingsData;
  private readonly listeners = new Set<SettingsListener>();

  constructor(initial: GameSettingsData = DEFAULT_GAME_SETTINGS) {
    this.data = { ...initial };
  }

  public get(): GameSettingsData {
    return { ...this.data };
  }

  public update(patch: Partial<GameSettingsData>): GameSettingsData {
    this.data = {
      ...this.data,
      ...patch,
    };
    const snapshot = this.get();
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
