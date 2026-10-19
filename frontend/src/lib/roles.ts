import {
  ROLE_LABEL_JOINER,
  STUDIO_ROLE,
  STUDIO_ROLE_LABELS,
} from './studioRole.constants';
import type { StudioMember } from './studioRole.types';

// A single capability ladder. Higher levels can do everything below them.
export const ACCESS_LEVEL = {
  PARTICIPANT: 'PARTICIPANT',
  // Works in a studio under its head (COACH) and trains their own dancers.
  TRAINER: 'TRAINER',
  COACH: 'COACH',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;

export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  PARTICIPANT: 'Учасник',
  TRAINER: 'Тренер',
  COACH: 'Керівник',
  ORGANIZER: 'Організатор',
  ADMIN: 'Адмін',
};

const RANK: Record<AccessLevel, number> = {
  PARTICIPANT: 1,
  TRAINER: 2,
  COACH: 3,
  ORGANIZER: 4,
  ADMIN: 5,
};

export function meetsLevel(have: AccessLevel, need: AccessLevel): boolean {
  return RANK[have] >= RANK[need];
}

// Who trains under a mentor coach: participants, trainers and organizers.
// A studio head (COACH) is the top of their studio and an admin never has
// one.
const LEVELS_WITHOUT_MENTOR_COACH: AccessLevel[] = [
  ACCESS_LEVEL.COACH,
  ACCESS_LEVEL.ADMIN,
];

export function canHaveMentorCoach(level: AccessLevel): boolean {
  return !LEVELS_WITHOUT_MENTOR_COACH.includes(level);
}

// A trainer's mentor is their studio's head, set by the studio — they
// never pick one by hand.
export function canPickMentorCoach(level: AccessLevel): boolean {
  return canHaveMentorCoach(level) && level !== ACCESS_LEVEL.TRAINER;
}

// Levels a user can grant themselves (COACH only; ORGANIZER needs an
// admin-approved request, ADMIN is admin-granted).
export const SELF_UPGRADABLE_LEVELS: AccessLevel[] = [ACCESS_LEVEL.COACH];

// Studio staff — a trainer and a studio head: they keep a roster of their
// own dancers («Мої учасники»).
export function isStudioStaff(level: AccessLevel): boolean {
  return level === ACCESS_LEVEL.TRAINER || level === ACCESS_LEVEL.COACH;
}

// Works in a studio whatever the level: a trainer or head who became an
// organizer keeps their dancers and their «Мої учасники» (TASK-16).
export function hasStudioRole(member: StudioMember): boolean {
  return isStudioStaff(member.accessLevel) || !!member.studioRole;
}

// Heads a studio — also once they are an organizer.
export function isStudioHead(member: StudioMember): boolean {
  return member.studioRole === STUDIO_ROLE.HEAD;
}

// Trains in a studio under its head — also once they are an organizer.
export function isStudioTrainer(member: StudioMember): boolean {
  return member.studioRole === STUDIO_ROLE.TRAINER;
}

// «Тренер · Організатор» for an organizer who still trains; the plain level
// name for everyone else (a trainer is already «Тренер»).
export function roleLabel(member: StudioMember): string {
  const level = ACCESS_LEVEL_LABELS[member.accessLevel];
  if (!member.studioRole || isStudioStaff(member.accessLevel)) return level;
  return `${STUDIO_ROLE_LABELS[member.studioRole]}${ROLE_LABEL_JOINER}${level}`;
}
