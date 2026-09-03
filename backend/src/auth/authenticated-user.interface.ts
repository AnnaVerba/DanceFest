import { AccessLevel } from './access-level.enum';

export interface AuthenticatedUser {
  id: string;
  accessLevel: AccessLevel;
  email: string;
  firstName?: string;
  lastName?: string;
}
