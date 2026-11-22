import { GameStatus } from '../core/GameState';

interface HarmonicBar {
  root: number;
  chord: readonly number[];
  melody: readonly number[];
}

// Seamless 8-bar cool & calm Chillwave / Lo-Fi Hip-Hop progression (consistent pocket & mood)
const PROGRESSION: readonly HarmonicBar[] = [
  // Bar 1: Am9
  {
    root: 55.0,
    chord: [220.0, 261.63, 329.63, 392.0, 493.88],
    melody: [659.25, 587.33, 523.25, 493.88],
  },
  // Bar 2: Fmaj9
  {
    root: 43.65,
    chord: [174.61, 220.0, 261.63, 329.63, 392.0],
    melody: [523.25, 659.25, 587.33, 440.0],
  },
  // Bar 3: Cmaj9
  {
    root: 65.41,
    chord: [196.0, 246.94, 293.66, 329.63],
    melody: [587.33, 659.25, 783.99, 659.25],
  },
  // Bar 4: G6 / Em7
  {
    root: 49.0,
    chord: [196.0, 246.94, 293.66, 329.63],
    melody: [493.88, 587.33, 440.0, 392.0],
  },
  // Bar 5: Dm9
  {
    root: 73.42,
    chord: [174.61, 220.0, 261.63, 329.63],
    melody: [659.25, 587.33, 523.25, 440.0],
  },
  // Bar 6: G13sus4
  {
    root: 49.0,
    chord: [196.0, 261.63, 293.66, 329.63],
    melody: [587.33, 523.25, 493.88, 392.0],
  },
  // Bar 7: Cmaj9
  {
    root: 65.41,
    chord: [196.0, 246.94, 329.63, 392.0],
    melody: [523.25, 587.33, 659.25, 783.99],
  },
  // Bar 8: E7sus4 -> Am turnaround
  {
    root: 82.41,
    chord: [220.0, 246.94, 293.66, 329.63],
    melody: [659.25, 587.33, 493.88, 440.0],
  },
];

const STEPS_PER_CYCLE = PROGRESSION.length * 16; // 128 continuous 16th steps
const SCHEDULE_AHEAD_SEC = 0.09;
const MAX_ACTIVE_MUSIC_VOICES = 28;
const SWING_AMOUNT = 0.09;

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 220;
  return Math.max(28, Math.min(12000, freq));
}

function scheduleSmoothEnvelope(
  gainParam: AudioParam,
  startTime: number,
  peak: number,
  attackSec: number,
  decayEndTime: number,
  stopTime: number,
): void {
  const safePeak = Math.max(0.001, Math.min(0.32, peak));
  const safeAttack = Math.max(0.008, attackSec);
  const safeFadeEnd = Math.max(startTime + safeAttack + 0.015, decayEndTime);
  const safeZero = Math.max(safeFadeEnd + 0.008, stopTime - 0.003);

  gainParam.setValueAtTime(0, startTime);
  gainParam.linearRampToValueAtTime(safePeak, startTime + safeAttack);
  gainParam.exponentialRampToValueAtTime(0.0006, safeFadeEnd);
  gainParam.linearRampToValueAtTime(0, safeZero);
}

export class ClassicSoundtrack {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private delaySend: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private cycleStep = 0;
  private nextStepTime = 0;
  private smoothedBpm = 100;
  private activeVoices = 0;

  public attach(
    ctx: AudioContext,
    outputNode: AudioNode,
    delaySend: AudioNode,
    noiseBuffer: AudioBuffer,
  ): void {
    this.ctx = ctx;
    this.outputNode = outputNode;
    this.delaySend = delaySend;
    this.noiseBuffer = noiseBuffer;
    this.nextStepTime = ctx.currentTime + 0.02;
    this.activeVoices = 0;
  }

  public resetClock(): void {
    if (!this.ctx) return;
    this.nextStepTime = Math.max(this.ctx.currentTime + 0.02, this.nextStepTime);
    if (this.nextStepTime - this.ctx.currentTime > 0.25) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }
  }

  public update(dt: number, status: GameStatus, speedNorm: number, isBoosting: boolean): void {
    if (!this.ctx || !this.outputNode || this.ctx.state !== 'running') return;
    if (!Number.isFinite(this.ctx.currentTime)) return;

    const now = this.ctx.currentTime;
    // Consistent, steady calm groove tempo (no jarring genre/BPM jumps)
    const targetBpm =
      status === 'playing'
        ? 100 + speedNorm * 6 + (isBoosting ? 2 : 0)
        : 94;

    const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0.016;
    const blend = 1 - Math.exp(-2.2 * safeDt);
    this.smoothedBpm += (targetBpm - this.smoothedBpm) * blend;

    if (this.nextStepTime < now - 0.12 || this.nextStepTime > now + 0.5) {
      this.nextStepTime = now + 0.02;
    }

    let scheduledInFrame = 0;
    while (this.nextStepTime < now + SCHEDULE_AHEAD_SEC && scheduledInFrame < 4) {
      this.triggerStep(this.nextStepTime, this.cycleStep, status, isBoosting);

      const baseSixteenth = 60 / this.smoothedBpm / 4;
      const isOffbeat = this.cycleStep % 2 === 1;
      const swingMul = isOffbeat ? 1 - SWING_AMOUNT : 1 + SWING_AMOUNT;
      this.nextStepTime += baseSixteenth * swingMul;

      this.cycleStep = (this.cycleStep + 1) % STEPS_PER_CYCLE;
      scheduledInFrame += 1;
    }
  }

  private trackVoice(node: AudioScheduledSourceNode, cleanup: () => void): void {
    this.activeVoices += 1;
    let freed = false;
    const release = () => {
      if (freed) return;
      freed = true;
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      try {
        cleanup();
      } catch {
        // Ignore cleanup errors
      }
    };
    node.onended = release;
  }

  private triggerStep(
    time: number,
    step: number,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    const barIdx = Math.floor(step / 16) % PROGRESSION.length;
    const barStep = step % 16;
    const bar = PROGRESSION[barIdx];

    // 1. Warm Rhodes Electric-Piano & Smooth Chill Pad Chords (consistent every bar)
    if (barStep === 0 && this.activeVoices <= MAX_ACTIVE_MUSIC_VOICES - 5) {
      this.playWarmRhodesChord(time, bar.chord, status);
    }

    // 2. Soft Warm Sub-Bass Groove (steady cool hip-hop/chillwave pocket)
    this.playWarmBass(time, barStep, bar.root);

    // 3. Soft Brushed Chill Drums during active play
    if (status === 'playing') {
      this.playChillDrums(time, barStep);
    }

    // 4. Calm Warm Bell / Electric Key Melody (gentle floating notes, zero harsh buzz)
    this.playCalmMelody(time, bar, barStep, status, isBoosting);
  }

  private playWarmRhodesChord(
    time: number,
    chord: readonly number[],
    status: GameStatus,
  ): void {
    if (!this.ctx || !this.outputNode) return;
    const dur = 2.35;
    const level = status === 'playing' ? 0.045 : 0.036;

    for (let i = 0; i < chord.length; i++) {
      if (this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) break;
      const freq = clampFreq(chord[i]);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      // Pure sine & soft triangle create a warm, velvety electric piano pad
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(status === 'playing' ? 1150 : 880, time);

      scheduleSmoothEnvelope(env.gain, time, level, 0.08, time + dur - 0.18, time + dur);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      if (this.delaySend && i === 1) env.connect(this.delaySend);

      this.trackVoice(osc, () => {
        osc.disconnect();
        filter.disconnect();
        env.disconnect();
      });

      osc.start(time);
      osc.stop(time + dur);
    }
  }

  private playWarmBass(time: number, barStep: number, rootFreq: number): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    // Steady, warm hip-hop / chillwave bass pattern
    const pattern = [1, 0, 0, 0, 0, 0, 1.5, 0, 1, 0, 0, 1.25, 0, 0, 1, 0];
    const ratio = pattern[barStep];
    if (ratio === 0) return;

    const freq = clampFreq(rootFreq * ratio);
    const dur = 0.34;
    const bassOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, time);
    filter.Q.value = 0.9;

    const peak = barStep === 0 ? 0.24 : 0.17;
    scheduleSmoothEnvelope(env.gain, time, peak, 0.015, time + dur - 0.04, time + dur);

    bassOsc.connect(filter);
    filter.connect(env);
    env.connect(this.outputNode);

    this.trackVoice(bassOsc, () => {
      bassOsc.disconnect();
      filter.disconnect();
      env.disconnect();
    });

    bassOsc.start(time);
    bassOsc.stop(time + dur);
  }

  private playChillDrums(time: number, barStep: number): void {
    if (!this.ctx || !this.outputNode) return;

    // Round warm kick
    const kickHit = barStep === 0 || barStep === 6 || barStep === 10;
    if (kickHit && this.activeVoices < MAX_ACTIVE_MUSIC_VOICES) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(112, time);
      kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      scheduleSmoothEnvelope(kickEnv.gain, time, 0.24, 0.008, time + 0.18, time + 0.2);
      kickOsc.connect(kickEnv);
      kickEnv.connect(this.outputNode);
      this.trackVoice(kickOsc, () => {
        kickOsc.disconnect();
        kickEnv.disconnect();
      });
      kickOsc.start(time);
      kickOsc.stop(time + 0.2);
    }

    // Soft brushed lo-fi snare on beats 2 & 4
    if (
      (barStep === 4 || barStep === 12) &&
      this.noiseBuffer &&
      this.activeVoices < MAX_ACTIVE_MUSIC_VOICES
    ) {
      const snare = this.ctx.createBufferSource();
      snare.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1350;
      filter.Q.value = 0.7;
      const env = this.ctx.createGain();
      scheduleSmoothEnvelope(env.gain, time, 0.11, 0.008, time + 0.14, time + 0.17);
      snare.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      this.trackVoice(snare, () => {
        snare.disconnect();
        filter.disconnect();
        env.disconnect();
      });
      snare.start(time);
      snare.stop(time + 0.17);
    }

    // Gentle whisper hi-hat on 8th notes
    if (barStep % 2 === 0 && this.noiseBuffer && this.activeVoices < MAX_ACTIVE_MUSIC_VOICES) {
      const hat = this.ctx.createBufferSource();
      hat.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5200;
      filter.Q.value = 1.2;
      const env = this.ctx.createGain();
      scheduleSmoothEnvelope(
        env.gain,
        time,
        barStep % 4 === 2 ? 0.036 : 0.024,
        0.005,
        time + 0.04,
        time + 0.055,
      );
      hat.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      this.trackVoice(hat, () => {
        hat.disconnect();
        filter.disconnect();
        env.disconnect();
      });
      hat.start(time);
      hat.stop(time + 0.055);
    }
  }

  private playCalmMelody(
    time: number,
    bar: HarmonicBar,
    barStep: number,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    // Play spacious floating melodic keys on beat 0, 3, 8, 12
    const stepSlots = [0, 3, 8, 12];
    const slotIdx = stepSlots.indexOf(barStep);
    if (slotIdx === -1) return;

    const noteFreq = clampFreq(bar.melody[slotIdx]);
    const dur = 0.58;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteFreq, time);

    filter.type = 'lowpass';
    filter.frequency.value = isBoosting ? 2400 : 1800;

    const peak = status === 'playing' ? 0.055 : 0.038;
    scheduleSmoothEnvelope(env.gain, time, peak, 0.018, time + dur - 0.06, time + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.outputNode);
    if (this.delaySend) env.connect(this.delaySend);

    this.trackVoice(osc, () => {
      osc.disconnect();
      filter.disconnect();
      env.disconnect();
    });

    osc.start(time);
    osc.stop(time + dur);
  }
}
