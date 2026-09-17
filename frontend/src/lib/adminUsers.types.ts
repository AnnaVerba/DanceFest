import type { AccessLevel } from './roles';

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
  schoolName: string | null;
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
}

export interface AdminUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
}
