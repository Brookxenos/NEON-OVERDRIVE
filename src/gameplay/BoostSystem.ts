import {
  BOOST_DRAIN_PER_SEC,
  BOOST_MAX,
  BOOST_MIN_ACTIVATION,
  BOOST_PASSIVE_REGEN_PER_SEC,
  PAD_BOOST_DURATION,
} from '../utils/Constants';

export class BoostSystem {
  private meter = BOOST_MAX;
  private manualHeld = false;
  private manualActive = false;
  private padTimer = 0;

  public reset(): void {
    this.meter = BOOST_MAX;
    this.manualHeld = false;
    this.manualActive = false;
    this.padTimer = 0;
  }

  public setManualHeld(held: boolean): boolean {
    this.manualHeld = held;
    if (held && !this.manualActive && this.meter >= BOOST_MIN_ACTIVATION) {
      this.manualActive = true;
      return true;
    }
    if (!held) {
      this.manualActive = false;
    }
    return false;
  }

  public activatePadBoost(): void {
    this.padTimer = PAD_BOOST_DURATION;
    this.addEnergy(24);
  }

  public addEnergy(amount: number): void {
    this.meter = Math.min(BOOST_MAX, this.meter + amount);
  }

  public isManualBoosting(): boolean {
    return this.manualActive;
  }

  public isPadBoosting(): boolean {
    return this.padTimer > 0;
  }

  public isAnyBoostActive(): boolean {
    return this.manualActive || this.padTimer > 0;
  }

  public getMeter(): number {
    return Math.round(this.meter);
  }

  public update(dt: number): boolean {
    let justActivated = false;

    if (this.padTimer > 0) {
      this.padTimer = Math.max(0, this.padTimer - dt);
    }

    if (this.manualHeld && this.meter > 0) {
      if (!this.manualActive && this.meter >= BOOST_MIN_ACTIVATION) {
        this.manualActive = true;
        justActivated = true;
      }
      if (this.manualActive) {
        this.meter = Math.max(0, this.meter - BOOST_DRAIN_PER_SEC * dt);
        if (this.meter <= 0) {
          this.manualActive = false;
        }
      }
    } else {
      this.manualActive = false;
      this.meter = Math.min(BOOST_MAX, this.meter + BOOST_PASSIVE_REGEN_PER_SEC * dt);
    }

    return justActivated;
  }
}
