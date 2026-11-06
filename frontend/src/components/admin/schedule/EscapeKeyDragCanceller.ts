import { CANCEL_KEY, KEY_DOWN_EVENT } from './stuckDragGuard.constants';
import type { DragCanceller } from './dragCanceller.types';

// dnd-kit's pointer sensor has no call that cancels its drag, but it cancels
// on Escape — so the cancel goes in through the key it already listens for,
// which also resets its internal state and the blocks' displacement.
export class EscapeKeyDragCanceller implements DragCanceller {
  private readonly target: Document;

  constructor(target: Document) {
    this.target = target;
  }

  cancel(): void {
    this.target.dispatchEvent(
      new KeyboardEvent(KEY_DOWN_EVENT, {
        key: CANCEL_KEY,
        code: CANCEL_KEY,
        bubbles: true,
      }),
    );
  }
}
