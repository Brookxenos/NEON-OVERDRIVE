export interface DeezerTrack {
  id: number;
  title: string;
  artistName: string;
  coverMedium: string;
  previewUrl: string;
  expiresAt: number;
}

interface DeezerRawTrack {
  id?: number;
  title?: string;
  preview?: string;
  expiresAt?: number;
  artist?: {
    name?: string;
  };
  album?: {
    cover_medium?: string;
  };
}

interface DeezerJsonResponse {
  data?: DeezerRawTrack[];
}

const SEARCH_QUERIES: readonly string[] = [
  'synthwave outrun',
  'cyberpunk electronic',
  'retrowave synth',
];

const EXPIRY_SAFETY_MS = 120_000;
const RETRY_COOLDOWN_MS = 25_000;

function parsePreviewExpiryMs(previewUrl: string, serverExpiresAt?: number): number {
  if (typeof serverExpiresAt === 'number' && Number.isFinite(serverExpiresAt) && serverExpiresAt > 0) {
    return serverExpiresAt;
  }
  const match = previewUrl.match(/(?:^|[~?&])exp=(\d{9,13})/);
  if (match && match[1]) {
    const raw = Number(match[1]);
    if (Number.isFinite(raw) && raw > 0) {
      return raw < 1e12 ? raw * 1000 : raw;
    }
  }
  return Date.now() + 90 * 60 * 1000;
}

function parseDeezerTracks(json: DeezerJsonResponse): DeezerTrack[] {
  const rows = Array.isArray(json.data) ? json.data : [];
  const extracted: DeezerTrack[] = [];
  const now = Date.now();

  for (const item of rows) {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const artistName = typeof item.artist?.name === 'string' ? item.artist.name.trim() : '';
    const coverMedium =
      typeof item.album?.cover_medium === 'string' ? item.album.cover_medium.trim() : '';
    const previewUrl = typeof item.preview === 'string' ? item.preview.trim() : '';

    if (!title || !artistName || !previewUrl.startsWith('https://')) {
      continue;
    }

    const expiresAt = parsePreviewExpiryMs(previewUrl, item.expiresAt);
    if (expiresAt - EXPIRY_SAFETY_MS <= now) {
      continue;
    }

    extracted.push({
      id: typeof item.id === 'number' ? item.id : extracted.length + 1,
      title,
      artistName,
      coverMedium,
      previewUrl,
      expiresAt,
    });
  }

  return extracted;
}

function fetchDeezerJsonp(query: string, limit: number): Promise<DeezerJsonResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__dzCb_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
    const win = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      delete win[callbackName];
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Deezer JSONP timeout'));
    }, 9000);

    win[callbackName] = (payload: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve((payload ?? {}) as DeezerJsonResponse);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Deezer JSONP failed'));
    };

    script.src = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}&output=jsonp&callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

export class DeezerAudio {
  private ctx: AudioContext | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private outputNode: GainNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private audioEl: HTMLAudioElement | null = null;

  private tracks: DeezerTrack[] = [];
  private currentTrackIndex = 0;
  private queryIndex = 0;
  private activePreviewUrl = '';

  private shouldPlay = false;
  private isFetching = false;
  private isElementPlaying = false;
  private nextFetchRetryAt = 0;
  private nextPlayAttemptAt = 0;
  private consecutiveErrors = 0;
  private pauseTimerId: number | null = null;
  private disposed = false;

  public attach(ctx: AudioContext, destination: AudioNode): void {
    this.ctx = ctx;

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 18000;
    this.filterNode.Q.value = 0.6;

    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.volume = 1;

    this.mediaSource = ctx.createMediaElementSource(audio);
    this.mediaSource.connect(this.filterNode);
    this.filterNode.connect(this.outputNode);
    this.outputNode.connect(destination);

    audio.addEventListener('playing', this.handlePlaying);
    audio.addEventListener('pause', this.handlePause);
    audio.addEventListener('ended', this.handleEnded);
    audio.addEventListener('error', this.handleError);

    this.audioEl = audio;
  }

  public getCurrentTrack(): DeezerTrack | null {
    if (this.tracks.length === 0) return null;
    return this.tracks[this.currentTrackIndex % this.tracks.length] ?? null;
  }

  public isStreamPlaying(): boolean {
    return (
      !this.disposed &&
      this.shouldPlay &&
      this.isElementPlaying &&
      this.audioEl !== null &&
      !this.audioEl.paused &&
      this.ctx?.state === 'running'
    );
  }

  public startOrResume(): void {
    if (this.disposed || !this.ctx || !this.audioEl) return;
    this.shouldPlay = true;
    this.nextPlayAttemptAt = 0;

    if (this.pauseTimerId !== null) {
      window.clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }

    const current = this.getCurrentTrack();
    if (!current || this.isTrackExpired(current)) {
      if (!this.isFetching && Date.now() >= this.nextFetchRetryAt) {
        void this.refreshSearchResults();
      }
      return;
    }

    if (this.audioEl.paused && this.ctx.state === 'running') {
      this.playTrack(current);
    }
  }

  public pause(): void {
    this.shouldPlay = false;
    if (!this.ctx || !this.audioEl) return;

    if (this.outputNode && this.ctx.state === 'running') {
      const now = this.ctx.currentTime;
      this.outputNode.gain.setTargetAtTime(0, now, 0.025);
    }

    if (!this.audioEl.paused && this.pauseTimerId === null) {
      this.pauseTimerId = window.setTimeout(() => {
        this.pauseTimerId = null;
        if (!this.shouldPlay && this.audioEl && !this.audioEl.paused) {
          this.audioEl.pause();
        }
      }, 80);
    }
  }

  public updateMix(speedNorm: number, isBoosting: boolean, isPlayingGame: boolean): void {
    if (!this.ctx || !this.filterNode || !this.outputNode || this.disposed) return;
    if (this.ctx.state !== 'running') return;

    if (this.shouldPlay && this.audioEl && this.audioEl.paused && !this.isFetching) {
      const current = this.getCurrentTrack();
      if (
        current &&
        !this.isTrackExpired(current) &&
        Date.now() >= this.nextFetchRetryAt &&
        Date.now() >= this.nextPlayAttemptAt
      ) {
        this.playTrack(current);
      } else if ((!current || this.isTrackExpired(current)) && Date.now() >= this.nextFetchRetryAt) {
        void this.refreshSearchResults();
      }
    }

    const now = this.ctx.currentTime;
    const targetCutoff = isPlayingGame
      ? isBoosting
        ? 18500
        : 11000 + speedNorm * 7200
      : 5400;
    this.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.14);

    const targetGain = this.isStreamPlaying()
      ? isPlayingGame
        ? isBoosting
          ? 0.82
          : 0.72
        : 0.46
      : 0;
    this.outputNode.gain.setTargetAtTime(targetGain, now, 0.12);
  }

  private isTrackExpired(track: DeezerTrack): boolean {
    return Date.now() >= track.expiresAt - EXPIRY_SAFETY_MS;
  }

  private async refreshSearchResults(): Promise<void> {
    if (this.isFetching || this.disposed) return;
    this.isFetching = true;

    try {
      const query = SEARCH_QUERIES[this.queryIndex % SEARCH_QUERIES.length];
      this.queryIndex = (this.queryIndex + 1) % SEARCH_QUERIES.length;

      const freshTracks = await this.fetchDynamicTracks(query, 12);
      if (this.disposed) return;

      if (freshTracks.length === 0) {
        this.nextFetchRetryAt = Date.now() + RETRY_COOLDOWN_MS;
        return;
      }

      this.tracks = freshTracks;
      this.currentTrackIndex = 0;
      this.consecutiveErrors = 0;

      if (this.shouldPlay && this.ctx?.state === 'running') {
        this.playTrack(this.tracks[0]);
      }
    } finally {
      this.isFetching = false;
    }
  }

  private async fetchDynamicTracks(query: string, limit: number): Promise<DeezerTrack[]> {
    // Primary path: runtime HTTP GET to Express Deezer search route (avoids browser CORS block)
    try {
      const res = await fetch(
        `/api/deezer/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { signal: AbortSignal.timeout(9000) },
      );
      if (res.ok) {
        const json = (await res.json()) as DeezerJsonResponse;
        const parsed = parseDeezerTracks(json);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Fall back to Deezer Simple API JSONP endpoint below
    }

    try {
      const jsonp = await fetchDeezerJsonp(query, limit);
      return parseDeezerTracks(jsonp);
    } catch {
      return [];
    }
  }

  private playTrack(track: DeezerTrack): void {
    if (!this.audioEl || this.disposed || !this.shouldPlay) return;
    this.nextPlayAttemptAt = Date.now() + 1500;

    if (this.isTrackExpired(track)) {
      this.tracks = [];
      if (Date.now() >= this.nextFetchRetryAt) {
        void this.refreshSearchResults();
      }
      return;
    }

    if (this.activePreviewUrl !== track.previewUrl) {
      this.activePreviewUrl = track.previewUrl;
      this.isElementPlaying = false;
      this.audioEl.src = track.previewUrl;
    }

    void this.audioEl.play().catch(() => {
      this.isElementPlaying = false;
    });
  }

  private advanceTrack(): void {
    if (this.disposed || this.tracks.length === 0) return;

    const nextIdx = this.currentTrackIndex + 1;
    if (nextIdx >= this.tracks.length) {
      // Re-fetch fresh Deezer preview links when looping past the end of the playlist
      this.tracks = [];
      this.activePreviewUrl = '';
      if (this.shouldPlay && Date.now() >= this.nextFetchRetryAt) {
        void this.refreshSearchResults();
      }
      return;
    }

    this.currentTrackIndex = nextIdx;
    const nextTrack = this.tracks[nextIdx];
    if (!nextTrack || this.isTrackExpired(nextTrack)) {
      this.tracks = [];
      this.activePreviewUrl = '';
      if (this.shouldPlay && Date.now() >= this.nextFetchRetryAt) {
        void this.refreshSearchResults();
      }
      return;
    }

    if (this.shouldPlay && this.ctx?.state === 'running') {
      this.playTrack(nextTrack);
    }
  }

  private readonly handlePlaying = (): void => {
    this.isElementPlaying = true;
    this.consecutiveErrors = 0;
  };

  private readonly handlePause = (): void => {
    this.isElementPlaying = false;
  };

  private readonly handleEnded = (): void => {
    this.isElementPlaying = false;
    this.activePreviewUrl = '';
    if (this.shouldPlay) {
      this.advanceTrack();
    }
  };

  private readonly handleError = (): void => {
    this.isElementPlaying = false;
    this.activePreviewUrl = '';
    this.consecutiveErrors += 1;

    if (this.consecutiveErrors >= Math.max(3, this.tracks.length)) {
      this.tracks = [];
      this.nextFetchRetryAt = Date.now() + RETRY_COOLDOWN_MS;
      return;
    }

    if (this.shouldPlay) {
      this.advanceTrack();
    }
  };

  public dispose(): void {
    this.disposed = true;
    this.shouldPlay = false;
    this.isElementPlaying = false;

    if (this.pauseTimerId !== null) {
      window.clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }

    if (this.audioEl) {
      this.audioEl.removeEventListener('playing', this.handlePlaying);
      this.audioEl.removeEventListener('pause', this.handlePause);
      this.audioEl.removeEventListener('ended', this.handleEnded);
      this.audioEl.removeEventListener('error', this.handleError);
      try {
        this.audioEl.pause();
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      } catch {
        // Ignore cleanup errors
      }
      this.audioEl = null;
    }

    try {
      this.mediaSource?.disconnect();
      this.filterNode?.disconnect();
      this.outputNode?.disconnect();
    } catch {
      // Ignore
    }

    this.mediaSource = null;
    this.filterNode = null;
    this.outputNode = null;
    this.tracks = [];
  }
}
