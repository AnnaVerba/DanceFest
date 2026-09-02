import type { Role } from '../types/role.type';
import { ROUTES } from './routes.constants';

/** Ukrainian role tab labels shown on /login and /register, mirroring frontend/src/lib/roles.ts. */
export const ROLE_LABELS: Record<Role, string> = {
  PARTICIPANT: 'Учасник',
  COACH: 'Тренер',
  ORGANIZER: 'Організатор',
  ADMIN: 'Адмін',
};

/** Roles the /register page exposes as tabs (no self-service Admin registration). */
export const REGISTERABLE_ROLES: readonly Role[] = ['ORGANIZER', 'COACH', 'PARTICIPANT'];

/** Where each role lands after login, mirroring frontend/src/lib/roles.ts ROLE_CABINET_PATH. */
export const ROLE_CABINET_PATH: Record<Role, string> = {
  PARTICIPANT: ROUTES.PROFILE,
  COACH: ROUTES.COACH,
  ORGANIZER: ROUTES.DASHBOARD,
  ADMIN: ROUTES.DASHBOARD,
};
