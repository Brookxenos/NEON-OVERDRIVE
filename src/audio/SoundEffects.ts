export type CollectibleSoundType = 'energy_orb' | 'score_crystal' | 'boost_cell';

const MAX_ACTIVE_SFX_VOICES = 16;

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
  const safePeak = Math.max(0.001, Math.min(0.42, peak));
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

  private activeVoices = 0;
  private lastCollectibleAt = -1;
  private lastLaneShiftAt = -1;
  private lastNearMissAt = -1;
  private lastUiClickAt = -1;
  private lastBoostAt = -1;

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
    this.activeVoices = 0;
    this.lastCollectibleAt = -1;
    this.lastLaneShiftAt = -1;
    this.lastNearMissAt = -1;
    this.lastUiClickAt = -1;
    this.lastBoostAt = -1;
  }

  private canSchedule(minHeadroom = 1): boolean {
    return (
      this.ctx !== null &&
      this.outputNode !== null &&
      this.ctx.state === 'running' &&
      Number.isFinite(this.ctx.currentTime) &&
      this.activeVoices + minHeadroom <= MAX_ACTIVE_SFX_VOICES
    );
  }

  private trackVoice(node: AudioScheduledSourceNode, cleanup: () => void): void {
    this.activeVoices += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      try {
        cleanup();
      } catch {
        // Ignore disconnect errors
      }
    };
    node.onended = release;
  }

  public playLaneShift(direction: -1 | 1): void {
    if (!this.canSchedule(1) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastLaneShiftAt >= 0 && now - this.lastLaneShiftAt < 0.05) return;
    this.lastLaneShiftAt = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = direction < 0 ? 310 : 250;
    const endFreq = direction < 0 ? 520 : 430;
    osc.frequency.setValueAtTime(clampFreq(startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(clampFreq(endFreq), now + 0.075);
    scheduleCleanEnvelope(gain.gain, now, 0.085, 0.005, now + 0.082, now + 0.095);

    let panner: StereoPannerNode | null = null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.5, Math.min(0.5, direction * 0.42));
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.outputNode);
    } else {
      osc.connect(gain);
      gain.connect(this.outputNode);
    }

    this.trackVoice(osc, () => {
      osc.disconnect();
      gain.disconnect();
      panner?.disconnect();
    });

    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playBoostActivate(): void {
    if (!this.canSchedule(2) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastBoostAt >= 0 && now - this.lastBoostAt < 0.14) return;
    this.lastBoostAt = now;

    const sub = this.ctx.createOscillator();
    const subEnv = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(102, now);
    sub.frequency.exponentialRampToValueAtTime(44, now + 0.22);
    scheduleCleanEnvelope(subEnv.gain, now, 0.085, 0.01, now + 0.24, now + 0.27);
    sub.connect(subEnv);
    subEnv.connect(this.outputNode);
    this.trackVoice(sub, () => {
      sub.disconnect();
      subEnv.disconnect();
    });
    sub.start(now);
    sub.stop(now + 0.27);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.26);
    scheduleCleanEnvelope(gain.gain, now, 0.042, 0.012, now + 0.28, now + 0.32);
    osc.connect(gain);
    gain.connect(this.outputNode);
    this.trackVoice(osc, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(now + 0.32);

    if (this.noiseBuffer && this.activeVoices < MAX_ACTIVE_SFX_VOICES) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1700, now + 0.28);
      const nGain = this.ctx.createGain();
      scheduleCleanEnvelope(nGain.gain, now, 0.05, 0.012, now + 0.3, now + 0.34);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      this.trackVoice(noise, () => {
        noise.disconnect();
        filter.disconnect();
        nGain.disconnect();
      });
      noise.start(now);
      noise.stop(now + 0.34);
    }
  }

  public playCollectible(kind: CollectibleSoundType, multiplier: number): void {
    if (!this.canSchedule(2) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastCollectibleAt >= 0 && now - this.lastCollectibleAt < 0.05) return;
    this.lastCollectibleAt = now;

    const pitchScale = 1 + Math.min(Math.max(multiplier - 1, 0), 6) * 0.045;
    const base =
      kind === 'score_crystal' ? 659.25 : kind === 'boost_cell' ? 523.25 : 587.33;

    const freqs =
      this.activeVoices <= MAX_ACTIVE_SFX_VOICES - 2
        ? [base * pitchScale, base * 1.5 * pitchScale]
        : [base * pitchScale];

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.028;
      osc.frequency.setValueAtTime(clampFreq(f), t);
      scheduleCleanEnvelope(gain.gain, t, 0.036, 0.006, t + 0.12, t + 0.145);
      osc.connect(gain);
      gain.connect(this.outputNode);
      this.trackVoice(osc, () => {
        osc.disconnect();
        gain.disconnect();
      });
      osc.start(t);
      osc.stop(t + 0.145);
    });
  }

  public playNearMiss(): void {
    if (!this.canSchedule(1) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastNearMissAt >= 0 && now - this.lastNearMissAt < 0.13) return;
    this.lastNearMissAt = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1080, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.16);
    scheduleCleanEnvelope(gain.gain, now, 0.095, 0.005, now + 0.165, now + 0.185);
    osc.connect(gain);
    gain.connect(this.outputNode);
    if (this.delaySend) gain.connect(this.delaySend);
    this.trackVoice(osc, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(now + 0.185);
  }

  public playCrash(): void {
    if (!this.ctx || !this.outputNode || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    scheduleCleanEnvelope(subGain.gain, now, 0.34, 0.006, now + 0.58, now + 0.62);
    sub.connect(subGain);
    subGain.connect(this.outputNode);
    this.trackVoice(sub, () => {
      sub.disconnect();
      subGain.disconnect();
    });
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
      scheduleCleanEnvelope(nGain.gain, now, 0.32, 0.008, now + 0.68, now + 0.72);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      if (this.delaySend) nGain.connect(this.delaySend);
      this.trackVoice(noise, () => {
        noise.disconnect();
        filter.disconnect();
        nGain.disconnect();
      });
      noise.start(now);
      noise.stop(now + 0.72);
    }
  }

  public playUiClick(confirm = false): void {
    if (!this.canSchedule(1) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastUiClickAt >= 0 && now - this.lastUiClickAt < 0.035) return;
    this.lastUiClickAt = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(confirm ? 560 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(confirm ? 880 : 540, now + 0.065);
    scheduleCleanEnvelope(gain.gain, now, 0.095, 0.004, now + 0.075, now + 0.09);
    osc.connect(gain);
    gain.connect(this.outputNode);
    this.trackVoice(osc, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playMilestoneFanfare(): void {
    if (!this.canSchedule(3) || !this.ctx || !this.outputNode) return;
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
        idx === notes.length - 1 ? 0.12 : 0.1,
        0.012,
        t + 0.31,
        t + 0.34,
      );
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      this.trackVoice(osc, () => {
        osc.disconnect();
        gain.disconnect();
      });
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }
}
