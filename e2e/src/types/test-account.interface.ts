import type { Role } from './role.type';

export interface TestAccount {
  role: Role;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}
