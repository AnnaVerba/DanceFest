// A single capability ladder. Higher levels can do everything the levels
// below them can. Replaces the old disjoint Role set.
export enum AccessLevel {
  PARTICIPANT = 'PARTICIPANT',
  COACH = 'COACH',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export const ACCESS_LEVELS = [
  AccessLevel.PARTICIPANT,
  AccessLevel.COACH,
  AccessLevel.ORGANIZER,
  AccessLevel.ADMIN,
] as const;

const RANK: Record<AccessLevel, number> = {
  [AccessLevel.PARTICIPANT]: 1,
  [AccessLevel.COACH]: 2,
  [AccessLevel.ORGANIZER]: 3,
  [AccessLevel.ADMIN]: 4,
};

export function meetsLevel(have: AccessLevel, need: AccessLevel): boolean {
  return RANK[have] >= RANK[need];
}

export function isHigherLevel(a: AccessLevel, b: AccessLevel): boolean {
  return RANK[a] > RANK[b];
}

// Levels a user may grant themselves. ADMIN is only ever granted by an
// existing admin.
export const SELF_UPGRADABLE_LEVELS = [
  AccessLevel.COACH,
  AccessLevel.ORGANIZER,
];
