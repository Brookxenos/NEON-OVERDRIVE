import * as THREE from 'three';

export class GameLoop {
  private readonly clock = new THREE.Clock();
  private readonly onTick: (dt: number) => void;
  private readonly isSoftwareGl: boolean;
  private readonly getGlContext: () => WebGL2RenderingContext;

  private frameId = 0;
  private running = false;
  private smoothedDt = 1 / 60;

  constructor(
    isSoftwareGl: boolean,
    getGlContext: () => WebGL2RenderingContext,
    onTick: (dt: number) => void,
  ) {
    this.isSoftwareGl = isSoftwareGl;
    this.getGlContext = getGlContext;
    this.onTick = onTick;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.tick();
  }

  public flushDelta(): void {
    this.clock.getDelta();
    this.smoothedDt = 1 / 60;
  }

  public stop(): void {
    this.running = false;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  }

  private tick = (): void => {
    if (!this.running) return;
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.isSoftwareGl ? rawDt : this.smoothedDt * 0.25 + rawDt * 0.75;
    this.smoothedDt = dt;
    this.onTick(dt);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = window.requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(callback: () => void): void {
    const gl = this.getGlContext();
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(callback, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(callback, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }
}
