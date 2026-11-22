import { GameStatus } from '../core/GameState';

interface HarmonicBar {
  root: number;
  chord: readonly number[];
  melody: readonly number[];
}

interface HotTrack {
  id: string;
  bpm: number;
  swing: number;
  style: 'trap' | 'boombap' | 'gfunk' | 'club' | 'drill';
  kickSteps: readonly number[];
  snareSteps: readonly number[];
  hatSteps: readonly number[];
  bassPattern: readonly number[];
  melodySteps: readonly number[];
  useGlideLead?: boolean;
  glideBass?: boolean;
  bars: readonly HarmonicBar[];
}

// 5 distinct Hip-Hop & Hot Music tracks — each stays consistent across the entire run
// and rotates cleanly on every new game start.
const HOT_TRACKS: readonly HotTrack[] = [
  // 1. Midnight Trap Heat (Half-time 134 BPM trap bounce with booming 808s & dark bells)
  {
    id: 'midnight_trap_heat',
    bpm: 134,
    swing: 0.04,
    style: 'trap',
    kickSteps: [0, 6, 10],
    snareSteps: [8],
    hatSteps: [0, 2, 4, 6, 7, 8, 10, 12, 13, 14, 15],
    bassPattern: [1, 0, 0, 0, 0, 0, 1.5, 0, 0, 0, 1.25, 0, 0, 0, 1, 0],
    melodySteps: [0, 3, 6, 10, 12],
    glideBass: true,
    bars: [
      { root: 43.65, chord: [174.61, 207.65, 261.63], melody: [698.46, 830.61, 698.46, 622.25, 523.25] },
      { root: 34.65, chord: [138.59, 174.61, 207.65], melody: [622.25, 698.46, 830.61, 698.46, 523.25] },
      { root: 58.27, chord: [174.61, 207.65, 277.18], melody: [698.46, 783.99, 830.61, 698.46, 622.25] },
      { root: 65.41, chord: [196.0, 246.94, 293.66], melody: [659.25, 783.99, 659.25, 587.33, 523.25] },
    ],
  },
  // 2. East Coast Fire (96 BPM Golden-Era Boom-Bap Hip-Hop)
  {
    id: 'east_coast_fire',
    bpm: 96,
    swing: 0.14,
    style: 'boombap',
    kickSteps: [0, 3, 7, 10],
    snareSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    bassPattern: [1, 0, 0, 1.5, 0, 0, 0, 1.25, 0, 0, 1, 0, 0, 0, 1.5, 0],
    melodySteps: [0, 3, 8, 11, 14],
    bars: [
      { root: 65.41, chord: [261.63, 311.13, 392.0, 466.16], melody: [523.25, 622.25, 783.99, 698.46, 587.33] },
      { root: 43.65, chord: [174.61, 207.65, 261.63, 311.13], melody: [622.25, 523.25, 466.16, 392.0, 466.16] },
      { root: 51.91, chord: [207.65, 261.63, 311.13, 392.0], melody: [587.33, 622.25, 783.99, 622.25, 523.25] },
      { root: 49.0, chord: [196.0, 246.94, 293.66, 349.23], melody: [587.33, 523.25, 466.16, 392.0, 493.88] },
    ],
  },
  // 3. West Coast Bounce (102 BPM Hot G-Funk Club Hip-Hop)
  {
    id: 'west_coast_bounce',
    bpm: 102,
    swing: 0.12,
    style: 'gfunk',
    kickSteps: [0, 6, 10, 14],
    snareSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 13, 14],
    bassPattern: [1, 0, 0, 0, 0, 0, 1, 0, 1.5, 0, 1.25, 0, 0, 0, 1, 0],
    melodySteps: [0, 6, 10, 14],
    useGlideLead: true,
    glideBass: true,
    bars: [
      { root: 73.42, chord: [220.0, 261.63, 293.66, 349.23], melody: [1174.66, 1046.5, 880.0, 1046.5] },
      { root: 49.0, chord: [196.0, 233.08, 293.66, 349.23], melody: [932.33, 880.0, 783.99, 880.0] },
      { root: 58.27, chord: [233.08, 293.66, 349.23, 440.0], melody: [1046.5, 1174.66, 932.33, 880.0] },
      { root: 55.0, chord: [220.0, 277.18, 329.63, 392.0], melody: [880.0, 783.99, 659.25, 783.99] },
    ],
  },
  // 4. Club Overdrive Hot (118 BPM High-Energy Hip-Hop / Electro Anthem)
  {
    id: 'club_overdrive_hot',
    bpm: 118,
    swing: 0.05,
    style: 'club',
    kickSteps: [0, 4, 8, 12, 14],
    snareSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14, 15],
    bassPattern: [1, 0, 2, 0, 1, 0, 1.5, 2, 0, 1, 2, 0, 1, 0, 1.5, 0],
    melodySteps: [0, 2, 6, 8, 12],
    bars: [
      { root: 55.0, chord: [220.0, 261.63, 329.63, 440.0], melody: [880.0, 783.99, 659.25, 783.99, 880.0] },
      { root: 43.65, chord: [174.61, 220.0, 261.63, 349.23], melody: [698.46, 880.0, 783.99, 659.25, 587.33] },
      { root: 65.41, chord: [196.0, 261.63, 329.63, 392.0], melody: [783.99, 880.0, 1046.5, 880.0, 783.99] },
      { root: 49.0, chord: [196.0, 246.94, 293.66, 392.0], melody: [659.25, 783.99, 587.33, 493.88, 587.33] },
    ],
  },
  // 5. Neon Drill Heat (Half-time 138 BPM Melodic Drill / Hot Phonk-Hop)
  {
    id: 'neon_drill_heat',
    bpm: 138,
    swing: 0.05,
    style: 'drill',
    kickSteps: [0, 6, 11],
    snareSteps: [8, 14],
    hatSteps: [0, 2, 3, 6, 8, 9, 12, 14, 15],
    bassPattern: [1, 0, 0, 1.5, 0, 0, 1, 0, 0, 0, 2, 0, 1.5, 0, 0, 0],
    melodySteps: [0, 4, 8, 12],
    glideBass: true,
    bars: [
      { root: 41.2, chord: [164.81, 196.0, 246.94, 293.66], melody: [659.25, 783.99, 659.25, 587.33] },
      { root: 65.41, chord: [196.0, 246.94, 329.63], melody: [783.99, 659.25, 587.33, 523.25] },
      { root: 55.0, chord: [220.0, 261.63, 329.63], melody: [659.25, 587.33, 523.25, 493.88] },
      { root: 61.74, chord: [185.0, 246.94, 311.13], melody: [739.99, 659.25, 587.33, 493.88] },
    ],
  },
];

const SCHEDULE_AHEAD_SEC = 0.09;
const MAX_ACTIVE_MUSIC_VOICES = 28;

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 220;
  return Math.max(28, Math.min(14000, freq));
}

function scheduleSmoothEnvelope(
  gainParam: AudioParam,
  startTime: number,
  peak: number,
  attackSec: number,
  decayEndTime: number,
  stopTime: number,
): void {
  const safePeak = Math.max(0.001, Math.min(0.36, peak));
  const safeAttack = Math.max(0.004, attackSec);
  const safeFadeEnd = Math.max(startTime + safeAttack + 0.012, decayEndTime);
  const safeZero = Math.max(safeFadeEnd + 0.006, stopTime - 0.003);

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

  private trackIndex = 0;
  private cycleStep = 0;
  private nextStepTime = 0;
  private smoothedBpm = HOT_TRACKS[0].bpm;
  private activeVoices = 0;
  private lastGlideFreq = 880;
  private lastBassFreq = 55;

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

  public selectNextTrack(): void {
    this.trackIndex = (this.trackIndex + 1) % HOT_TRACKS.length;
    const track = HOT_TRACKS[this.trackIndex];
    this.cycleStep = 0;
    this.smoothedBpm = track.bpm;
    this.lastGlideFreq = track.bars[0].melody[0];
    this.lastBassFreq = track.bars[0].root;
    if (this.ctx && Number.isFinite(this.ctx.currentTime)) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }
  }

  public getCurrentTrackId(): string {
    return HOT_TRACKS[this.trackIndex].id;
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
    const track = HOT_TRACKS[this.trackIndex];
    const targetBpm =
      status === 'playing'
        ? track.bpm + speedNorm * 6 + (isBoosting ? 3 : 0)
        : Math.max(88, track.bpm - 6);

    const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0.016;
    const blend = 1 - Math.exp(-2.6 * safeDt);
    this.smoothedBpm += (targetBpm - this.smoothedBpm) * blend;

    if (this.nextStepTime < now - 0.12 || this.nextStepTime > now + 0.5) {
      this.nextStepTime = now + 0.02;
    }

    const totalSteps = track.bars.length * 16;
    let scheduledInFrame = 0;
    while (this.nextStepTime < now + SCHEDULE_AHEAD_SEC && scheduledInFrame < 4) {
      this.triggerStep(this.nextStepTime, track, this.cycleStep, status, speedNorm, isBoosting);

      const baseSixteenth = 60 / this.smoothedBpm / 4;
      const isOffbeat = this.cycleStep % 2 === 1;
      const swingMul = isOffbeat ? 1 - track.swing : 1 + track.swing;
      this.nextStepTime += baseSixteenth * swingMul;

      this.cycleStep = (this.cycleStep + 1) % totalSteps;
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
    track: HotTrack,
    step: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    const barIdx = Math.floor(step / 16) % track.bars.length;
    const barStep = step % 16;
    const bar = track.bars[barIdx];

    // 1. Hot Synth Brass / Rhodes Stabs
    const chordTrigger =
      track.style === 'club'
        ? barStep === 0 || barStep === 6 || barStep === 12
        : track.style === 'boombap'
          ? barStep === 0 || barStep === 10
          : barStep === 0;
    if (chordTrigger && this.activeVoices <= MAX_ACTIVE_MUSIC_VOICES - 4) {
      this.playChordStab(time, track, bar.chord, status, isBoosting);
    }

    // 2. Heavy 808 / Punchy Hip-Hop Bassline
    this.playHotBass(time, track, barStep, bar.root, status, speedNorm, isBoosting);

    // 3. Punchy Hip-Hop & Club Drums
    if (status === 'playing') {
      this.playHotDrums(time, track, barStep, isBoosting);
    }

    // 4. Hot Hook / G-Funk Whistle / Trap Bell Lead
    this.playHotLead(time, track, bar, barStep, status, isBoosting);
  }

  private playChordStab(
    time: number,
    track: HotTrack,
    chord: readonly number[],
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode) return;
    const isClubStab = track.style === 'club' || track.style === 'boombap';
    const dur = isClubStab ? 0.55 : 1.7;
    const level = isClubStab ? 0.045 : status === 'playing' ? 0.038 : 0.028;

    for (let i = 0; i < chord.length; i++) {
      if (this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) break;
      const freq = clampFreq(chord[i]);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = track.style === 'club' ? 'sawtooth' : i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        track.style === 'club'
          ? isBoosting
            ? 2200
            : 1550
          : status === 'playing'
            ? 1250
            : 820,
        time,
      );

      scheduleSmoothEnvelope(
        env.gain,
        time,
        level,
        isClubStab ? 0.01 : 0.08,
        time + dur - 0.1,
        time + dur,
      );

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      if (this.delaySend && i === 0) env.connect(this.delaySend);

      this.trackVoice(osc, () => {
        osc.disconnect();
        filter.disconnect();
        env.disconnect();
      });

      osc.start(time);
      osc.stop(time + dur);
    }
  }

  private playHotBass(
    time: number,
    track: HotTrack,
    barStep: number,
    rootFreq: number,
    status: GameStatus,
    speedNorm: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    const ratio = track.bassPattern[barStep] ?? 0;
    if (ratio === 0) return;

    const targetFreq = clampFreq(rootFreq * ratio);
    const is808 = track.glideBass === true;
    const dur = is808 ? 0.36 : 0.22;

    const bassOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    bassOsc.type = is808 ? 'sine' : track.style === 'club' ? 'sawtooth' : 'triangle';
    if (is808) {
      bassOsc.frequency.setValueAtTime(clampFreq(this.lastBassFreq * 1.15), time);
      bassOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.05);
      this.lastBassFreq = targetFreq;
    } else {
      bassOsc.frequency.setValueAtTime(targetFreq, time);
    }

    filter.type = 'lowpass';
    filter.Q.value = track.style === 'club' ? 2.6 : 1.4;
    const cutoff = is808
      ? 480
      : isBoosting
        ? 1100
        : status === 'playing'
          ? 620 + speedNorm * 280
          : 380;
    filter.frequency.setValueAtTime(clampFreq(cutoff), time);
    filter.frequency.exponentialRampToValueAtTime(120, time + dur * 0.85);

    const peak = is808 ? 0.31 : barStep % 4 === 0 ? 0.24 : 0.17;
    scheduleSmoothEnvelope(env.gain, time, peak, 0.008, time + dur - 0.03, time + dur);

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

  private playHotDrums(
    time: number,
    track: HotTrack,
    barStep: number,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode) return;

    // 1. Punchy Hip-Hop / Club Kick
    if (track.kickSteps.includes(barStep) && this.activeVoices < MAX_ACTIVE_MUSIC_VOICES) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      scheduleSmoothEnvelope(kickEnv.gain, time, 0.34, 0.004, time + 0.17, time + 0.195);
      kickOsc.connect(kickEnv);
      kickEnv.connect(this.outputNode);
      this.trackVoice(kickOsc, () => {
        kickOsc.disconnect();
        kickEnv.disconnect();
      });
      kickOsc.start(time);
      kickOsc.stop(time + 0.195);
    }

    // 2. Crisp Trap Clap / Hip-Hop Snare
    if (
      track.snareSteps.includes(barStep) &&
      this.noiseBuffer &&
      this.activeVoices < MAX_ACTIVE_MUSIC_VOICES - 1
    ) {
      const bodyOsc = this.ctx.createOscillator();
      const bodyEnv = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(track.style === 'trap' ? 220 : 190, time);
      bodyOsc.frequency.exponentialRampToValueAtTime(98, time + 0.09);
      scheduleSmoothEnvelope(bodyEnv.gain, time, 0.15, 0.004, time + 0.11, time + 0.13);
      bodyOsc.connect(bodyEnv);
      bodyEnv.connect(this.outputNode);
      this.trackVoice(bodyOsc, () => {
        bodyOsc.disconnect();
        bodyEnv.disconnect();
      });
      bodyOsc.start(time);
      bodyOsc.stop(time + 0.13);

      const snare = this.ctx.createBufferSource();
      snare.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = track.style === 'trap' || track.style === 'drill' ? 1850 : 1350;
      filter.Q.value = 0.85;
      const env = this.ctx.createGain();
      scheduleSmoothEnvelope(env.gain, time, 0.18, 0.004, time + 0.16, time + 0.185);
      snare.connect(filter);
      filter.connect(env);
      env.connect(this.outputNode);
      if (this.delaySend) env.connect(this.delaySend);
      this.trackVoice(snare, () => {
        snare.disconnect();
        filter.disconnect();
        env.disconnect();
      });
      snare.start(time);
      snare.stop(time + 0.185);
    }

    // 3. Crisp Hats + Trap/Club Roll Energy
    const hitHat = isBoosting || track.hatSteps.includes(barStep);
    if (hitHat && this.noiseBuffer && this.activeVoices < MAX_ACTIVE_MUSIC_VOICES) {
      const hat = this.ctx.createBufferSource();
      hat.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6600;
      const env = this.ctx.createGain();
      const isRoll = barStep === 13 || barStep === 15;
      scheduleSmoothEnvelope(
        env.gain,
        time,
        barStep % 4 === 2 ? 0.068 : isRoll ? 0.042 : 0.05,
        0.003,
        time + 0.036,
        time + 0.048,
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
      hat.stop(time + 0.048);
    }
  }

  private playHotLead(
    time: number,
    track: HotTrack,
    bar: HarmonicBar,
    barStep: number,
    status: GameStatus,
    isBoosting: boolean,
  ): void {
    if (!this.ctx || !this.outputNode || this.activeVoices >= MAX_ACTIVE_MUSIC_VOICES) return;

    const slotIdx = track.melodySteps.indexOf(barStep);
    if (slotIdx === -1) return;

    const noteFreq = clampFreq(bar.melody[slotIdx]);
    const dur = track.useGlideLead ? 0.42 : track.style === 'club' ? 0.24 : 0.34;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    if (track.useGlideLead) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(clampFreq(this.lastGlideFreq), time);
      osc.frequency.exponentialRampToValueAtTime(noteFreq, time + 0.065);
      this.lastGlideFreq = noteFreq;
    } else if (track.style === 'club') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, time);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, time);
    }

    filter.type = 'lowpass';
    filter.frequency.value =
      track.style === 'club' ? (isBoosting ? 2900 : 2200) : isBoosting ? 2400 : 1850;

    const peak = status === 'playing' ? (track.style === 'club' ? 0.065 : 0.068) : 0.042;
    scheduleSmoothEnvelope(env.gain, time, peak, 0.01, time + dur - 0.05, time + dur);

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
