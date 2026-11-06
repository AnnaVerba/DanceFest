// A pointer drag whose release never reaches the page (the window was
// switched away mid-drag, the button let go over the inspector) is not ended
// by dnd-kit: it resets only on pointerup, pointercancel, Escape, a resize or
// a hidden tab. These are the signals the guard reads to end it instead.
export const WINDOW_BLUR_EVENT = 'blur';
export const POINTER_MOVE_EVENT = 'pointermove';
export const KEY_DOWN_EVENT = 'keydown';
// The key dnd-kit's pointer sensor cancels a drag on.
export const CANCEL_KEY = 'Escape';
// PointerEvent.buttons while neither a button nor a finger is down.
export const NO_BUTTONS_PRESSED = 0;
