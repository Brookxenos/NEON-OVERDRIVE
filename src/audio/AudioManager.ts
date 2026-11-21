import { GameStatus } from '../core/GameState';
import { GameSettingsData } from '../settings/GameSettings';
import { CollectibleSoundType, SoundEffects } from './SoundEffects';

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
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.16;

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0.28;
    const delayNode = this.ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.23;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.36;
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2100;

    this.delaySend.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(this.compressor);

    this.musicGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const sampleRate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = white * 0.65 + lastOut * 1.4;
    }

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.sfxGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 2.8;
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
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicEnabled ? 0.56 : 0, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxEnabled ? 0.9 : 0, now, 0.04);
  }

  public update(dt: number, status: GameStatus, speedNorm: number, isBoosting: boolean): void {
    if (!this.ctx || !this.isUnlocked) return;
    const now = this.ctx.currentTime;

    if (
      this.engineGain &&
      this.engineSubOsc &&
      this.engineMainOsc &&
      this.engineWhineOsc &&
      this.engineFilter &&
      this.engineAirGain &&
      this.engineAirFilter
    ) {
      if (status === 'playing') {
        const targetGain = 0.07 + speedNorm * 0.055 + (isBoosting ? 0.05 : 0);
        const rootFreq = 54 + speedNorm * 58 + (isBoosting ? 28 : 0);
        const filterFreq = 260 + speedNorm * 820 + (isBoosting ? 900 : 0);
        const airVol = 0.015 + speedNorm * 0.045 + (isBoosting ? 0.045 : 0);
        const airFreq = 500 + speedNorm * 1400 + (isBoosting ? 900 : 0);

        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.07);
        this.engineSubOsc.frequency.setTargetAtTime(rootFreq, now, 0.07);
        this.engineMainOsc.frequency.setTargetAtTime(rootFreq * 2, now, 0.07);
        this.engineWhineOsc.frequency.setTargetAtTime(rootFreq * 4.02, now, 0.07);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.07);
        this.engineAirGain.gain.setTargetAtTime(airVol, now, 0.08);
        this.engineAirFilter.frequency.setTargetAtTime(airFreq, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.09);
        this.engineAirGain.gain.setTargetAtTime(0, now, 0.09);
      }
    }

    if (!this.settings.musicEnabled || this.settings.muted || status === 'paused') {
      return;
    }

    const bpm = status === 'playing' ? 124 + speedNorm * 24 + (isBoosting ? 12 : 0) : 102;
    const sixteenthDur = 60 / bpm / 4;
    this.stepAccumulator = Math.min(this.stepAccumulator + dt, sixteenthDur * 2);

    if (this.stepAccumulator >= sixteenthDur) {
      this.stepAccumulator -= sixteenthDur;
      this.triggerMusicStep(this.stepIndex, status, speedNorm, isBoosting);
      this.stepIndex = (this.stepIndex + 1) % 64;
    }
  }

  private triggerMusicStep(
    step: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.musicGain) return;
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
        oscA.frequency.setValueAtTime(freq, now);
        oscB.frequency.setValueAtTime(freq * 1.0055, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(
          isBoosting ? 1900 : status === 'playing' ? 1250 : 720,
          now,
        );

        const level = status === 'playing' ? 0.055 : 0.04;
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(level, now + 0.25);
        env.gain.exponentialRampToValueAtTime(0.001, now + 1.85);

        oscA.connect(filter);
        oscB.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);
        if (this.delaySend) env.connect(this.delaySend);

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
    bassOsc.frequency.setValueAtTime(bassFreq, now);
    bassSub.frequency.setValueAtTime(rootFreq, now);

    bassFilter.type = 'lowpass';
    bassFilter.Q.value = isBoosting ? 4.2 : 2.6;
    const cutoffStart = isBoosting
      ? 1450
      : status === 'playing'
        ? 720 + speedNorm * 450
        : 380;
    bassFilter.frequency.setValueAtTime(cutoffStart, now);
    bassFilter.frequency.exponentialRampToValueAtTime(110, now + 0.13);

    const accent = barStep % 4 === 0 ? 0.26 : barStep % 2 === 0 ? 0.19 : 0.14;
    bassEnv.gain.setValueAtTime(0.001, now);
    bassEnv.gain.linearRampToValueAtTime(accent, now + 0.008);
    bassEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    bassOsc.connect(bassFilter);
    bassSub.connect(bassFilter);
    bassFilter.connect(bassEnv);
    bassEnv.connect(this.musicGain);
    bassOsc.start(now);
    bassSub.start(now);
    bassOsc.stop(now + 0.15);
    bassSub.stop(now + 0.15);

    if (status !== 'playing') return;

    if (barStep % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(155, now);
      kickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.095);
      kickEnv.gain.setValueAtTime(0.45, now);
      kickEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      kickOsc.connect(kickEnv);
      kickEnv.connect(this.musicGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.17);
    }

    if (barStep === 4 || barStep === 12) {
      const bodyOsc = this.ctx.createOscillator();
      const bodyEnv = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(195, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(95, now + 0.1);
      bodyEnv.gain.setValueAtTime(0.24, now);
      bodyEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      bodyOsc.connect(bodyEnv);
      bodyEnv.connect(this.musicGain);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.14);

      if (this.noiseBuffer) {
        const snareNoise = this.ctx.createBufferSource();
        snareNoise.buffer = this.noiseBuffer;
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.value = 950;
        const snareEnv = this.ctx.createGain();
        snareEnv.gain.setValueAtTime(0.24, now);
        snareEnv.gain.linearRampToValueAtTime(0.18, now + 0.08);
        snareEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        snareNoise.connect(snareFilter);
        snareFilter.connect(snareEnv);
        snareEnv.connect(this.musicGain);
        if (this.delaySend) snareEnv.connect(this.delaySend);
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
      hatEnv.gain.setValueAtTime(barStep % 4 === 2 ? 0.08 : 0.05, now);
      hatEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      hat.connect(hatFilter);
      hatFilter.connect(hatEnv);
      hatEnv.connect(this.musicGain);
      hat.start(now);
      hat.stop(now + 0.05);
    }

    if (barStep % 2 === 0 || isBoosting) {
      const noteFreq =
        this.leadScale[(step + barIdx) % this.leadScale.length] * (isBoosting ? 1.5 : 1);
      const leadOsc = this.ctx.createOscillator();
      const leadFilter = this.ctx.createBiquadFilter();
      const leadEnv = this.ctx.createGain();

      leadOsc.type = isBoosting ? 'sawtooth' : 'triangle';
      leadOsc.frequency.setValueAtTime(noteFreq, now);

      leadFilter.type = 'lowpass';
      leadFilter.frequency.value = isBoosting ? 3600 : 2100;

      leadEnv.gain.setValueAtTime(0.001, now);
      leadEnv.gain.linearRampToValueAtTime(isBoosting ? 0.1 : 0.075, now + 0.01);
      leadEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      leadOsc.connect(leadFilter);
      leadFilter.connect(leadEnv);
      leadEnv.connect(this.musicGain);
      if (this.delaySend) leadEnv.connect(this.delaySend);
      leadOsc.start(now);
      leadOsc.stop(now + 0.17);
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
