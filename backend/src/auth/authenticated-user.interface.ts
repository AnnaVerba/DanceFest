import { Role } from './roles.enum';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string;
  firstName?: string;
  lastName?: string;
}
