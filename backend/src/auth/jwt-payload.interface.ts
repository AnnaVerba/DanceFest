import { Role } from './roles.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  jti: string;
}
