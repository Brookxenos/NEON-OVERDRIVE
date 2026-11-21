export interface InputEvents {
  onLaneShift: (direction: -1 | 1) => void;
  onBoostChange: (active: boolean) => void;
  onThrottleChange: (active: boolean) => void;
  onBrakeChange: (active: boolean) => void;
  onPauseToggle: () => void;
  onInteraction: () => void;
}

export class KeyboardController {
  private readonly events: InputEvents;
  private boostHeld = false;

  constructor(events: InputEvents) {
    this.events = events;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.events.onInteraction();

    if (
      event.repeat &&
      (event.code === 'ArrowLeft' ||
        event.code === 'KeyA' ||
        event.code === 'ArrowRight' ||
        event.code === 'KeyD' ||
        event.code === 'Escape' ||
        event.code === 'KeyP')
    ) {
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.events.onLaneShift(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.events.onLaneShift(1);
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.events.onThrottleChange(true);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.events.onBrakeChange(true);
        break;
      case 'Space':
        event.preventDefault();
        if (!this.boostHeld) {
          this.boostHeld = true;
          this.events.onBoostChange(true);
        }
        break;
      case 'Escape':
      case 'KeyP':
        this.events.onPauseToggle();
        break;
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.events.onThrottleChange(false);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.events.onBrakeChange(false);
        break;
      case 'Space':
        this.boostHeld = false;
        this.events.onBoostChange(false);
        break;
    }
  };

  public reset(): void {
    this.boostHeld = false;
    this.events.onBoostChange(false);
    this.events.onThrottleChange(false);
    this.events.onBrakeChange(false);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
