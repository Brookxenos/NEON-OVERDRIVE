export type CollectibleSoundType = 'energy_orb' | 'score_crystal' | 'boost_cell';

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

  public playLaneShift(direction: -1 | 1): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = direction < 0 ? 310 : 250;
    const endFreq = direction < 0 ? 520 : 430;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.075);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = direction * 0.45;
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.outputNode);
    } else {
      osc.connect(gain);
      gain.connect(this.outputNode);
    }

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBoostActivate(): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subEnv = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.25);
    subEnv.gain.setValueAtTime(0.28, now);
    subEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    sub.connect(subEnv);
    subEnv.connect(this.outputNode);
    sub.start(now);
    sub.stop(now + 0.3);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.32);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.outputNode);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.start(now);
    osc.stop(now + 0.4);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.6;
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.22, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      noise.start(now);
      noise.stop(now + 0.44);
    }
  }

  public playCollectible(kind: CollectibleSoundType, multiplier: number): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const pitchScale = 1 + Math.min(multiplier - 1, 7) * 0.055;
    const base =
      kind === 'score_crystal' ? 698.46 : kind === 'boost_cell' ? 523.25 : 587.33;

    const freqs = [base * pitchScale, base * 1.25 * pitchScale, base * 1.5 * pitchScale];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 2 ? 'sine' : 'triangle';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playNearMiss(): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1080, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.16);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.outputNode);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playCrash(): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sub.connect(subGain);
    subGain.connect(this.outputNode);
    sub.start(now);
    sub.stop(now + 0.62);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.65);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.4, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.outputNode);
      if (this.delaySend) nGain.connect(this.delaySend);
      noise.start(now);
      noise.stop(now + 0.72);
    }
  }

  public playUiClick(confirm = false): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(confirm ? 560 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(confirm ? 880 : 540, now + 0.065);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playMilestoneFanfare(): void {
    if (!this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.outputNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(idx === notes.length - 1 ? 0.14 : 0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(this.outputNode);
      if (this.delaySend) gain.connect(this.delaySend);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }
}
