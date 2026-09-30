import type { AccessLevel } from './roles';
import type { NewMentorCoach } from './auth';

// The mentor coach shown on a row of the admin's user list.
export interface AdminUserCoach {
  id: string;
  firstName: string;
  lastName: string;
}

// One row of the admin's user list.
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  accessLevel: AccessLevel;
  confirmed: boolean;
  schoolId: string | null;
  schoolName: string | null;
  coach: AdminUserCoach | null;
  createdAt: string;
}

// Only the fields sent change.
export interface AdminUserUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  accessLevel?: AccessLevel;
  // Coach level and above only.
  schoolId?: string;
  // An existing coach or a new one, never both.
  coachId?: string;
  newCoach?: NewMentorCoach;
}

export interface AdminUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
}
