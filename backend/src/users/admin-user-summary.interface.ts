import { AccessLevel } from '../auth/access-level.enum';
import { AdminUserCoach } from './admin-user-coach.interface';

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
  schoolId: string | null;
  schoolName: string | null;
  coach: AdminUserCoach | null;
  createdAt: Date;
}
