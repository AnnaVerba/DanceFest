// A single capability ladder. Higher levels can do everything below them.
export const ACCESS_LEVEL = {
  PARTICIPANT: 'PARTICIPANT',
  COACH: 'COACH',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;

export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  PARTICIPANT: 'Учасник',
  COACH: 'Тренер',
  ORGANIZER: 'Організатор',
  ADMIN: 'Адмін',
};

const RANK: Record<AccessLevel, number> = {
  PARTICIPANT: 1,
  COACH: 2,
  ORGANIZER: 3,
  ADMIN: 4,
};

export function meetsLevel(have: AccessLevel, need: AccessLevel): boolean {
  return RANK[have] >= RANK[need];
}

// Levels a user can grant themselves (COACH only; ORGANIZER needs an
// admin-approved request, ADMIN is admin-granted).
export const SELF_UPGRADABLE_LEVELS: AccessLevel[] = [ACCESS_LEVEL.COACH];
