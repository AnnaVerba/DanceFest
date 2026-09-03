import { AccessLevel } from './access-level.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  accessLevel: AccessLevel;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  jti: string;
}
