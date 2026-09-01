export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  [profileKey: string]: unknown;
}
