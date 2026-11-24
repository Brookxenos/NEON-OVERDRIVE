import { GameStatus } from '../core/GameState';

interface HarmonicBar {
  root: number;
  brassStab: readonly number[];
  hook: readonly number[];
}

interface BeastRapTrack {
  id: string;
  bpm: number;
  swing: number;
  halfTime?: boolean;
  kickSteps: readonly number[];
  clapSteps: readonly number[];
  hatSteps: readonly number[];
  hatRollSteps: readonly number[];
  bass808Pattern: readonly number[];
  brassStabSteps: readonly number[];
  hookSteps: readonly number[];
  useGlideLead?: boolean;
  bars: readonly HarmonicBar[];
}

// 4 heavy Rap & Beast Beat tracks — pounding 808 sub slides, hard kicks & trap claps,
// brass stabs, and bold rap hooks harmonized in A Minor / C Major to lock cleanly
// with the car engine turbine and game SFX without any sleepy calm tracks.
const RAP_BEAST_TRACKS: readonly BeastRapTrack[] = [
  // 1. Beast Mode 808 (132 BPM half-time Trap/Rap Beat · Am -> F -> Dm -> E)
  {
    id: 'beast_mode_808',
    bpm: 132,
    swing: 0.02,
    halfTime: true,
    kickSteps: [0, 3, 6, 10, 14],
    clapSteps: [8],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    hatRollSteps: [7, 13, 15],
    bass808Pattern: [1, 0, 0, 1, 0, 0, 1.5, 0, 0, 0, 1, 0, 0, 0, 1.25, 0],
    brassStabSteps: [0, 10],
    hookSteps: [0, 3, 6, 8, 10, 14],
    bars: [
      { root: 55.0, brassStab: [110.0, 220.0, 261.63, 329.63], hook: [523.25, 659.25, 587.33, 523.25, 440.0, 659.25] },
      { root: 43.65, brassStab: [87.31, 174.61, 220.0, 261.63], hook: [523.25, 587.33, 659.25, 523.25, 440.0, 523.25] },
      { root: 73.42, brassStab: [146.83, 220.0, 293.66, 349.23], hook: [587.33, 659.25, 698.46, 587.33, 523.25, 440.0] },
      { root: 41.2, brassStab: [82.41, 164.81, 246.94, 329.63], hook: [659.25, 587.33, 523.25, 493.88, 523.25, 659.25] },
    ],
  },
  // 2. Kingpin Boom Bap (98 BPM Heavy Hip-Hop Beast Anthem · Am -> G -> F -> E)
  {
    id: 'kingpin_boom_bap',
    bpm: 98,
    swing: 0.1,
    kickSteps: [0, 2, 7, 10, 11],
    clapSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    hatRollSteps: [15],
    bass808Pattern: [1, 0, 1.5, 0, 0, 0, 0, 1, 0, 0, 1.25, 1.5, 0, 0, 1, 0],
    brassStabSteps: [0, 6, 12],
    hookSteps: [0, 4, 7, 10, 12, 14],
    bars: [
      { root: 55.0, brassStab: [110.0, 220.0, 261.63, 329.63], hook: [440.0, 523.25, 659.25, 587.33, 523.25, 440.0] },
      { root: 49.0, brassStab: [98.0, 196.0, 246.94, 293.66], hook: [493.88, 587.33, 783.99, 659.25, 587.33, 493.88] },
      { root: 43.65, brassStab: [87.31, 174.61, 220.0, 261.63], hook: [523.25, 659.25, 698.46, 659.25, 523.25, 440.0] },
      { root: 41.2, brassStab: [82.41, 164.81, 246.94, 329.63], hook: [659.25, 587.33, 493.88, 523.25, 587.33, 659.25] },
    ],
  },
  // 3. West Side Beast (104 BPM Heavy G-Funk / Hip-Hop Beast · Dm -> Am -> F -> E)
  {
    id: 'west_side_beast',
    bpm: 104,
    swing: 0.09,
    kickSteps: [0, 6, 8, 11, 14],
    clapSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    hatRollSteps: [14, 15],
    bass808Pattern: [1, 0, 0, 0, 0, 0, 1.5, 0, 1, 0, 0, 1.25, 0, 0, 1.5, 0],
    brassStabSteps: [0, 8],
    hookSteps: [0, 3, 6, 10, 12, 14],
    useGlideLead: true,
    bars: [
      { root: 73.42, brassStab: [146.83, 220.0, 261.63, 349.23], hook: [880.0, 783.99, 659.25, 880.0, 783.99, 659.25] },
      { root: 55.0, brassStab: [110.0, 220.0, 261.63, 329.63], hook: [783.99, 659.25, 587.33, 659.25, 783.99, 659.25] },
      { root: 43.65, brassStab: [87.31, 174.61, 220.0, 261.63], hook: [659.25, 783.99, 880.0, 783.99, 659.25, 523.25] },
      { root: 41.2, brassStab: [82.41, 164.81, 246.94, 329.63], hook: [783.99, 659.25, 587.33, 493.88, 587.33, 659.25] },
    ],
  },
  // 4. Overdrive Anthem Rap (122 BPM Fast Racing Beast Rap · Am -> C -> Dm -> F)
  {
    id: 'overdrive_anthem_rap',
    bpm: 122,
    swing: 0.04,
    kickSteps: [0, 3, 4, 8, 10, 14],
    clapSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    hatRollSteps: [7, 11, 15],
    bass808Pattern: [1, 0, 2, 1, 0, 0, 1.5, 0, 1, 0, 2, 0, 1, 0, 1.5, 0],
    brassStabSteps: [0, 6, 12],
    hookSteps: [0, 2, 6, 8, 12, 14],
    bars: [
      { root: 55.0, brassStab: [110.0, 220.0, 261.63, 329.63], hook: [523.25, 659.25, 880.0, 783.99, 659.25, 523.25] },
      { root: 65.41, brassStab: [130.81, 196.0, 261.63, 329.63], hook: [587.33, 659.25, 783.99, 659.25, 587.33, 523.25] },
      { root: 73.42, brassStab: [146.83, 220.0, 293.66, 349.23], hook: [659.25, 783.99, 880.0, 698.46, 659.25, 587.33] },
      { root: 43.65, brassStab: [87.31, 174.61, 220.0, 261.63], hook: [659.25, 587.33, 523.25, 440.0, 523.25, 659.25] },
    ],
  },
];

const SCHEDULE_AHEAD_SEC = 0.09;
const MAX_ACTIVE_MUSIC_VOICES = 28;

interface TrackedMusicVoice {
  stopTime: number;
  release: () => void;
}

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 220;
  return Math.max(28, Math.min(12000, freq));
}

function schedulePunchEnvelope(
  gainParam: AudioParam,
  startTime: number,
  peak: number,
  attackSec: number,
  decayEndTime: number,
  stopTime: number,
): void {
  const safeStart = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
  const safePeak = Math.max(0.001, Math.min(0.42, peak));
  const safeAttack = Math.max(0.003, attackSec);
  const safeFadeEnd = Math.max(safeStart + safeAttack + 0.012, decayEndTime);
  const safeZero = Math.max(safeFadeEnd + 0.006, stopTime - 0.003);

  gainParam.setValueAtTime(0, safeStart);
  gainParam.linearRampToValueAtTime(safePeak, safeStart + safeAttack);
  gainParam.exponentialRampToValueAtTime(0.0006, safeFadeEnd);
  gainParam.linearRampToValueAtTime(0, safeZero);
}

export class ClassicSoundtrack {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private delaySend: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private trackIndex = 0;
  private cycleStep = 0;
  private nextStepTime = 0;
  private smoothedBpm = RAP_BEAST_TRACKS[0].bpm;
  private readonly trackedVoices: TrackedMusicVoice[] = [];
  private lastGlideFreq = 659.25;
  private lastBassFreq = 55;

  public attach(
    ctx: AudioContext,
    outputNode: AudioNode,
    delaySend: AudioNode,
    noiseBuffer: AudioBuffer,
  ): void {
    this.releaseAllVoices();
    this.ctx = ctx;
    this.outputNode = outputNode;
    this.delaySend = delaySend;
    this.noiseBuffer = noiseBuffer;
    this.nextStepTime = ctx.currentTime + 0.02;
  }

  public getActiveVoiceCount(): number {
    return this.trackedVoices.length;
  }

  public sweepStaleVoices(now?: number): void {
    const refTime =
      now !== undefined && Number.isFinite(now)
        ? now
        : this.ctx && Number.isFinite(this.ctx.currentTime)
          ? this.ctx.currentTime
          : -1;
    if (refTime < 0) return;

    for (let i = this.trackedVoices.length - 1; i >= 0; i--) {
      const entry = this.trackedVoices[i];
      if (refTime > entry.stopTime + 0.14) {
        entry.release();
      }
    }
  }

  private releaseAllVoices(): void {
    for (let i = this.trackedVoices.length - 1; i >= 0; i--) {
      this.trackedVoices[i].release();
    }
    this.trackedVoices.length = 0;
  }

  public selectNextTrack(): void {
    this.sweepStaleVoices();
    this.trackIndex = (this.trackIndex + 1) % RAP_BEAST_TRACKS.length;
    const track = RAP_BEAST_TRACKS[this.trackIndex];
    this.cycleStep = 0;
    this.smoothedBpm = track.bpm;
    this.lastGlideFreq = track.bars[0].hook[0];
    this.lastBassFreq = track.bars[0].root;
    if (this.ctx && Number.isFinite(this.ctx.currentTime)) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }
  }

  public getCurrentTrackId(): string {
    return RAP_BEAST_TRACKS[this.trackIndex].id;
  }

  public resetClock(): void {
    if (!this.ctx || !Number.isFinite(this.ctx.currentTime)) return;
    this.sweepStaleVoices(this.ctx.currentTime);
    this.nextStepTime = Math.max(this.ctx.currentTime + 0.02, this.nextStepTime);
    if (this.nextStepTime - this.ctx.currentTime > 0.25) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }
  }

  public update(dt: number, status: GameStatus, speedNorm: number, isBoosting: boolean): void {
    if (!this.ctx || !this.outputNode || this.ctx.state !== 'running') return;
    if (!Number.isFinite(this.ctx.currentTime)) return;

    const now = this.ctx.currentTime;
    this.sweepStaleVoices(now);

    const track = RAP_BEAST_TRACKS[this.trackIndex];
    const safeSpeed = Number.isFinite(speedNorm) ? Math.max(0, Math.min(1.5, speedNorm)) : 0;
    const targetBpm =
      status === 'playing'
        ? track.bpm + safeSpeed * 6 + (isBoosting ? 4 : 0)
        : track.bpm - 3;

    const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0.016;
    const blend = 1 - Math.exp(-2.8 * safeDt);
    this.smoothedBpm += (targetBpm - this.smoothedBpm) * blend;
    if (!Number.isFinite(this.smoothedBpm)) {
      this.smoothedBpm = track.bpm;
    } else {
      this.smoothedBpm = Math.max(60, Math.min(190, this.smoothedBpm));
    }

    if (!Number.isFinite(this.nextStepTime) || this.nextStepTime < now - 0.12 || this.nextStepTime > now + 0.5) {
      this.nextStepTime = now + 0.02;
    }

    const totalSteps = track.bars.length * 16;
    let scheduledInFrame = 0;
    while (this.nextStepTime < now + SCHEDULE_AHEAD_SEC && scheduledInFrame < 4) {
      const scheduledTime = Math.max(now, this.nextStepTime);
      this.triggerStep(scheduledTime, track, this.cycleStep, status, safeSpeed, isBoosting);

      const baseSixteenth = 60 / this.smoothedBpm / 4;
      const isOffbeat = this.cycleStep % 2 === 1;
      const swingMul = isOffbeat ? 1 - track.swing : 1 + track.swing;
      this.nextStepTime += baseSixteenth * swingMul;

      this.cycleStep = (this.cycleStep + 1) % totalSteps;
      scheduledInFrame += 1;
    }
  }

  private trackVoice(
    node: AudioScheduledSourceNode,
    stopTime: number,
    cleanup: () => void,
  ): void {
    let freed = false;
    const entry: TrackedMusicVoice = {
      stopTime,
      release: () => {
        if (freed) return;
        freed = true;
        const idx = this.trackedVoices.indexOf(entry);
        if (idx !== -1) {
          const lastIdx = this.trackedVoices.length - 1;
          if (idx !== lastIdx) {
            this.trackedVoices[idx] = this.trackedVoices[lastIdx];
          }
          this.trackedVoices.pop();
        }
        try {
          cleanup();
        } catch {
          // Ignore cleanup errors
        }
      },
    };
    this.trackedVoices.push(entry);
    node.onended = entry.release;
  }

  private triggerStep(
    time: number,
    track: BeastRapTrack,
    step: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.trackedVoices.length >= MAX_ACTIVE_MUSIC_VOICES) return;

    const barIdx = Math.floor(step / 16) % track.bars.length;
    const barStep = step % 16;
    const bar = track.bars[barIdx];

    if (
      track.brassStabSteps.includes(barStep) &&
      this.trackedVoices.length <= MAX_ACTIVE_MUSIC_VOICES - 4
    ) {
      this.playBeastBrassStab(time, bar.brassStab, barStep === 0, status, isBoosting);
    }

    this.play808BeastBass(time, track, barStep, bar.root, status, speedNorm, isBoosting);
    this.playBeastDrums(time, track, barStep, status, isBoosting);
    this.playRapHookLead(time, track, bar, barStep, status, isBoosting);
  }

  private playBeastBrassStab(
    time: number,
    chord: readonly number[],
    isDownbeat: boolean,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode) return;
    const dur = isDownbeat ? 0.56 : 0.34;
    const level = (status === 'playing' ? 0.056 : 0.038) * (isDownbeat ? 1 : 0.78);
    const stopAt = time + dur;

    for (let i = 0; i < chord.length; i++) {
      if (this.trackedVoices.length >= MAX_ACTIVE_MUSIC_VOICES) break;
      const freq = clampFreq(chord[i]);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      // Punchy sawtooth + square brass hit
      osc.type = i === 0 ? 'sawtooth' : i % 2 === 1 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(i % 2 === 0 ? -7 : 7, time);

      filter.type = 'lowpass';
      filter.Q.value = 1.9;
      const peakCutoff = isBoosting ? 2450 : status === 'playing' ? 1950 : 1280;
      filter.frequency.setValueAtTime(peakCutoff, time);
      filter.frequency.exponentialRampToValueAtTime(340, stopAt);

      schedulePunchEnvelope(env.gain, time, level, 0.008, stopAt - 0.06, stopAt);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      if (this.delaySend && i === 1) env.connect(this.delaySend);

      this.trackVoice(osc, stopAt, () => {
        osc.disconnect();
        filter.disconnect();
        env.disconnect();
      });

      osc.start(time);
      osc.stop(stopAt);
    }
  }

  private play808BeastBass(
    time: number,
    track: BeastRapTrack,
    barStep: number,
    rootFreq: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.trackedVoices.length >= MAX_ACTIVE_MUSIC_VOICES - 1) return;

    const ratio = track.bass808Pattern[barStep] ?? 0;
    if (ratio === 0) return;

    const targetFreq = clampFreq(rootFreq * ratio);
    const isDownbeat = barStep === 0 || barStep === 8;
    const dur = track.halfTime ? 0.42 : 0.28;
    const stopAt = time + dur;

    // Layer 1: Deep booming 808 sub slide
    const subOsc = this.ctx.createOscillator();
    const subEnv = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(clampFreq(Math.max(targetFreq * 1.45, this.lastBassFreq)), time);
    subOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.036);
    this.lastBassFreq = targetFreq;

    const subPeak = (status === 'playing' ? 0.34 : 0.24) * (isDownbeat ? 1.05 : 0.88);
    schedulePunchEnvelope(subEnv.gain, time, subPeak, 0.005, stopAt - 0.04, stopAt);
    subOsc.connect(subEnv);
    subEnv.connect(this.outputNode);

    this.trackVoice(subOsc, stopAt, () => {
      subOsc.disconnect();
      subEnv.disconnect();
    });
    subOsc.start(time);
    subOsc.stop(stopAt);

    // Layer 2: Gritty sawtooth harmonic top bite so 808 slams cleanly
    const biteOsc = this.ctx.createOscillator();
    const biteFilter = this.ctx.createBiquadFilter();
    const biteEnv = this.ctx.createGain();
    biteOsc.type = 'sawtooth';
    biteOsc.frequency.setValueAtTime(clampFreq(targetFreq * 2), time);

    biteFilter.type = 'lowpass';
    biteFilter.Q.value = 2.2;
    const biteCutoff = isBoosting ? 980 : status === 'playing' ? 680 + speedNorm * 200 : 440;
    biteFilter.frequency.setValueAtTime(clampFreq(biteCutoff), time);
    biteFilter.frequency.exponentialRampToValueAtTime(160, time + dur * 0.8);

    const bitePeak = status === 'playing' ? 0.14 : 0.09;
    schedulePunchEnvelope(biteEnv.gain, time, bitePeak, 0.005, time + dur * 0.72, stopAt);
    biteOsc.connect(biteFilter);
    biteFilter.connect(biteEnv);
    biteEnv.connect(this.outputNode);

    this.trackVoice(biteOsc, stopAt, () => {
      biteOsc.disconnect();
      biteFilter.disconnect();
      biteEnv.disconnect();
    });
    biteOsc.start(time);
    biteOsc.stop(stopAt);
  }

  private playBeastDrums(
    time: number,
    track: BeastRapTrack,
    barStep: number,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode) return;
    const isPlaying = status === 'playing';
    const drumMul = isPlaying ? 1.0 : 0.65;

    // Hard Rap Kick
    if (track.kickSteps.includes(barStep) && this.trackedVoices.length < MAX_ACTIVE_MUSIC_VOICES) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.type = 'triangle';
      kickOsc.frequency.setValueAtTime(158, time);
      kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
      const kickStop = time + 0.18;
      schedulePunchEnvelope(kickEnv.gain, time, 0.36 * drumMul, 0.003, time + 0.15, kickStop);
      kickOsc.connect(kickEnv);
      kickEnv.connect(this.outputNode);
      this.trackVoice(kickOsc, kickStop, () => {
        kickOsc.disconnect();
        kickEnv.disconnect();
      });
      kickOsc.start(time);
      kickOsc.stop(kickStop);
    }

    // Hard Rap Clap + Snare Crack
    if (
      track.clapSteps.includes(barStep) &&
      this.noiseBuffer &&
      this.trackedVoices.length < MAX_ACTIVE_MUSIC_VOICES - 1
    ) {
      const bodyOsc = this.ctx.createOscillator();
      const bodyEnv = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(215, time);
      bodyOsc.frequency.exponentialRampToValueAtTime(102, time + 0.065);
      const bodyStop = time + 0.11;
      schedulePunchEnvelope(bodyEnv.gain, time, 0.16 * drumMul, 0.003, time + 0.085, bodyStop);
      bodyOsc.connect(bodyEnv);
      bodyEnv.connect(this.outputNode);
      this.trackVoice(bodyOsc, bodyStop, () => {
        bodyOsc.disconnect();
        bodyEnv.disconnect();
      });
      bodyOsc.start(time);
      bodyOsc.stop(bodyStop);

      const clapNoise = this.ctx.createBufferSource();
      clapNoise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1950;
      filter.Q.value = 0.85;
      const env = this.ctx.createGain();
      const clapStop = time + 0.17;
      schedulePunchEnvelope(env.gain, time, 0.22 * drumMul, 0.003, time + 0.145, clapStop);
      clapNoise.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      this.trackVoice(clapNoise, clapStop, () => {
        clapNoise.disconnect();
        filter.disconnect();
        env.disconnect();
      });
      clapNoise.start(time);
      clapNoise.stop(clapStop);
    }

    // Crisp Trap Hats & Rapid Rolls during active racing
    const isRoll = track.hatRollSteps.includes(barStep);
    const hitHat =
      track.hatSteps.includes(barStep) || (isPlaying && (isRoll || (isBoosting && barStep % 2 === 1)));
    if (hitHat && this.noiseBuffer && this.trackedVoices.length < MAX_ACTIVE_MUSIC_VOICES) {
      const subdivisions = isPlaying && isRoll ? 2 : 1;
      const sixteenth = 60 / this.smoothedBpm / 4;
      for (let sub = 0; sub < subdivisions; sub++) {
        if (this.trackedVoices.length >= MAX_ACTIVE_MUSIC_VOICES) break;
        const subTime = time + sub * (sixteenth * 0.5);
        const hatStop = subTime + 0.048;
        const hat = this.ctx.createBufferSource();
        hat.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = isRoll ? 7200 : 6200;
        const env = this.ctx.createGain();
        const hatPeak = (barStep % 4 === 2 ? 0.07 : 0.048) * drumMul;
        schedulePunchEnvelope(env.gain, subTime, hatPeak, 0.003, subTime + 0.036, hatStop);
        hat.connect(filter);
        filter.connect(env);
        env.connect(this.outputNode);
        this.trackVoice(hat, hatStop, () => {
          hat.disconnect();
          filter.disconnect();
          env.disconnect();
        });
        hat.start(subTime);
        hat.stop(hatStop);
      }
    }
  }

  private playRapHookLead(
    time: number,
    track: BeastRapTrack,
    bar: HarmonicBar,
    barStep: number,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.trackedVoices.length >= MAX_ACTIVE_MUSIC_VOICES) return;

    const slotIdx = track.hookSteps.indexOf(barStep);
    if (slotIdx === -1) return;

    const noteFreq = clampFreq(bar.hook[slotIdx % bar.hook.length]);
    const dur = track.useGlideLead ? 0.34 : 0.24;
    const stopAt = time + dur;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = track.useGlideLead ? 'sawtooth' : 'square';
    if (track.useGlideLead) {
      osc.frequency.setValueAtTime(clampFreq(this.lastGlideFreq), time);
      osc.frequency.exponentialRampToValueAtTime(noteFreq, time + 0.045);
      this.lastGlideFreq = noteFreq;
    } else {
      osc.frequency.setValueAtTime(noteFreq, time);
    }

    filter.type = 'lowpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(isBoosting ? 3200 : status === 'playing' ? 2400 : 1650, time);
    filter.frequency.exponentialRampToValueAtTime(750, stopAt);

    const peak = status === 'playing' ? (track.useGlideLead ? 0.068 : 0.058) : 0.04;
    schedulePunchEnvelope(env.gain, time, peak, 0.008, stopAt - 0.04, stopAt);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.outputNode);
    if (this.delaySend) env.connect(this.delaySend);

    this.trackVoice(osc, stopAt, () => {
      osc.disconnect();
      filter.disconnect();
      env.disconnect();
    });

    osc.start(time);
    osc.stop(stopAt);
  }

  public dispose(): void {
    this.releaseAllVoices();
    this.ctx = null;
    this.outputNode = null;
    this.delaySend = null;
    this.noiseBuffer = null;
  }
}
