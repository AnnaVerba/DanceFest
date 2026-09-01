export type Role = 'PARTICIPANT' | 'COACH' | 'ORGANIZER' | 'ADMIN';

export const ROLE_LABELS: Record<Role, string> = {
  PARTICIPANT: 'Учасник',
  COACH: 'Тренер',
  ORGANIZER: 'Організатор',
  ADMIN: 'Адмін',
};

export const REGISTERABLE_ROLES: Role[] = ['ORGANIZER', 'COACH', 'PARTICIPANT'];

export const LOGINABLE_ROLES: Role[] = ['PARTICIPANT', 'COACH', 'ORGANIZER', 'ADMIN'];
