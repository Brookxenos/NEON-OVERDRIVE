export type CollectibleSoundType = 'energy_orb' | 'score_crystal' | 'boost_cell';

const MAX_ACTIVE_SFX_VOICES = 16;

interface TrackedSfxVoice {
  stopTime: number;
  release: () => void;
}

function clampFreq(freq: number): number {
  if (!Number.isFinite(freq)) return 440;
  return Math.max(24, Math.min(18000, freq));
}

function scheduleEnvelope(
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
  const safeFadeOutStart = Math.max(safeStart + safeAttack + 0.01, decayEndTime);
  const safeZeroTime = Math.max(safeFadeOutStart + 0.006, stopTime - 0.003);

  gainParam.setValueAtTime(0, safeStart);
  gainParam.linearRampToValueAtTime(safePeak, safeStart + safeAttack);
  gainParam.exponentialRampToValueAtTime(0.0006, safeFadeOutStart);
  gainParam.linearRampToValueAtTime(0, safeZeroTime);
}

export class SoundEffects {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private delaySend: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private readonly trackedVoices: TrackedSfxVoice[] = [];
  private lastCollectibleAt = -1;
  private lastLaneShiftAt = -1;
  private lastNearMissAt = -1;
  private lastUiClickAt = -1;
  private lastBoostAt = -1;
  private lastBackfireAt = -1;

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
    this.lastCollectibleAt = -1;
    this.lastLaneShiftAt = -1;
    this.lastNearMissAt = -1;
    this.lastUiClickAt = -1;
    this.lastBoostAt = -1;
    this.lastBackfireAt = -1;
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

  private canSchedule(minHeadroom = 1): boolean {
    if (!this.ctx || !this.outputNode || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (!Number.isFinite(now)) return false;
    this.sweepStaleVoices(now);
    return this.trackedVoices.length + minHeadroom <= MAX_ACTIVE_SFX_VOICES;
  }

  private trackVoice(
    node: AudioScheduledSourceNode,
    stopTime: number,
    cleanup: () => void,
  ): void {
    let released = false;
    const entry: TrackedSfxVoice = {
      stopTime,
      release: () => {
        if (released) return;
        released = true;
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
          // Ignore disconnect errors
        }
      },
    };
    this.trackedVoices.push(entry);
    node.onended = entry.release;
  }

  public playLaneShift(direction: -1 | 1): void {
    if (!this.canSchedule(1) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastLaneShiftAt >= 0 && now - this.lastLaneShiftAt < 0.05) return;
    this.lastLaneShiftAt = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = direction < 0 ? 329.63 : 293.66;
    const endFreq = direction < 0 ? 440.0 : 392.0;
    osc.frequency.setValueAtTime(clampFreq(startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(clampFreq(endFreq), now + 0.07);
    const stopAt = now + 0.095;
    scheduleEnvelope(gain.gain, now, 0.05, 0.005, now + 0.078, now + 0.09);

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

    this.trackVoice(osc, stopAt, () => {
      osc.disconnect();
      gain.disconnect();
      panner?.disconnect();
    });

    osc.start(now);
    osc.stop(stopAt);
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
    const subStop = now + 0.27;
    scheduleEnvelope(subEnv.gain, now, 0.035, 0.01, now + 0.24, subStop);
    sub.connect(subEnv);
    subEnv.connect(this.outputNode);
    this.trackVoice(sub, subStop, () => {
      sub.disconnect();
      subEnv.disconnect();
    });
    sub.start(now);
    sub.stop(subStop);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.26);
    const oscStop = now + 0.32;
    scheduleEnvelope(gain.gain, now, 0.018, 0.012, now + 0.28, oscStop);
    osc.connect(gain);
    gain.connect(this.outputNode);
    this.trackVoice(osc, oscStop, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(oscStop);

    if (this.noiseBuffer && this.trackedVoices.length < MAX_ACTIVE_SFX_VOICES) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1700, now + 0.28);
      const nGain = this.ctx.createGain();
      const nStop = now + 0.34;
      scheduleEnvelope(nGain.gain, now, 0.02, 0.012, now + 0.3, nStop);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      this.trackVoice(noise, nStop, () => {
        noise.disconnect();
        filter.disconnect();
        nGain.disconnect();
      });
      noise.start(now);
      noise.stop(nStop);
    }
  }

  public playBackfirePop(strength = 0.9): void {
    if (!this.canSchedule(2) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastBackfireAt >= 0 && now - this.lastBackfireAt < 0.14) return;
    this.lastBackfireAt = now;

    const clamped = Math.max(0.4, Math.min(1.25, strength));
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(118 * (0.9 + clamped * 0.12), now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.085);
    const thumpStop = now + 0.1;
    scheduleEnvelope(thumpGain.gain, now, 0.036 * clamped, 0.004, now + 0.08, thumpStop);
    thump.connect(thumpGain);
    thumpGain.connect(this.outputNode);
    this.trackVoice(thump, thumpStop, () => {
      thump.disconnect();
      thumpGain.disconnect();
    });
    thump.start(now);
    thump.stop(thumpStop);

    if (this.noiseBuffer && this.trackedVoices.length < MAX_ACTIVE_SFX_VOICES) {
      const crackle = this.ctx.createBufferSource();
      crackle.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.6;
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(210, now + 0.095);
      const cGain = this.ctx.createGain();
      const cStop = now + 0.11;
      scheduleEnvelope(cGain.gain, now, 0.042 * clamped, 0.003, now + 0.088, cStop);
      crackle.connect(filter);
      filter.connect(cGain);
      cGain.connect(this.outputNode);
      this.trackVoice(crackle, cStop, () => {
        crackle.disconnect();
        filter.disconnect();
        cGain.disconnect();
      });
      crackle.start(now);
      crackle.stop(cStop);
    }
  }

  public playCollectible(kind: CollectibleSoundType, multiplier: number): void {
    if (!this.canSchedule(2) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    if (this.lastCollectibleAt >= 0 && now - this.lastCollectibleAt < 0.055) return;
    this.lastCollectibleAt = now;

    const pitchScale = 1 + Math.min(Math.max(multiplier - 1, 0), 3) * 0.04;
    const base =
      kind === 'score_crystal' ? 659.25 : kind === 'boost_cell' ? 523.25 : 440.0;
    const peakGain =
      kind === 'score_crystal' ? 0.013 : kind === 'energy_orb' ? 0.014 : 0.016;

    const freqs =
      this.trackedVoices.length <= MAX_ACTIVE_SFX_VOICES - 2
        ? [base * pitchScale, base * 1.5 * pitchScale]
        : [base * pitchScale];

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.024;
      const stopAt = t + 0.095;
      osc.frequency.setValueAtTime(clampFreq(f), t);
      scheduleEnvelope(gain.gain, t, peakGain, 0.005, t + 0.075, stopAt);
      osc.connect(gain);
      gain.connect(this.outputNode);
      this.trackVoice(osc, stopAt, () => {
        osc.disconnect();
        gain.disconnect();
      });
      osc.start(t);
      osc.stop(stopAt);
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
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
    const stopAt = now + 0.185;
    scheduleEnvelope(gain.gain, now, 0.048, 0.006, now + 0.155, now + 0.175);
    osc.connect(gain);
    gain.connect(this.outputNode);
    this.trackVoice(osc, stopAt, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(stopAt);
  }

  public playCrash(): void {
    if (!this.ctx || !this.outputNode || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (!Number.isFinite(now)) return;
    this.sweepStaleVoices(now);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    const subStop = now + 0.62;
    scheduleEnvelope(subGain.gain, now, 0.34, 0.006, now + 0.58, subStop);
    sub.connect(subGain);
    subGain.connect(this.outputNode);
    this.trackVoice(sub, subStop, () => {
      sub.disconnect();
      subGain.disconnect();
    });
    sub.start(now);
    sub.stop(subStop);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.65);
      const nGain = this.ctx.createGain();
      const nStop = now + 0.72;
      scheduleEnvelope(nGain.gain, now, 0.32, 0.008, now + 0.68, nStop);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      if (this.delaySend) nGain.connect(this.delaySend);
      this.trackVoice(noise, nStop, () => {
        noise.disconnect();
        filter.disconnect();
        nGain.disconnect();
      });
      noise.start(now);
      noise.stop(nStop);
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
    const stopAt = now + 0.09;
    scheduleEnvelope(gain.gain, now, 0.085, 0.004, now + 0.075, stopAt);
    osc.connect(gain);
    gain.connect(this.outputNode);
    this.trackVoice(osc, stopAt, () => {
      osc.disconnect();
      gain.disconnect();
    });
    osc.start(now);
    osc.stop(stopAt);
  }

  public playMilestoneFanfare(): void {
    if (!this.canSchedule(3) || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const notes = [440.0, 523.25, 659.25, 880.0];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      const stopAt = t + 0.34;
      osc.frequency.setValueAtTime(clampFreq(freq), t);
      scheduleEnvelope(
        gain.gain,
        t,
        idx === notes.length - 1 ? 0.05 : 0.042,
        0.012,
        t + 0.3,
        t + 0.33,
      );
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      this.trackVoice(osc, stopAt, () => {
        osc.disconnect();
        gain.disconnect();
      });
      osc.start(t);
      osc.stop(stopAt);
    });
  }

  public dispose(): void {
    this.releaseAllVoices();
    this.ctx = null;
    this.outputNode = null;
    this.delaySend = null;
    this.noiseBuffer = null;
  }
}
