function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface TrackPreset {
  bpm: number;
  rootMidi: number;
  scale: readonly number[];
  chordOffsets: readonly number[];
  bassSteps: readonly number[];
  leadSteps: readonly number[];
  kickSteps: readonly number[];
  snareSteps: readonly number[];
  leadWave: OscillatorType;
  filterBaseHz: number;
  durationSec: number;
}

const SCALES: readonly (readonly number[])[] = [
  [0, 2, 3, 5, 7, 8, 10, 12], // Natural Minor
  [0, 1, 3, 5, 7, 8, 10, 12], // Phrygian Drive
  [0, 2, 3, 5, 7, 9, 10, 12], // Dorian Arcade
  [0, 3, 5, 7, 10, 12, 15, 17], // Minor Pentatonic
  [0, 2, 4, 7, 9, 12, 14, 16], // Bright Outrun
];

const CHORD_PROGRESSIONS: readonly (readonly number[])[] = [
  [0, 8, 10, 7],
  [0, 5, 8, 7],
  [0, 10, 8, 7],
  [0, 3, 8, 10],
  [0, 7, 5, 10],
  [0, 8, 3, 10],
];

const BASS_PATTERNS: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
  [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 1, 2, 0],
  [1, 1, 0, 1, 2, 0, 1, 1, 1, 1, 0, 1, 2, 1, 0, 1],
  [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 1, 0, 2, 1],
];

const LEAD_PATTERNS: readonly (readonly number[])[] = [
  [0, -1, 2, 4, 5, -1, 4, 2, 0, -1, 3, 4, 7, -1, 5, 4],
  [4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 3, 2, 0, -1, 2, 4],
  [0, 4, 7, 4, 5, 7, 4, 2, 0, 3, 5, 3, 4, 2, 0, -1],
  [7, -1, 5, 4, 2, -1, 4, 5, 7, -1, 5, 3, 2, 0, 2, 4],
  [0, 2, 4, -1, 7, 5, 4, 2, 3, 5, 7, -1, 5, 4, 2, 0],
  [4, -1, 4, 5, 7, -1, 5, 4, 2, -1, 2, 4, 5, -1, 3, 2],
];

const KICK_PATTERNS: readonly (readonly number[])[] = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
];

const SNARE_PATTERNS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
];

const LEAD_WAVES: readonly OscillatorType[] = ['sawtooth', 'square', 'triangle'];

function buildPreset(index: number): TrackPreset {
  const i = Math.max(0, Math.min(29, index));
  return {
    bpm: 122 + ((i * 7) % 27),
    rootMidi: 36 + ((i * 5) % 12),
    scale: SCALES[i % SCALES.length],
    chordOffsets: CHORD_PROGRESSIONS[Math.floor(i / 2) % CHORD_PROGRESSIONS.length],
    bassSteps: BASS_PATTERNS[i % BASS_PATTERNS.length],
    leadSteps: LEAD_PATTERNS[(i * 3) % LEAD_PATTERNS.length],
    kickSteps: KICK_PATTERNS[i % KICK_PATTERNS.length],
    snareSteps: SNARE_PATTERNS[i % SNARE_PATTERNS.length],
    leadWave: LEAD_WAVES[i % LEAD_WAVES.length],
    filterBaseHz: 900 + ((i * 210) % 1400),
    durationSec: 112 + ((i * 11) % 36),
  };
}

const TRACK_PRESETS: readonly TrackPreset[] = Array.from({ length: 30 }, (_, i) =>
  buildPreset(i),
);

export class LocalTrackBank {
  private ctx: AudioContext | null = null;
  private destinationGain: GainNode | null = null;
  private busGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private active = false;
  private trackIndex = 0;
  private stepIndex = 0;
  private nextNoteTime = 0;
  private handoffTime = 0;
  private elapsedTrackSeconds = 0;
  private schedulerTimer: number | null = null;
  private onTrackComplete: (() => void) | null = null;

  public attach(
    ctx: AudioContext,
    musicGain: GainNode,
    noiseBuffer: AudioBuffer | null,
    onTrackComplete: () => void,
  ): void {
    this.ctx = ctx;
    this.destinationGain = musicGain;
    this.noiseBuffer = noiseBuffer;
    this.onTrackComplete = onTrackComplete;

    if (!this.busGain) {
      this.busGain = ctx.createGain();
      this.busGain.gain.value = 0;
      this.busGain.connect(musicGain);
    }
  }

  public isAttached(): boolean {
    return Boolean(this.ctx && this.destinationGain && this.busGain);
  }

  public isPlaying(): boolean {
    return this.active;
  }

  public getCurrentTrackIndex(): number {
    return this.trackIndex;
  }

  public start(trackIndex: number, resetPosition = false): void {
    if (!this.ctx || !this.busGain) return;
    const clamped = ((trackIndex % TRACK_PRESETS.length) + TRACK_PRESETS.length) % TRACK_PRESETS.length;
    const now = this.ctx.currentTime;
    const isSeamlessHandoff =
      this.active && resetPosition && this.handoffTime > now;

    if (resetPosition || clamped !== this.trackIndex) {
      this.trackIndex = clamped;
      this.stepIndex = 0;
      this.elapsedTrackSeconds = 0;
    }

    if (isSeamlessHandoff) {
      const startAt = Math.max(now + 0.05, this.handoffTime);
      this.handoffTime = 0;
      this.nextNoteTime = startAt;
      const rampStart = Math.max(now, startAt - 0.04);
      this.busGain.gain.cancelScheduledValues(rampStart);
      this.busGain.gain.setTargetAtTime(0.76, rampStart, 0.09);
      return;
    }

    this.handoffTime = 0;
    this.busGain.gain.cancelScheduledValues(now);
    this.busGain.gain.setTargetAtTime(0.76, now, 0.06);

    if (this.active) return;
    this.active = true;
    this.nextNoteTime = now + 0.04;

    if (this.schedulerTimer === null) {
      this.schedulerTimer = window.setInterval(() => this.tick(), 65);
    }
    this.tick();
  }

  public stop(): void {
    this.active = false;
    this.handoffTime = 0;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.ctx && this.busGain) {
      const now = this.ctx.currentTime;
      this.busGain.gain.cancelScheduledValues(now);
      this.busGain.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  private tick(): void {
    if (!this.active || !this.ctx || !this.busGain || this.ctx.state !== 'running') return;

    const preset = TRACK_PRESETS[this.trackIndex];
    const stepDuration = 60 / preset.bpm / 4; // 16th-note duration
    const lookahead = 0.16;

    if (this.nextNoteTime < this.ctx.currentTime - 0.25) {
      this.nextNoteTime = this.ctx.currentTime + 0.03;
    }

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      if (this.elapsedTrackSeconds >= preset.durationSec && this.stepIndex % 16 === 0) {
        this.handoffTime = this.nextNoteTime + 0.28;
        const fadeAt = Math.max(this.ctx.currentTime, this.nextNoteTime - 0.14);
        this.busGain.gain.cancelScheduledValues(fadeAt);
        this.busGain.gain.setTargetAtTime(0.02, fadeAt, 0.08);
        this.elapsedTrackSeconds = 0;
        this.stepIndex = 0;
        this.onTrackComplete?.();
        return;
      }

      this.scheduleStep(preset, this.stepIndex, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.stepIndex += 1;
      this.elapsedTrackSeconds += stepDuration;
    }
  }

  private scheduleStep(
    preset: TrackPreset,
    globalStep: number,
    time: number,
    stepDur: number,
  ): void {
    if (!this.ctx || !this.busGain) return;

    const stepInBar = globalStep % 16;
    const barIndex = Math.floor(globalStep / 16) % 4;
    const chordRoot = preset.rootMidi + preset.chordOffsets[barIndex];

    // Driving bassline
    const bassCode = preset.bassSteps[stepInBar];
    if (bassCode > 0) {
      const midi = chordRoot + (bassCode === 2 ? 12 : 0);
      this.triggerBass(midiToFreq(midi), time, stepDur * 0.85, preset.filterBaseHz);
    }

    // Pad chord hit on bar downbeats
    if (stepInBar === 0) {
      const fifthMidi = chordRoot + 19;
      this.triggerPad(midiToFreq(chordRoot + 12), midiToFreq(fifthMidi), time, stepDur * 14);
    }

    // Lead / Arp riff (introduce fuller phrase variation across bars)
    const leadDegree = preset.leadSteps[stepInBar];
    if (leadDegree >= 0) {
      const scaleNote = preset.scale[leadDegree % preset.scale.length];
      const octaveLift = barIndex === 3 && stepInBar >= 12 ? 12 : 0;
      const leadFreq = midiToFreq(chordRoot + 24 + scaleNote + octaveLift);
      this.triggerLead(leadFreq, time, stepDur * 1.15, preset.leadWave, preset.filterBaseHz * 1.9);
    }

    // Drums
    if (preset.kickSteps[stepInBar]) {
      this.triggerKick(time);
    }
    if (preset.snareSteps[stepInBar]) {
      this.triggerSnare(time);
    }
    if (stepInBar % 2 === 1) {
      this.triggerHat(time);
    }
  }

  private triggerBass(freq: number, time: number, dur: number, cutoffHz: number): void {
    if (!this.ctx || !this.busGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, cutoffHz * 0.28), time + dur);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.busGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerPad(freqA: number, freqB: number, time: number, dur: number): void {
    if (!this.ctx || !this.busGain) return;
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscA.type = 'triangle';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(freqA, time);
    oscB.frequency.setValueAtTime(freqB, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.busGain);
    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + dur + 0.04);
    oscB.stop(time + dur + 0.04);
  }

  private triggerLead(
    freq: number,
    time: number,
    dur: number,
    wave: OscillatorType,
    cutoffHz: number,
  ): void {
    if (!this.ctx || !this.busGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, cutoffHz), time);
    filter.Q.value = 1.6;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.11, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.busGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerKick(time: number): void {
    if (!this.ctx || !this.busGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(132, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);

    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.busGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  private triggerSnare(time: number): void {
    if (!this.ctx || !this.busGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1850;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.busGain);
    src.start(time);
    src.stop(time + 0.15);
  }

  private triggerHat(time: number): void {
    if (!this.ctx || !this.busGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.busGain);
    src.start(time);
    src.stop(time + 0.06);
  }

  public dispose(): void {
    this.stop();
    try {
      this.busGain?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    this.busGain = null;
    this.destinationGain = null;
    this.ctx = null;
  }
}
