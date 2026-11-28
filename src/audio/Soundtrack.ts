import { LocalTrackBank } from './LocalTrackBank';

const YOUTUBE_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';

// Verified first 30 tracks from playlist PLgnM8w6PHYgdqsfLvJGA7dAL_2qaPnNyp in exact order
const PLAYLIST_TRACK_IDS: readonly string[] = [
  'p4lcBHED9hE',
  'd5oa-mtm_1k',
  'JK-Py4BHOcY',
  'Pb5r8V99v_w',
  'HVvhlGHbdQ0',
  'YXcaWHXER6g',
  'IJfn74ga1tY',
  'dVkzh90KYZU',
  'KahgvZj7Bgo',
  'RbqtCfMwfUI',
  '1Eg2B0ygQBk',
  '4kVG0RpkmMI',
  '-oT_IDWN7XE',
  'qqSsGFmnTwA',
  '00rDpaqS8o8',
  'neLvrcko4Mg',
  'IvN-6DtAZPU',
  'EOZP66tn1Ik',
  'KgerPxDwoQg',
  '_1wRWT8YTNY',
  'uz2BT3FgRU8',
  '2h-xpV5yB6I',
  'in_kC8vRmNk',
  'VUaV2G6125k',
  'NrAyqeh28YA',
  'MCv97GMHUz0',
  'BNg3zP5-hUY',
  'BE-9DQb6TMY',
  '9rgmLe9CI3Q',
  'u_tyMa5Wn-A',
];

const MAX_PLAYLIST_TRACKS = PLAYLIST_TRACK_IDS.length;

const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface YTPlayerInstance {
  loadVideoById(videoIdOrOptions: string | { videoId: string; startSeconds?: number }): void;
  cueVideoById(videoIdOrOptions: string | { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      width?: number | string;
      height?: number | string;
      videoId?: string;
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

let apiLoadPromise: Promise<boolean> | null = null;

function ensureYouTubeApiLoaded(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(true);
  }
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        previousCallback();
      }
      finish(Boolean(window.YT && typeof window.YT.Player === 'function'));
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
        finish(false);
      };
      document.head.appendChild(script);
    }

    window.setTimeout(() => {
      if (!settled) {
        if (window.YT && typeof window.YT.Player === 'function') {
          finish(true);
        } else {
          apiLoadPromise = null;
          finish(false);
        }
      }
    }, 6000);
  });

  return apiLoadPromise;
}

export class Soundtrack {
  private container: HTMLDivElement | null = null;
  private player: YTPlayerInstance | null = null;
  private playerReady = false;
  private initializing = false;
  private ytApiFailed = false;
  private usingLocalFallback = false;
  private disposed = false;

  private readonly localBank = new LocalTrackBank();

  private unlocked = false;
  private shouldPlay = false;
  private musicEnabled = true;
  private muted = false;
  private masterVolume = 0.2;

  private currentTrackIndex = 0;
  private loadedTrackIndex: number | null = null;
  private readonly playedIndices = new Set<number>();
  private playlistFinished = false;
  private hasStartedFirstTrack = false;
  private advanceOnNextStart = false;
  private lastAppliedPlayIntent: boolean | null = null;

  private watchdogTimer: number | null = null;
  private waitingForYtSinceMs = 0;
  private loadGraceUntilMs = 0;
  private ignoreEndedUntilMs = 0;
  private awaitingNewTrackPlay = false;
  private lastYtTime = 0;
  private lastYtProgressMs = 0;
  private resumeRetryCount = 0;
  private consecutiveYtErrors = 0;
  private ytFadeInScale = 1;
  private ytFadeTimer: number | null = null;

  public attachAudioEngine(
    ctx: AudioContext,
    musicGain: GainNode,
    noiseBuffer: AudioBuffer | null,
  ): void {
    this.localBank.attach(ctx, musicGain, noiseBuffer, () => this.handleLocalTrackEnded());
    if (this.usingLocalFallback && this.shouldPlay && this.unlocked && !this.playlistFinished) {
      this.startFallbackPlayback();
    }
  }

  public preload(): void {
    if (this.disposed || this.player || this.initializing) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.initializing = true;
    void ensureYouTubeApiLoaded().then((loaded) => {
      this.initializing = false;
      if (this.disposed || this.player) return;
      if (!loaded) {
        this.ytApiFailed = true;
        this.activateLocalFallbackIfNeeded();
        return;
      }
      this.createPlayer();
    });
  }

  public unlock(): void {
    if (this.disposed) return;
    this.unlocked = true;
    this.preload();

    if (this.shouldPlay && this.musicEnabled && !this.muted && !this.playlistFinished) {
      this.ensureWatchdogRunning();
      if (this.usingLocalFallback) {
        this.startFallbackPlayback();
      } else if (this.playerReady && this.player) {
        this.lastAppliedPlayIntent = true;
        this.startOrResumePlayback();
      } else if (this.ytApiFailed) {
        this.activateLocalFallbackIfNeeded();
      }
    }
  }

  public syncMix(masterVolume01: number, musicEnabled: boolean, muted: boolean): void {
    this.masterVolume = Number.isFinite(masterVolume01)
      ? Math.max(0, Math.min(1, masterVolume01))
      : 0.2;
    this.musicEnabled = musicEnabled;
    this.muted = muted;
    this.applyPlayerMix();

    if ((!musicEnabled || muted) && this.localBank.isPlaying()) {
      this.localBank.stop();
    }
  }

  public setPlaybackActive(active: boolean): void {
    if (this.disposed) return;
    const prevShouldPlay = this.shouldPlay;
    this.shouldPlay = active;

    if (!active || this.playlistFinished) {
      this.stopWatchdog();
      this.localBank.stop();
      if (this.lastAppliedPlayIntent !== false) {
        this.lastAppliedPlayIntent = false;
        this.pauseYouTubePlayer();
      }
      return;
    }

    if (!this.unlocked) return;

    if (!prevShouldPlay) {
      this.waitingForYtSinceMs = Date.now();
    }
    this.ensureWatchdogRunning();

    if (this.usingLocalFallback) {
      if (this.lastAppliedPlayIntent !== true || !this.localBank.isPlaying()) {
        this.lastAppliedPlayIntent = true;
        this.startFallbackPlayback();
      }
      return;
    }

    if (!this.playerReady || !this.player) {
      if (this.ytApiFailed) {
        this.activateLocalFallbackIfNeeded();
      }
      return;
    }

    if (this.lastAppliedPlayIntent !== true) {
      this.lastAppliedPlayIntent = true;
      this.startOrResumePlayback();
    }
  }

  public stopNow(): void {
    if (this.disposed) return;
    this.shouldPlay = false;
    this.lastAppliedPlayIntent = false;
    this.waitingForYtSinceMs = 0;
    this.clearYtFade();
    this.stopWatchdog();
    this.localBank.stop();
    this.pauseYouTubePlayer();
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
    this.advanceOnNextStart = false;

    if (this.unlocked && this.shouldPlay && this.musicEnabled && !this.muted) {
      if (this.usingLocalFallback) {
        this.localBank.start(nextIdx, true);
      } else if (this.playerReady && this.player) {
        this.playTrackAt(nextIdx);
      }
    }
  }

  public resetClock(): void {
    if (this.usingLocalFallback && this.shouldPlay && this.unlocked && !this.playlistFinished) {
      if (!this.localBank.isPlaying()) {
        this.localBank.start(this.currentTrackIndex, false);
      }
    }
  }

  public sweepStaleVoices(): void {
    // No-op kept for audio lifecycle compatibility
  }

  private pauseYouTubePlayer(): void {
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

  private createPlayer(): void {
    if (this.disposed || !window.YT || typeof window.YT.Player !== 'function') return;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.right = '4px';
    host.style.bottom = '4px';
    host.style.width = '200px';
    host.style.height = '112px';
    host.style.opacity = '0.008';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    host.style.zIndex = '0';

    const mount = document.createElement('div');
    mount.id = `yt-bgm-${Math.random().toString(36).slice(2, 9)}`;
    host.appendChild(mount);
    document.body.appendChild(host);
    this.container = host;

    this.player = new window.YT.Player(mount, {
      width: 200,
      height: 112,
      videoId: PLAYLIST_TRACK_IDS[this.currentTrackIndex],
      playerVars: {
        autoplay: 0,
        loop: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
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
    this.loadedTrackIndex = this.currentTrackIndex;

    try {
      const iframe = this.player.getIframe();
      if (iframe) {
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        iframe.tabIndex = -1;
      }
    } catch {
      // Ignore iframe attribute issues
    }

    this.applyPlayerMix();

    if (this.unlocked && this.shouldPlay && this.musicEnabled && !this.muted && !this.playlistFinished) {
      if (this.usingLocalFallback) {
        // Leave fallback running only if YouTube explicitly failed; otherwise let YouTube play
        this.usingLocalFallback = false;
        this.localBank.stop();
      }
      this.lastAppliedPlayIntent = true;
      this.ensureWatchdogRunning();
      this.startOrResumePlayback();
    }
  }

  private handleStateChange(state: number): void {
    if (this.disposed || !this.player) return;

    if (state === YT_STATE.PLAYING) {
      this.usingLocalFallback = false;
      this.localBank.stop();
      this.consecutiveYtErrors = 0;
      this.resumeRetryCount = 0;
      this.hasStartedFirstTrack = true;
      if (this.awaitingNewTrackPlay) {
        this.awaitingNewTrackPlay = false;
        this.ignoreEndedUntilMs = Date.now() + 300;
        this.startYtFadeIn();
      }
      this.lastYtProgressMs = Date.now();
      try {
        this.lastYtTime = this.player.getCurrentTime() || 0;
      } catch {
        this.lastYtTime = 0;
      }
      return;
    }

    if (state === YT_STATE.BUFFERING) {
      this.hasStartedFirstTrack = true;
      this.lastYtProgressMs = Date.now();
      return;
    }

    if (state === YT_STATE.ENDED) {
      if (this.awaitingNewTrackPlay && Date.now() < this.ignoreEndedUntilMs) {
        return;
      }
      this.handleTrackEnded();
    }
  }

  private handleTrackEnded(): void {
    if (this.disposed || this.playlistFinished) return;
    this.playedIndices.add(this.currentTrackIndex);
    const nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
    if (nextIdx === null) {
      this.finishPlaylist();
      return;
    }
    this.currentTrackIndex = nextIdx;
    this.hasStartedFirstTrack = true;
    if (this.unlocked && this.shouldPlay && this.musicEnabled && !this.muted) {
      this.playTrackAt(nextIdx, true);
    }
  }

  private handleLocalTrackEnded(): void {
    if (this.disposed || this.playlistFinished || !this.usingLocalFallback) return;
    this.handleTrackEnded();
  }

  private handleTrackError(): void {
    if (this.disposed || this.playlistFinished) return;
    this.consecutiveYtErrors += 1;
    this.playedIndices.add(this.currentTrackIndex);

    const nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
    if (nextIdx === null) {
      if (this.consecutiveYtErrors >= 3) {
        this.playedIndices.clear();
        this.currentTrackIndex = 0;
        this.activateLocalFallbackIfNeeded(true);
      } else {
        this.finishPlaylist();
      }
      return;
    }

    this.currentTrackIndex = nextIdx;

    if (this.consecutiveYtErrors >= 3) {
      this.activateLocalFallbackIfNeeded(true);
      return;
    }

    if (this.unlocked && this.shouldPlay && this.musicEnabled && !this.muted && this.playerReady) {
      this.playTrackAt(nextIdx);
    }
  }

  private activateLocalFallbackIfNeeded(force = false): void {
    if (this.disposed || this.playlistFinished) return;
    if (!force && !this.ytApiFailed && this.playerReady) return;
    this.usingLocalFallback = true;
    this.pauseYouTubePlayer();
    if (this.unlocked && this.shouldPlay && this.musicEnabled && !this.muted) {
      this.startFallbackPlayback();
    }
  }

  private startFallbackPlayback(): void {
    if (this.disposed || this.playlistFinished || !this.localBank.isAttached()) return;
    let resetPos = false;
    if (this.advanceOnNextStart) {
      this.advanceOnNextStart = false;
      this.currentTrackIndex = this.pickNextIndexForNewRun();
      resetPos = true;
    }
    this.hasStartedFirstTrack = true;
    this.localBank.start(this.currentTrackIndex, resetPos);
  }

  private pickNextIndexForNewRun(): number {
    let nextIdx = this.findNextUnplayedIndex(this.currentTrackIndex + 1);
    if (nextIdx === null) {
      const previousIdx = this.currentTrackIndex;
      this.playedIndices.clear();
      nextIdx = MAX_PLAYLIST_TRACKS > 1 && previousIdx === 0 ? 1 : 0;
    }
    return nextIdx;
  }

  private startOrResumePlayback(): void {
    if (!this.player || !this.playerReady || this.playlistFinished) return;
    this.applyPlayerMix();

    try {
      if (this.advanceOnNextStart) {
        this.advanceOnNextStart = false;
        const nextIdx = this.pickNextIndexForNewRun();
        this.currentTrackIndex = nextIdx;
        this.playTrackAt(nextIdx);
        return;
      }

      const state = this.player.getPlayerState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        return;
      }

      if (!this.hasStartedFirstTrack || this.loadedTrackIndex !== this.currentTrackIndex) {
        this.playTrackAt(this.currentTrackIndex);
        return;
      }

      if (state === YT_STATE.PAUSED || state === YT_STATE.CUED) {
        this.loadGraceUntilMs = Date.now() + 1400;
        this.lastYtProgressMs = Date.now();
        this.player.playVideo();
      } else {
        this.playTrackAt(this.currentTrackIndex);
      }
    } catch {
      this.activateLocalFallbackIfNeeded(true);
    }
  }

  private playTrackAt(index: number, smoothTransition = false): void {
    if (this.disposed) return;
    this.hasStartedFirstTrack = true;
    this.currentTrackIndex = index;

    if (this.usingLocalFallback) {
      this.localBank.start(index, true);
      return;
    }

    if (!this.player || !this.playerReady) return;
    const videoId = PLAYLIST_TRACK_IDS[index];
    if (!videoId) return;

    this.loadedTrackIndex = index;
    this.resumeRetryCount = 0;
    this.lastYtTime = 0;
    this.awaitingNewTrackPlay = true;
    const now = Date.now();
    this.lastYtProgressMs = now;
    this.loadGraceUntilMs = now + 2600;
    this.ignoreEndedUntilMs = now + 2000;

    if (smoothTransition) {
      this.clearYtFade();
      this.ytFadeInScale = 0.22;
    } else {
      this.clearYtFade();
      this.ytFadeInScale = 1;
    }
    this.applyPlayerMix();

    try {
      this.player.loadVideoById({ videoId, startSeconds: 0 });
    } catch {
      this.handleTrackError();
    }
  }

  private ensureWatchdogRunning(): void {
    if (this.watchdogTimer !== null || this.disposed) return;
    this.watchdogTimer = window.setInterval(() => this.runWatchdog(), 750);
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer !== null) {
      window.clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private runWatchdog(): void {
    if (
      this.disposed ||
      !this.shouldPlay ||
      !this.unlocked ||
      !this.musicEnabled ||
      this.muted ||
      this.playlistFinished
    ) {
      return;
    }

    const now = Date.now();

    // If YouTube hasn't become ready within 3.2s of starting race, kick in local 30-track bank ASAP
    if (!this.playerReady && !this.usingLocalFallback) {
      if (this.ytApiFailed || (this.waitingForYtSinceMs > 0 && now - this.waitingForYtSinceMs > 3200)) {
        this.activateLocalFallbackIfNeeded(true);
      }
      return;
    }

    if (this.usingLocalFallback) {
      if (!this.localBank.isPlaying()) {
        this.startFallbackPlayback();
      }
      return;
    }

    if (!this.player || !this.playerReady) return;

    if (this.advanceOnNextStart) {
      this.startOrResumePlayback();
      return;
    }

    try {
      const state = this.player.getPlayerState();
      const currentTime = this.player.getCurrentTime() || 0;

      if (state === YT_STATE.PLAYING) {
        if (currentTime > this.lastYtTime + 0.05) {
          this.lastYtTime = currentTime;
          this.lastYtProgressMs = now;
          this.consecutiveYtErrors = 0;
          this.resumeRetryCount = 0;
          if (this.awaitingNewTrackPlay) {
            this.awaitingNewTrackPlay = false;
            this.ignoreEndedUntilMs = now + 250;
            this.startYtFadeIn();
          }
        } else if (this.lastYtProgressMs > 0 && now - this.lastYtProgressMs > 5500) {
          this.handleTrackError();
        }
        return;
      }

      if (state === YT_STATE.BUFFERING) {
        if (this.lastYtProgressMs > 0 && now - this.lastYtProgressMs > 6500) {
          this.handleTrackError();
        }
        return;
      }

      if (state === YT_STATE.ENDED) {
        if (!this.awaitingNewTrackPlay && now >= this.loadGraceUntilMs && now >= this.ignoreEndedUntilMs) {
          this.handleTrackEnded();
        }
        return;
      }

      // Unexpected PAUSED / CUED / UNSTARTED mid-game -> aggressively recover!
      if (now >= this.loadGraceUntilMs) {
        this.resumeRetryCount += 1;
        if (this.resumeRetryCount <= 2 && (state === YT_STATE.PAUSED || state === YT_STATE.CUED)) {
          this.loadGraceUntilMs = now + 1300;
          this.player.playVideo();
        } else if (this.resumeRetryCount <= 4) {
          this.loadGraceUntilMs = now + 2000;
          this.awaitingNewTrackPlay = true;
          this.ignoreEndedUntilMs = now + 1800;
          this.player.loadVideoById({
            videoId: PLAYLIST_TRACK_IDS[this.currentTrackIndex],
            startSeconds: Math.max(0, Math.floor(this.lastYtTime)),
          });
        } else {
          this.handleTrackError();
        }
      }
    } catch {
      this.handleTrackError();
    }
  }

  private startYtFadeIn(): void {
    if (this.disposed || this.ytFadeInScale >= 0.99 || this.ytFadeTimer !== null) return;
    if (typeof window === 'undefined') {
      this.ytFadeInScale = 1;
      this.applyPlayerMix();
      return;
    }
    const startMs = Date.now();
    const durationMs = 450;
    const baseScale = this.ytFadeInScale;
    this.ytFadeTimer = window.setInterval(() => {
      if (this.disposed) {
        this.clearYtFade();
        return;
      }
      const t = Math.min(1, (Date.now() - startMs) / durationMs);
      this.ytFadeInScale = baseScale + (1 - baseScale) * t;
      this.applyPlayerMix();
      if (t >= 1) {
        this.clearYtFade();
      }
    }, 45);
  }

  private clearYtFade(): void {
    if (this.ytFadeTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ytFadeTimer);
    }
    this.ytFadeTimer = null;
    this.ytFadeInScale = 1;
  }

  private applyPlayerMix(): void {
    if (!this.player || !this.playerReady || this.disposed) return;
    try {
      if (this.muted || !this.musicEnabled) {
        this.player.mute();
      } else {
        this.player.unMute();
      }
      const vol = Math.round(this.masterVolume * 78 * this.ytFadeInScale);
      this.player.setVolume(Math.max(0, Math.min(100, vol)));
    } catch {
      // Ignore transient mix errors
    }
  }

  private findNextUnplayedIndex(startFrom: number): number | null {
    const clampedStart = ((startFrom % MAX_PLAYLIST_TRACKS) + MAX_PLAYLIST_TRACKS) % MAX_PLAYLIST_TRACKS;
    for (let offset = 0; offset < MAX_PLAYLIST_TRACKS; offset++) {
      const idx = (clampedStart + offset) % MAX_PLAYLIST_TRACKS;
      if (!this.playedIndices.has(idx)) {
        return idx;
      }
    }
    return null;
  }

  private finishPlaylist(): void {
    this.playlistFinished = true;
    this.lastAppliedPlayIntent = false;
    this.clearYtFade();
    this.stopWatchdog();
    this.localBank.stop();
    try {
      this.player?.stopVideo();
    } catch {
      // Ignore stop error
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.clearYtFade();
    this.stopWatchdog();
    this.localBank.dispose();
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
