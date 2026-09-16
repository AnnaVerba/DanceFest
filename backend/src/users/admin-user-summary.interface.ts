import { AccessLevel } from '../auth/access-level.enum';

// One row of the admin's user list.
export interface AdminUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  accessLevel: AccessLevel;
  confirmed: boolean;
  schoolName: string | null;
  createdAt: Date;
}
