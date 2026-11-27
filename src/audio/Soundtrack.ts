const YOUTUBE_PLAYLIST_ID = 'PLgnM8w6PHYgdqsfLvJGA7dAL_2qaPnNyp';
const MAX_PLAYLIST_TRACKS = 30;
const YOUTUBE_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';

const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  playVideoAt(index: number): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  setLoop(loopPlaylists: boolean): void;
  setShuffle(shufflePlaylist: boolean): void;
  getPlaylist(): string[] | null;
  getPlaylistIndex(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      width?: number | string;
      height?: number | string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function ensureYouTubeApiLoaded(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve();
  }
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        previousCallback();
      }
      resolve();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = YOUTUBE_IFRAME_API_SRC;
      script.async = true;
      script.onerror = () => {
        apiLoadPromise = null;
        resolve();
      };
      document.head.appendChild(script);
    }
  });

  return apiLoadPromise;
}

export class Soundtrack {
  private container: HTMLDivElement | null = null;
  private player: YTPlayerInstance | null = null;
  private playerReady = false;
  private initializing = false;
  private disposed = false;

  private unlocked = false;
  private shouldPlay = false;
  private musicEnabled = true;
  private muted = false;
  private masterVolume = 0.75;

  private currentTrackIndex = 0;
  private trackLimit = MAX_PLAYLIST_TRACKS;
  private readonly playedIndices = new Set<number>();
  private playlistFinished = false;
  private hasStartedFirstTrack = false;
  private advanceOnNextStart = false;
  private advanceTimer: number | null = null;
  private lastAppliedPlayIntent: boolean | null = null;

  public preload(): void {
    if (this.disposed || this.player || this.initializing) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.initializing = true;
    void ensureYouTubeApiLoaded().then(() => {
      this.initializing = false;
      if (this.disposed || this.player) return;
      this.createPlayer();
    });
  }

  public unlock(): void {
    if (this.disposed) return;
    this.unlocked = true;
    this.preload();

    if (
      this.playerReady &&
      this.player &&
      this.musicEnabled &&
      !this.muted &&
      this.shouldPlay &&
      !this.playlistFinished
    ) {
      this.lastAppliedPlayIntent = true;
      this.startOrResumePlayback();
    }
  }

  public syncMix(masterVolume01: number, musicEnabled: boolean, muted: boolean): void {
    this.masterVolume = Number.isFinite(masterVolume01)
      ? Math.max(0, Math.min(1, masterVolume01))
      : 0.75;
    this.musicEnabled = musicEnabled;
    this.muted = muted;
    this.applyPlayerMix();
  }

  public setPlaybackActive(active: boolean): void {
    if (this.disposed) return;
    this.shouldPlay = active;

    if (!this.playerReady || !this.player) return;

    if (!active || this.playlistFinished) {
      if (this.lastAppliedPlayIntent !== false) {
        this.lastAppliedPlayIntent = false;
        this.clearAdvanceTimer();
        try {
          const state = this.player.getPlayerState();
          if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
            this.player.pauseVideo();
          }
        } catch {
          // Ignore transient player state errors
        }
      }
      return;
    }

    if (!this.unlocked) return;

    if (this.lastAppliedPlayIntent !== true) {
      this.lastAppliedPlayIntent = true;
      this.startOrResumePlayback();
    }
  }

  public stopNow(): void {
    if (this.disposed) return;
    this.shouldPlay = false;
    this.lastAppliedPlayIntent = false;
    this.clearAdvanceTimer();
    if (!this.playerReady || !this.player) return;
    try {
      const state = this.player.getPlayerState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        this.player.pauseVideo();
      }
    } catch {
      // Ignore transient player state errors
    }
  }

  public stopForGameOver(): void {
    if (this.disposed) return;
    this.stopNow();
    if (this.hasStartedFirstTrack) {
      this.playedIndices.add(this.currentTrackIndex);
      this.advanceOnNextStart = true;
      this.playlistFinished = false;
    }
  }

  public selectNextTrack(): void {
    if (this.disposed || this.playlistFinished) return;
    this.playedIndices.add(this.currentTrackIndex);
    const nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
    if (nextIdx === null) {
      this.finishPlaylist();
      return;
    }
    this.currentTrackIndex = nextIdx;
    this.hasStartedFirstTrack = true;
    if (this.playerReady && this.player && this.unlocked && this.shouldPlay) {
      this.playTrackAt(nextIdx);
    }
  }

  public resetClock(): void {
    // No-op kept for audio lifecycle compatibility
  }

  public sweepStaleVoices(): void {
    // No-op kept for audio lifecycle compatibility
  }

  private createPlayer(): void {
    if (this.disposed || !window.YT || typeof window.YT.Player !== 'function') return;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.right = '2px';
    host.style.bottom = '2px';
    host.style.width = '2px';
    host.style.height = '2px';
    host.style.opacity = '0.001';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    host.style.zIndex = '-1';

    const mount = document.createElement('div');
    mount.id = `yt-bgm-${Math.random().toString(36).slice(2, 9)}`;
    host.appendChild(mount);
    document.body.appendChild(host);
    this.container = host;

    this.player = new window.YT.Player(mount, {
      width: 2,
      height: 2,
      playerVars: {
        listType: 'playlist',
        list: YOUTUBE_PLAYLIST_ID,
        index: this.currentTrackIndex,
        autoplay: this.unlocked && this.shouldPlay && !this.playlistFinished ? 1 : 0,
        loop: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => this.handleReady(),
        onStateChange: (event) => this.handleStateChange(event.data),
        onError: () => this.handleTrackError(),
      },
    });
  }

  private handleReady(): void {
    if (this.disposed || !this.player) return;
    this.playerReady = true;

    try {
      this.player.setLoop(false);
      this.player.setShuffle(false);
    } catch {
      // Ignore if playlist metadata is still settling
    }

    this.syncTrackLimit();
    this.applyPlayerMix();

    if (this.unlocked && this.shouldPlay && !this.playlistFinished) {
      this.lastAppliedPlayIntent = true;
      this.startOrResumePlayback();
    }
  }

  private handleStateChange(state: number): void {
    if (this.disposed || !this.player) return;

    if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
      this.clearAdvanceTimer();
      this.syncTrackLimit();

      let ytIndex = -1;
      try {
        ytIndex = this.player.getPlaylistIndex();
      } catch {
        ytIndex = -1;
      }

      if (ytIndex >= this.trackLimit) {
        this.finishPlaylist();
        return;
      }

      if (ytIndex >= 0) {
        if (this.playedIndices.has(ytIndex)) {
          const nextIdx = this.findNextUnplayedIndex(ytIndex + 1);
          if (nextIdx === null) {
            this.finishPlaylist();
          } else {
            this.currentTrackIndex = nextIdx;
            this.playTrackAt(nextIdx);
          }
          return;
        }
        this.currentTrackIndex = ytIndex;
        this.hasStartedFirstTrack = true;
      }
      return;
    }

    if (state === YT_STATE.ENDED) {
      this.clearAdvanceTimer();
      this.syncTrackLimit();
      this.playedIndices.add(this.currentTrackIndex);

      const nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
      if (nextIdx === null) {
        this.finishPlaylist();
        return;
      }

      this.currentTrackIndex = nextIdx;
      this.advanceTimer = window.setTimeout(() => {
        this.advanceTimer = null;
        if (this.disposed || !this.player || !this.shouldPlay || this.playlistFinished) return;
        try {
          const playerState = this.player.getPlayerState();
          const activeIndex = this.player.getPlaylistIndex();
          if (
            (playerState === YT_STATE.PLAYING || playerState === YT_STATE.BUFFERING) &&
            activeIndex === nextIdx
          ) {
            return;
          }
        } catch {
          // Proceed with explicit advance
        }
        this.playTrackAt(nextIdx);
      }, 320);
    }
  }

  private handleTrackError(): void {
    if (this.disposed || !this.player || this.playlistFinished) return;
    this.clearAdvanceTimer();
    this.syncTrackLimit();
    this.playedIndices.add(this.currentTrackIndex);

    const nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
    if (nextIdx === null) {
      this.finishPlaylist();
      return;
    }

    this.currentTrackIndex = nextIdx;
    if (this.unlocked && this.shouldPlay) {
      this.playTrackAt(nextIdx);
    }
  }

  private startOrResumePlayback(): void {
    if (!this.player || !this.playerReady || this.playlistFinished) return;
    this.applyPlayerMix();

    try {
      if (this.advanceOnNextStart) {
        this.advanceOnNextStart = false;
        this.syncTrackLimit();
        let nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
        if (nextIdx === null) {
          const previousIdx = this.currentTrackIndex;
          this.playedIndices.clear();
          nextIdx = this.trackLimit > 1 && previousIdx === 0 ? 1 : 0;
        }
        this.currentTrackIndex = nextIdx;
        this.hasStartedFirstTrack = true;
        this.player.playVideoAt(nextIdx);
        return;
      }

      const state = this.player.getPlayerState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        return;
      }
      if (!this.hasStartedFirstTrack) {
        this.hasStartedFirstTrack = true;
        this.currentTrackIndex = 0;
        if (state === YT_STATE.CUED) {
          this.player.playVideo();
        } else {
          this.player.playVideoAt(0);
        }
      } else if (state === YT_STATE.PAUSED || state === YT_STATE.CUED) {
        this.player.playVideo();
      } else {
        this.player.playVideoAt(this.currentTrackIndex);
      }
    } catch {
      // Ignore transient API readiness errors
    }
  }

  private playTrackAt(index: number): void {
    if (!this.player || !this.playerReady || this.disposed) return;
    this.hasStartedFirstTrack = true;
    this.applyPlayerMix();
    try {
      this.player.playVideoAt(index);
    } catch {
      // Ignore transient playback errors
    }
  }

  private applyPlayerMix(): void {
    if (!this.player || !this.playerReady || this.disposed) return;
    try {
      if (this.muted || !this.musicEnabled) {
        this.player.mute();
      } else {
        this.player.unMute();
      }
      const vol = Math.round(this.masterVolume * 78);
      this.player.setVolume(Math.max(0, Math.min(100, vol)));
    } catch {
      // Ignore transient mix errors
    }
  }

  private syncTrackLimit(): void {
    if (!this.player) return;
    try {
      const playlist = this.player.getPlaylist();
      if (Array.isArray(playlist) && playlist.length > 0) {
        this.trackLimit = Math.min(MAX_PLAYLIST_TRACKS, playlist.length);
      }
    } catch {
      // Keep default limit
    }
  }

  private findNextUnplayedIndex(startFrom: number): number | null {
    for (let idx = Math.max(0, startFrom); idx < this.trackLimit; idx++) {
      if (!this.playedIndices.has(idx)) {
        return idx;
      }
    }
    return null;
  }

  private finishPlaylist(): void {
    this.playlistFinished = true;
    this.lastAppliedPlayIntent = false;
    this.clearAdvanceTimer();
    try {
      this.player?.stopVideo();
    } catch {
      // Ignore stop error
    }
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== null) {
      window.clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.clearAdvanceTimer();
    try {
      this.player?.destroy();
    } catch {
      // Ignore destroy errors
    }
    this.player = null;
    this.playerReady = false;
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
