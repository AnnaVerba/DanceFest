import type { LINEUP_MODE } from './groupApply.constants';

// How a group's line-up is given: just its size, or the dancers one by one.
export type LineupMode = (typeof LINEUP_MODE)[keyof typeof LINEUP_MODE];
