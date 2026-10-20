// Minimum name characters before the apply page runs a participant search —
// keeps the endpoint from ever being asked for the whole table.
export const PARTICIPANT_SEARCH_MIN_CHARS = 3;

// How long to wait after the last keystroke before firing the search.
export const PARTICIPANT_SEARCH_DEBOUNCE_MS = 300;

// /users/participants?scope=mine — the caller's own roster, also for an
// organizer who still trains (their plain list is a search over everyone).
export const ROSTER_SCOPE_PARAM = 'scope';
export const ROSTER_SCOPE_MINE = 'mine';
