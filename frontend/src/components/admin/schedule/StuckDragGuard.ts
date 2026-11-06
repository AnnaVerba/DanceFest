import type { DragCanceller } from './dragCanceller.types';
import {
  NO_BUTTONS_PRESSED,
  POINTER_MOVE_EVENT,
  WINDOW_BLUR_EVENT,
} from './stuckDragGuard.constants';

// Watches a pointer drag for a release that never arrived and cancels it, so
// the blocks do not stay "mid-drag" and ignore every later drag until reload.
// It is its own event listener, so one instance adds and removes itself.
export class StuckDragGuard implements EventListenerObject {
  private readonly target: EventTarget;
  private readonly canceller: DragCanceller;
  private watching = false;

  constructor(target: EventTarget, canceller: DragCanceller) {
    this.target = target;
    this.canceller = canceller;
  }

  // Only a drag a pointer started can lose its release: a keyboard drag has
  // no pointer, and the mouse moving past it must not cancel it.
  begin(activatorEvent: Event | null): void {
    if (this.watching || !(activatorEvent instanceof PointerEvent)) return;
    this.watching = true;
    this.target.addEventListener(WINDOW_BLUR_EVENT, this);
    this.target.addEventListener(POINTER_MOVE_EVENT, this);
  }

  end(): void {
    if (!this.watching) return;
    this.watching = false;
    this.target.removeEventListener(WINDOW_BLUR_EVENT, this);
    this.target.removeEventListener(POINTER_MOVE_EVENT, this);
  }

  handleEvent(event: Event): void {
    if (!this.isReleaseLost(event)) return;
    // Stop first: the cancel below ends the drag, which calls end() again.
    this.end();
    this.canceller.cancel();
  }

  // The window lost focus mid-drag, or the pointer moves with nothing pressed.
  private isReleaseLost(event: Event): boolean {
    if (event.type === WINDOW_BLUR_EVENT) return true;
    return (
      event instanceof PointerEvent && event.buttons === NO_BUTTONS_PRESSED
    );
  }
}
