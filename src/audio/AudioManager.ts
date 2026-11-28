import { GameStatus } from '../core/GameState';
import { GameSettingsData } from '../settings/GameSettings';
import { Soundtrack } from './Soundtrack';
import { CollectibleSoundType, SoundEffects } from './SoundEffects';

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 220;
  return Math.max(24, Math.min(18000, freq));
}

function safeFinite(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function createSoftClipCurve(): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * 1.15) * 0.96;
  }
  return curve;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private softClipper: WaveShaperNode | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private delaySend: GainNode | null = null;

  private engineGain: GainNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineMainOsc: OscillatorNode | null = null;
  private engineWhineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineAirGain: GainNode | null = null;
  private engineAirFilter: BiquadFilterNode | null = null;
  private engineAirSource: AudioBufferSourceNode | null = null;

  private settings: GameSettingsData;
  private isUnlocked = false;
  private disposed = false;
  private lastResumeAttemptMs = 0;
  private lastAudioClockTime = -1;
  private stalledClockFrames = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly sfx = new SoundEffects();
  private readonly soundtrack = new Soundtrack();

  constructor(initialSettings: GameSettingsData) {
    this.settings = { ...initialSettings };
    this.soundtrack.preload();
    this.soundtrack.syncMix(
      safeFinite(this.settings.masterVolume, 0.2, 0, 1),
      this.settings.musicEnabled,
      this.settings.muted,
    );
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.disposed || !this.isUnlocked || !this.ctx) return;
    if (!document.hidden && this.ctx.state !== 'running') {
      this.tryResumeContext();
    }
  };

  private readonly handleContextStateChange = (): void => {
    if (this.disposed || !this.ctx) return;
    if (this.ctx.state === 'running') {
      this.stalledClockFrames = 0;
      this.soundtrack.resetClock();
    }
  };

  private tryResumeContext(): void {
    if (this.disposed || !this.ctx || this.ctx.state === 'running') return;
    const nowMs = Date.now();
    if (nowMs - this.lastResumeAttemptMs < 1200) return;
    this.lastResumeAttemptMs = nowMs;
    void this.ctx.resume().catch(() => undefined);
  }

  public unlock(): void {
    if (this.disposed) return;

    this.soundtrack.unlock();

    if (this.isUnlocked && this.ctx) {
      if (this.ctx.state !== 'running') {
        this.tryResumeContext();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.ctx.addEventListener('statechange', this.handleContextStateChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.16;

    this.softClipper = this.ctx.createWaveShaper();
    this.softClipper.curve = createSoftClipCurve();
    this.softClipper.oversample = '2x';

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0.2;
    const delayNode = this.ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.23;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.26;
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;

    this.delaySend.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(this.compressor);

    this.musicGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.softClipper);
    this.softClipper.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const sampleRate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      const sample = (white * 0.55 + lastOut * 0.95) * 0.85;
      data[i] = Number.isFinite(sample) ? Math.max(-0.85, Math.min(0.85, sample)) : 0;
    }

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.sfxGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 2.6;
    this.engineFilter.connect(this.engineGain);

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'sine';
    this.engineSubOsc.frequency.value = 58;
    this.engineSubOsc.connect(this.engineGain);

    this.engineMainOsc = this.ctx.createOscillator();
    this.engineMainOsc.type = 'triangle';
    this.engineMainOsc.frequency.value = 110;
    this.engineMainOsc.connect(this.engineFilter);

    this.engineWhineOsc = this.ctx.createOscillator();
    this.engineWhineOsc.type = 'sine';
    this.engineWhineOsc.frequency.value = 220;
    this.engineWhineOsc.connect(this.engineFilter);

    this.engineAirFilter = this.ctx.createBiquadFilter();
    this.engineAirFilter.type = 'bandpass';
    this.engineAirFilter.frequency.value = 600;
    this.engineAirFilter.Q.value = 0.9;
    this.engineAirGain = this.ctx.createGain();
    this.engineAirGain.gain.value = 0;
    this.engineAirSource = this.ctx.createBufferSource();
    this.engineAirSource.buffer = this.noiseBuffer;
    this.engineAirSource.loop = true;
    this.engineAirSource.connect(this.engineAirFilter);
    this.engineAirFilter.connect(this.engineAirGain);
    this.engineAirGain.connect(this.sfxGain);

    this.engineSubOsc.start();
    this.engineMainOsc.start();
    this.engineWhineOsc.start();
    this.engineAirSource.start();

    this.sfx.attach(this.ctx, this.sfxGain, this.delaySend, this.noiseBuffer);
    this.soundtrack.attachAudioEngine(this.ctx, this.musicGain, this.noiseBuffer);

    this.isUnlocked = true;
    this.applyVolumes();
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  public startRaceMusic(): void {
    if (this.disposed) return;
    this.unlock();
    const active = this.settings.musicEnabled && !this.settings.muted && !document.hidden;
    this.soundtrack.setPlaybackActive(active);
  }

  public stopMusic(): void {
    if (this.disposed) return;
    this.soundtrack.stopNow();
  }

  public stopMusicForGameOver(): void {
    if (this.disposed) return;
    this.soundtrack.stopForGameOver();
  }

  public nextMusicTrack(): void {
    this.soundtrack.selectNextTrack();
  }

  public updateSettings(next: GameSettingsData): void {
    this.settings = { ...next };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const rawMaster = safeFinite(this.settings.masterVolume, 0.2, 0, 1);
    this.soundtrack.syncMix(rawMaster, this.settings.musicEnabled, this.settings.muted);

    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (!Number.isFinite(now)) return;
    const master = this.settings.muted ? 0 : rawMaster * 0.88;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicEnabled ? 0.62 : 0, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxEnabled ? 0.68 : 0, now, 0.04);
  }

  public update(dt: number, status: GameStatus, speedNorm: number, isBoosting: boolean): void {
    if (this.disposed) return;

    const shouldPlayMusic =
      status === 'playing' &&
      this.settings.musicEnabled &&
      !this.settings.muted &&
      !document.hidden;
    this.soundtrack.setPlaybackActive(shouldPlayMusic);

    if (!this.ctx || !this.isUnlocked) return;

    if (this.ctx.state !== 'running') {
      if (status === 'playing' && !document.hidden) {
        this.tryResumeContext();
      }
      return;
    }

    const now = this.ctx.currentTime;
    if (!Number.isFinite(now)) return;

    this.sfx.sweepStaleVoices(now);

    if (dt > 0 && this.lastAudioClockTime >= 0 && Math.abs(now - this.lastAudioClockTime) < 1e-6) {
      this.stalledClockFrames += 1;
      if (this.stalledClockFrames >= 90 && !document.hidden) {
        this.stalledClockFrames = 0;
        this.sfx.sweepStaleVoices(now + 10);
        const nowMs = Date.now();
        if (nowMs - this.lastResumeAttemptMs >= 4000) {
          this.lastResumeAttemptMs = nowMs;
          const ctx = this.ctx;
          void ctx.suspend().then(() => ctx.resume()).catch(() => undefined);
        }
      }
    } else {
      this.stalledClockFrames = 0;
    }
    this.lastAudioClockTime = now;

    const safeSpeedNorm = safeFinite(speedNorm, 0, 0, 1.5);

    if (
      this.engineGain &&
      this.engineSubOsc &&
      this.engineMainOsc &&
      this.engineWhineOsc &&
      this.engineFilter &&
      this.engineAirGain &&
      this.engineAirFilter
    ) {
      if (status === 'playing' && this.settings.sfxEnabled && !this.settings.muted) {
        const targetGain = safeFinite(
          0.032 + safeSpeedNorm * 0.028 + (isBoosting ? 0.022 : 0),
          0.032,
          0,
          0.11,
        );
        const rootFreq = clampFreq(55 + safeSpeedNorm * 52 + (isBoosting ? 24 : 0));
        const filterFreq = clampFreq(210 + safeSpeedNorm * 520 + (isBoosting ? 420 : 0));
        const airVol = safeFinite(
          0.008 + safeSpeedNorm * 0.022 + (isBoosting ? 0.02 : 0),
          0.008,
          0,
          0.07,
        );
        const airFreq = clampFreq(480 + safeSpeedNorm * 1100 + (isBoosting ? 650 : 0));

        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.07);
        this.engineSubOsc.frequency.setTargetAtTime(rootFreq, now, 0.07);
        this.engineMainOsc.frequency.setTargetAtTime(clampFreq(rootFreq * 2), now, 0.07);
        this.engineWhineOsc.frequency.setTargetAtTime(clampFreq(rootFreq * 4.0), now, 0.07);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.07);
        this.engineAirGain.gain.setTargetAtTime(airVol, now, 0.08);
        this.engineAirFilter.frequency.setTargetAtTime(airFreq, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.07);
        this.engineAirGain.gain.setTargetAtTime(0, now, 0.07);
      }
    }

    if (!this.settings.musicEnabled || this.settings.muted || status === 'paused') {
      return;
    }
  }

  private canPlaySfx(): boolean {
    return this.settings.sfxEnabled && !this.settings.muted;
  }

  public playLaneShift(direction: -1 | 1): void {
    if (this.canPlaySfx()) this.sfx.playLaneShift(direction);
  }

  public playBoostActivate(): void {
    if (this.canPlaySfx()) this.sfx.playBoostActivate();
  }

  public playCollectible(kind: CollectibleSoundType, multiplier: number): void {
    if (this.canPlaySfx()) this.sfx.playCollectible(kind, multiplier);
  }

  public playNearMiss(): void {
    if (this.canPlaySfx()) this.sfx.playNearMiss();
  }

  public playCrash(): void {
    if (this.canPlaySfx()) this.sfx.playCrash();
  }

  public playUiClick(confirm = false): void {
    if (this.canPlaySfx()) this.sfx.playUiClick(confirm);
  }

  public playMilestoneFanfare(): void {
    if (this.canPlaySfx()) this.sfx.playMilestoneFanfare();
  }

  public dispose(): void {
    this.disposed = true;
    this.sfx.dispose();
    this.soundtrack.dispose();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.ctx) {
      this.ctx.removeEventListener('statechange', this.handleContextStateChange);
    }
    try {
      this.engineSubOsc?.stop();
      this.engineMainOsc?.stop();
      this.engineWhineOsc?.stop();
      this.engineAirSource?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore audio context close errors
    }
    this.ctx = null;
    this.isUnlocked = false;
  }
}
