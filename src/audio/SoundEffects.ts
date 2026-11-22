export type CollectibleSoundType = 'energy_orb' | 'score_crystal' | 'boost_cell';

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 440;
  return Math.max(24, Math.min(18000, freq));
}

function scheduleCleanEnvelope(
  gainParam: AudioParam,
  startTime: number,
  peak: number,
  attackSec: number,
  decayEndTime: number,
  stopTime: number,
): void {
  const safePeak = Math.max(0.001, Math.min(0.48, peak));
  const safeAttack = Math.max(0.003, attackSec);
  const safeFadeOutStart = Math.max(startTime + safeAttack + 0.01, decayEndTime);
  const safeZeroTime = Math.max(safeFadeOutStart + 0.006, stopTime - 0.003);

  gainParam.setValueAtTime(0, startTime);
  gainParam.linearRampToValueAtTime(safePeak, startTime + safeAttack);
  gainParam.exponentialRampToValueAtTime(0.0006, safeFadeOutStart);
  gainParam.linearRampToValueAtTime(0, safeZeroTime);
}

export class SoundEffects {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private delaySend: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

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
  }

  private canSchedule(): boolean {
    return (
      this.ctx !== null &&
      this.outputNode !== null &&
      this.ctx.state === 'running'
    );
  }

  public playLaneShift(direction: -1 | 1): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = direction < 0 ? 310 : 250;
    const endFreq = direction < 0 ? 520 : 430;
    osc.frequency.setValueAtTime(clampFreq(startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(clampFreq(endFreq), now + 0.075);
    scheduleCleanEnvelope(gain.gain, now, 0.09, 0.005, now + 0.082, now + 0.095);

    let panner: StereoPannerNode | null = null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = direction * 0.42;
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.outputNode);
    } else {
      osc.connect(gain);
      gain.connect(this.outputNode);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
        panner?.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };

    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playBoostActivate(): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subEnv = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.25);
    scheduleCleanEnvelope(subEnv.gain, now, 0.25, 0.008, now + 0.27, now + 0.3);
    sub.connect(subEnv);
    subEnv.connect(this.outputNode);
    sub.onended = () => {
      try {
        sub.disconnect();
        subEnv.disconnect();
      } catch {
        // Ignore
      }
    };
    sub.start(now);
    sub.stop(now + 0.3);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.32);
    scheduleCleanEnvelope(gain.gain, now, 0.12, 0.008, now + 0.36, now + 0.4);
    osc.connect(gain);
    gain.connect(this.outputNode);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    };
    osc.start(now);
    osc.stop(now + 0.4);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.6;
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(3100, now + 0.35);
      const nGain = this.ctx.createGain();
      scheduleCleanEnvelope(nGain.gain, now, 0.18, 0.01, now + 0.4, now + 0.44);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
          nGain.disconnect();
        } catch {
          // Ignore
        }
      };
      noise.start(now);
      noise.stop(now + 0.44);
    }
  }

  public playCollectible(kind: CollectibleSoundType, multiplier: number): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const pitchScale = 1 + Math.min(Math.max(multiplier - 1, 0), 7) * 0.055;
    const base =
      kind === 'score_crystal' ? 698.46 : kind === 'boost_cell' ? 523.25 : 587.33;

    const freqs = [base * pitchScale, base * 1.25 * pitchScale, base * 1.5 * pitchScale];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 2 ? 'sine' : 'triangle';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(clampFreq(f), t);
      scheduleCleanEnvelope(gain.gain, t, 0.1, 0.005, t + 0.21, t + 0.24);
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Ignore
        }
      };
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playNearMiss(): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1080, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.16);
    scheduleCleanEnvelope(gain.gain, now, 0.1, 0.005, now + 0.165, now + 0.185);
    osc.connect(gain);
    gain.connect(this.outputNode);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    };
    osc.start(now);
    osc.stop(now + 0.185);
  }

  public playCrash(): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    scheduleCleanEnvelope(subGain.gain, now, 0.36, 0.006, now + 0.58, now + 0.62);
    sub.connect(subGain);
    subGain.connect(this.outputNode);
    sub.onended = () => {
      try {
        sub.disconnect();
        subGain.disconnect();
      } catch {
        // Ignore
      }
    };
    sub.start(now);
    sub.stop(now + 0.62);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.65);
      const nGain = this.ctx.createGain();
      scheduleCleanEnvelope(nGain.gain, now, 0.34, 0.008, now + 0.68, now + 0.72);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      if (this.delaySend) nGain.connect(this.delaySend);
      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
          nGain.disconnect();
        } catch {
          // Ignore
        }
      };
      noise.start(now);
      noise.stop(now + 0.72);
    }
  }

  public playUiClick(confirm = false): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(confirm ? 560 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(confirm ? 880 : 540, now + 0.065);
    scheduleCleanEnvelope(gain.gain, now, 0.1, 0.004, now + 0.075, now + 0.09);
    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    };
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playMilestoneFanfare(): void {
    if (!this.canSchedule() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(clampFreq(freq), t);
      scheduleCleanEnvelope(
        gain.gain,
        t,
        idx === notes.length - 1 ? 0.13 : 0.11,
        0.012,
        t + 0.31,
        t + 0.34,
      );
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Ignore
        }
      };
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }
}
