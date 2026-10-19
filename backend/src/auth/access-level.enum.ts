// A single capability ladder. Higher levels can do everything the levels
// below them can. Replaces the old disjoint Role set.
export enum AccessLevel {
  PARTICIPANT = 'PARTICIPANT',
  // Works in a studio under its head (COACH) and trains their own dancers.
  TRAINER = 'TRAINER',
  COACH = 'COACH',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export const ACCESS_LEVELS = [
  AccessLevel.PARTICIPANT,
  AccessLevel.TRAINER,
  AccessLevel.COACH,
  AccessLevel.ORGANIZER,
  AccessLevel.ADMIN,
] as const;

const RANK: Record<AccessLevel, number> = {
  [AccessLevel.PARTICIPANT]: 1,
  [AccessLevel.TRAINER]: 2,
  [AccessLevel.COACH]: 3,
  [AccessLevel.ORGANIZER]: 4,
  [AccessLevel.ADMIN]: 5,
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

// Studio staff — a trainer and a studio head. They belong to one studio and
// work only with their own roster; organizers and admins reach everyone.
const STUDIO_STAFF_LEVELS: AccessLevel[] = [
  AccessLevel.TRAINER,
  AccessLevel.COACH,
];

export function isStudioStaff(level: AccessLevel): boolean {
  return STUDIO_STAFF_LEVELS.includes(level);
}
