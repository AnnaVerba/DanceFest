export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
}
