export const ROLE = {
  PARTICIPANT: 'PARTICIPANT',
  COACH: 'COACH',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABELS: Record<Role, string> = {
  PARTICIPANT: 'Учасник',
  COACH: 'Тренер',
  ORGANIZER: 'Організатор',
  ADMIN: 'Адмін',
};

export const REGISTERABLE_ROLES: Role[] = ['ORGANIZER', 'COACH', 'PARTICIPANT'];

export const LOGINABLE_ROLES: Role[] = ['PARTICIPANT', 'COACH', 'ORGANIZER', 'ADMIN'];

// Where each role lands after login, and what to call that destination in nav
// links (PARTICIPANT/COACH get a personal cabinet; ORGANIZER/ADMIN share the
// competitions dashboard — neither of them has a personal profile page).
export const ROLE_CABINET_PATH: Record<Role, string> = {
  PARTICIPANT: '/profile',
  COACH: '/coach',
  ORGANIZER: '/dashboard',
  ADMIN: '/dashboard',
};

export const ROLE_CABINET_LABEL: Record<Role, string> = {
  PARTICIPANT: 'Кабінет учасника',
  COACH: 'Кабінет тренера',
  ORGANIZER: 'Дашборд',
  ADMIN: 'Дашборд',
};
