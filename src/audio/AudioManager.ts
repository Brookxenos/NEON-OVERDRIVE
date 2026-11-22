import { GameStatus } from '../core/GameState';
import { GameSettingsData } from '../settings/GameSettings';
import { CollectibleSoundType, SoundEffects } from './SoundEffects';

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 220;
  return Math.max(24, Math.min(18000, freq));
}

function scheduleSynthEnvelope(
  gainParam: AudioParam,
  startTime: number,
  peak: number,
  attackSec: number,
  decayEndTime: number,
  stopTime: number,
): void {
  const safePeak = Math.max(0.001, Math.min(0.42, peak));
  const safeAttack = Math.max(0.004, attackSec);
  const safeFadeEnd = Math.max(startTime + safeAttack + 0.01, decayEndTime);
  const safeZero = Math.max(safeFadeEnd + 0.006, stopTime - 0.003);

  gainParam.setValueAtTime(0, startTime);
  gainParam.linearRampToValueAtTime(safePeak, startTime + safeAttack);
  gainParam.exponentialRampToValueAtTime(0.0006, safeFadeEnd);
  gainParam.linearRampToValueAtTime(0, safeZero);
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
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
  private noiseBuffer: AudioBuffer | null = null;
  private readonly sfx = new SoundEffects();

  private stepIndex = 0;
  private stepAccumulator = 0;
  private readonly chordRoots = [55.0, 43.65, 65.41, 49.0];
  private readonly padChords = [
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
    [261.63, 329.63, 392.0],
    [196.0, 246.94, 293.66],
  ];
  private readonly leadScale = [440, 523.25, 659.25, 587.33, 493.88, 392.0, 523.25, 659.25];

  constructor(initialSettings: GameSettingsData) {
    this.settings = { ...initialSettings };
  }

  public unlock(): void {
    if (this.isUnlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.stepAccumulator = 0;
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.16;

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0.22;
    const delayNode = this.ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.23;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.28;
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
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Strictly bounded [-0.85, 0.85] pink-tinted noise buffer so percussion/wind never clip
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
    this.engineMainOsc.type = 'sawtooth';
    this.engineMainOsc.frequency.value = 116;
    this.engineMainOsc.connect(this.engineFilter);

    this.engineWhineOsc = this.ctx.createOscillator();
    this.engineWhineOsc.type = 'triangle';
    this.engineWhineOsc.frequency.value = 232.5;
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

    this.isUnlocked = true;
    this.applyVolumes();
  }

  public updateSettings(next: GameSettingsData): void {
    this.settings = { ...next };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const rawMaster = Number.isFinite(this.settings.masterVolume)
      ? Math.max(0, Math.min(1, this.settings.masterVolume))
      : 0.75;
    const master = this.settings.muted ? 0 : rawMaster * 0.88;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicEnabled ? 0.56 : 0, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxEnabled ? 0.86 : 0, now, 0.04);
  }

  public update(dt: number, status: GameStatus, speedNorm: number, isBoosting: boolean): void {
    if (!this.ctx || !this.isUnlocked) return;

    // Never schedule oscillators or step accumulators while AudioContext is suspended
    if (this.ctx.state !== 'running') {
      this.stepAccumulator = 0;
      return;
    }

    const now = this.ctx.currentTime;
    const safeSpeedNorm = Number.isFinite(speedNorm) ? Math.max(0, Math.min(1.5, speedNorm)) : 0;

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
        const targetGain = 0.065 + safeSpeedNorm * 0.05 + (isBoosting ? 0.045 : 0);
        const rootFreq = clampFreq(54 + safeSpeedNorm * 58 + (isBoosting ? 28 : 0));
        const filterFreq = clampFreq(260 + safeSpeedNorm * 820 + (isBoosting ? 900 : 0));
        const airVol = 0.014 + safeSpeedNorm * 0.04 + (isBoosting ? 0.04 : 0);
        const airFreq = clampFreq(500 + safeSpeedNorm * 1400 + (isBoosting ? 900 : 0));

        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.07);
        this.engineSubOsc.frequency.setTargetAtTime(rootFreq, now, 0.07);
        this.engineMainOsc.frequency.setTargetAtTime(clampFreq(rootFreq * 2), now, 0.07);
        this.engineWhineOsc.frequency.setTargetAtTime(clampFreq(rootFreq * 4.02), now, 0.07);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.07);
        this.engineAirGain.gain.setTargetAtTime(airVol, now, 0.08);
        this.engineAirFilter.frequency.setTargetAtTime(airFreq, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.07);
        this.engineAirGain.gain.setTargetAtTime(0, now, 0.07);
      }
    }

    if (!this.settings.musicEnabled || this.settings.muted || status === 'paused') {
      this.stepAccumulator = 0;
      return;
    }

    const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0;
    const bpm = status === 'playing' ? 124 + safeSpeedNorm * 24 + (isBoosting ? 12 : 0) : 102;
    const sixteenthDur = 60 / bpm / 4;
    this.stepAccumulator = Math.min(this.stepAccumulator + safeDt, sixteenthDur * 1.5);

    if (this.stepAccumulator >= sixteenthDur) {
      this.stepAccumulator -= sixteenthDur;
      this.triggerMusicStep(this.stepIndex, status, safeSpeedNorm, isBoosting);
      this.stepIndex = (this.stepIndex + 1) % 64;
    }
  }

  private triggerMusicStep(
    step: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const barIdx = Math.floor(step / 16);
    const barStep = step % 16;
    const rootFreq = this.chordRoots[barIdx];

    if (barStep === 0) {
      const chord = this.padChords[barIdx];
      for (const freq of chord) {
        const oscA = this.ctx.createOscillator();
        const oscB = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        oscA.type = 'sawtooth';
        oscB.type = 'sawtooth';
        oscA.frequency.setValueAtTime(clampFreq(freq), now);
        oscB.frequency.setValueAtTime(clampFreq(freq * 1.0055), now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(
          isBoosting ? 1800 : status === 'playing' ? 1200 : 700,
          now,
        );

        const level = status === 'playing' ? 0.048 : 0.036;
        scheduleSynthEnvelope(env.gain, now, level, 0.22, now + 1.82, now + 1.9);

        oscA.connect(filter);
        oscB.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);
        if (this.delaySend) env.connect(this.delaySend);

        oscA.onended = () => {
          try {
            oscA.disconnect();
            oscB.disconnect();
            filter.disconnect();
            env.disconnect();
          } catch {
            // Ignore
          }
        };

        oscA.start(now);
        oscB.start(now);
        oscA.stop(now + 1.9);
        oscB.stop(now + 1.9);
      }
    }

    const bassFreq = barStep % 4 === 2 ? rootFreq * 2 : rootFreq;
    const bassOsc = this.ctx.createOscillator();
    const bassSub = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassEnv = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassSub.type = 'triangle';
    bassOsc.frequency.setValueAtTime(clampFreq(bassFreq), now);
    bassSub.frequency.setValueAtTime(clampFreq(rootFreq), now);

    bassFilter.type = 'lowpass';
    bassFilter.Q.value = isBoosting ? 3.6 : 2.4;
    const cutoffStart = isBoosting
      ? 1400
      : status === 'playing'
        ? 700 + speedNorm * 420
        : 360;
    bassFilter.frequency.setValueAtTime(clampFreq(cutoffStart), now);
    bassFilter.frequency.exponentialRampToValueAtTime(110, now + 0.13);

    const accent = barStep % 4 === 0 ? 0.22 : barStep % 2 === 0 ? 0.16 : 0.12;
    scheduleSynthEnvelope(bassEnv.gain, now, accent, 0.008, now + 0.135, now + 0.155);

    bassOsc.connect(bassFilter);
    bassSub.connect(bassFilter);
    bassFilter.connect(bassEnv);
    bassEnv.connect(this.musicGain);
    bassOsc.onended = () => {
      try {
        bassOsc.disconnect();
        bassSub.disconnect();
        bassFilter.disconnect();
        bassEnv.disconnect();
      } catch {
        // Ignore
      }
    };
    bassOsc.start(now);
    bassSub.start(now);
    bassOsc.stop(now + 0.155);
    bassSub.stop(now + 0.155);

    if (status !== 'playing') return;

    if (barStep % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(155, now);
      kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.095);
      scheduleSynthEnvelope(kickEnv.gain, now, 0.36, 0.005, now + 0.155, now + 0.175);
      kickOsc.connect(kickEnv);
      kickEnv.connect(this.musicGain);
      kickOsc.onended = () => {
        try {
          kickOsc.disconnect();
          kickEnv.disconnect();
        } catch {
          // Ignore
        }
      };
      kickOsc.start(now);
      kickOsc.stop(now + 0.175);
    }

    if (barStep === 4 || barStep === 12) {
      const bodyOsc = this.ctx.createOscillator();
      const bodyEnv = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(195, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(95, now + 0.1);
      scheduleSynthEnvelope(bodyEnv.gain, now, 0.2, 0.005, now + 0.125, now + 0.145);
      bodyOsc.connect(bodyEnv);
      bodyEnv.connect(this.musicGain);
      bodyOsc.onended = () => {
        try {
          bodyOsc.disconnect();
          bodyEnv.disconnect();
        } catch {
          // Ignore
        }
      };
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.145);

      if (this.noiseBuffer) {
        const snareNoise = this.ctx.createBufferSource();
        snareNoise.buffer = this.noiseBuffer;
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.value = 980;
        const snareEnv = this.ctx.createGain();
        scheduleSynthEnvelope(snareEnv.gain, now, 0.18, 0.005, now + 0.18, now + 0.2);
        snareNoise.connect(snareFilter);
        snareFilter.connect(snareEnv);
        snareEnv.connect(this.musicGain);
        if (this.delaySend) snareEnv.connect(this.delaySend);
        snareNoise.onended = () => {
          try {
            snareNoise.disconnect();
            snareFilter.disconnect();
            snareEnv.disconnect();
          } catch {
            // Ignore
          }
        };
        snareNoise.start(now);
        snareNoise.stop(now + 0.2);
      }
    }

    if (barStep % 2 === 1 && this.noiseBuffer) {
      const hat = this.ctx.createBufferSource();
      hat.buffer = this.noiseBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.value = 6200;
      const hatEnv = this.ctx.createGain();
      scheduleSynthEnvelope(
        hatEnv.gain,
        now,
        barStep % 4 === 2 ? 0.07 : 0.045,
        0.004,
        now + 0.042,
        now + 0.055,
      );
      hat.connect(hatFilter);
      hatFilter.connect(hatEnv);
      hatEnv.connect(this.musicGain);
      hat.onended = () => {
        try {
          hat.disconnect();
          hatFilter.disconnect();
          hatEnv.disconnect();
        } catch {
          // Ignore
        }
      };
      hat.start(now);
      hat.stop(now + 0.055);
    }

    if (barStep % 2 === 0 || isBoosting) {
      const noteFreq =
        this.leadScale[(step + barIdx) % this.leadScale.length] * (isBoosting ? 1.5 : 1);
      const leadOsc = this.ctx.createOscillator();
      const leadFilter = this.ctx.createBiquadFilter();
      const leadEnv = this.ctx.createGain();

      leadOsc.type = isBoosting ? 'sawtooth' : 'triangle';
      leadOsc.frequency.setValueAtTime(clampFreq(noteFreq), now);

      leadFilter.type = 'lowpass';
      leadFilter.frequency.value = isBoosting ? 3400 : 2100;

      scheduleSynthEnvelope(
        leadEnv.gain,
        now,
        isBoosting ? 0.088 : 0.068,
        0.008,
        now + 0.155,
        now + 0.175,
      );

      leadOsc.connect(leadFilter);
      leadFilter.connect(leadEnv);
      leadEnv.connect(this.musicGain);
      if (this.delaySend) leadEnv.connect(this.delaySend);
      leadOsc.onended = () => {
        try {
          leadOsc.disconnect();
          leadFilter.disconnect();
          leadEnv.disconnect();
        } catch {
          // Ignore
        }
      };
      leadOsc.start(now);
      leadOsc.stop(now + 0.175);
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
