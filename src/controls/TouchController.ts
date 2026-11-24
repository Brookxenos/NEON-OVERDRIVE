import { InputEvents } from './KeyboardController';

export class TouchController {
  private readonly targetElement: HTMLElement;
  private readonly events: InputEvents;

  private startX = 0;
  private startY = 0;
  private tracking = false;
  private swipeConsumed = false;
  private boostHeld = false;

  constructor(targetElement: HTMLElement, events: InputEvents) {
    this.targetElement = targetElement;
    this.events = events;

    this.targetElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.targetElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.targetElement.addEventListener('touchend', this.handleTouchEnd);
    this.targetElement.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private handleTouchStart = (event: TouchEvent): void => {
    this.events.onInteraction();
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.tracking = true;
    this.swipeConsumed = false;
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.tracking || event.touches.length === 0) return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;

    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
      this.events.onLaneShift(dx > 0 ? 1 : -1);
      this.startX = touch.clientX;
      this.startY = touch.clientY;
    } else if (!this.swipeConsumed && dy < -34 && Math.abs(dy) > Math.abs(dx)) {
      event.preventDefault();
      this.setBoostHeld(true);
      this.swipeConsumed = true;
    }
  };

  private handleTouchEnd = (): void => {
    this.tracking = false;
    this.swipeConsumed = false;
    if (this.boostHeld) {
      this.setBoostHeld(false);
    }
  };

  public triggerLane(direction: -1 | 1): void {
    this.events.onInteraction();
    this.events.onLaneShift(direction);
  }

  public setBoostHeld(active: boolean): void {
    this.events.onInteraction();
    this.boostHeld = active;
    this.events.onBoostChange(active);
  }

  public reset(): void {
    this.boostHeld = false;
    this.tracking = false;
    this.swipeConsumed = false;
    this.events.onBoostChange(false);
  }

  public dispose(): void {
    this.targetElement.removeEventListener('touchstart', this.handleTouchStart);
    this.targetElement.removeEventListener('touchmove', this.handleTouchMove);
    this.targetElement.removeEventListener('touchend', this.handleTouchEnd);
    this.targetElement.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}
