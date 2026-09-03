import { API_BASE_URL } from './api';
import { ACCESS_LEVEL, meetsLevel } from './roles';
import type { AccessLevel } from './roles';
import {
  SESSION_STORAGE_KEY,
  UNEXPECTED_SERVER_RESPONSE_MESSAGE,
  CANNOT_CONNECT_TO_SERVER_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  LEVEL_UPGRADE_FAILED_MESSAGE,
  REGISTER_FAILED_MESSAGE,
  NO_STORED_REFRESH_TOKEN_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  OTP_VERIFY_FAILED_MESSAGE,
  OTP_RESEND_FAILED_MESSAGE,
} from './auth.constants';
import { HTTP_STATUS_UNAUTHORIZED } from './api.constants';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  birthDate: string | null;
  accessLevel: AccessLevel;
  schoolId: string | null;
  coachId: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  // The user's access level lives here only, on `profile.accessLevel` —
  // one source of truth.
  profile: UserProfile;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  birthDate: string;
  role: AccessLevel;
  schoolId?: string;
}

export interface OtpRequired {
  otpRequired: true;
  phone: string;
}

export class AuthError extends Error {}

interface ErrorPayload {
  message?: string | string[];
}

interface RawAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

function extractErrorMessage(payload: ErrorPayload | null, fallback: string) {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

function toSession(raw: RawAuthResponse): Session {
  if (!raw.user) {
    throw new AuthError(UNEXPECTED_SERVER_RESPONSE_MESSAGE);
  }
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    profile: raw.user,
  };
}

async function postAuth(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<RawAuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & RawAuthResponse)
    | null;

  if (!response.ok) {
    throw new AuthError(extractErrorMessage(payload, fallbackMessage));
  }

  return payload as RawAuthResponse;
}

// `login` accepts a phone number or an email. A password-less account
// (first login) gets `{ otpRequired, phone }` instead of a session.
export async function login(
  loginId: string,
  password: string,
): Promise<Session | OtpRequired> {
  const raw = await postAuth(
    '/auth/login',
    { login: loginId, password },
    LOGIN_FAILED_MESSAGE,
  );
  if ((raw as unknown as OtpRequired).otpRequired) {
    return raw as unknown as OtpRequired;
  }
  return toSession(raw);
}

export async function verifyOtp(
  loginId: string,
  code: string,
  password: string,
): Promise<Session> {
  const raw = await postAuth(
    '/auth/otp/verify',
    { login: loginId, code, password },
    OTP_VERIFY_FAILED_MESSAGE,
  );
  return toSession(raw);
}

export async function resendOtp(
  loginId: string,
): Promise<{ phone: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/otp/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginId }),
    });
  } catch {
    throw new AuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE);
  }
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { phone: string })
    | null;
  if (!response.ok) {
    throw new AuthError(
      extractErrorMessage(payload, OTP_RESEND_FAILED_MESSAGE),
    );
  }
  return payload as { phone: string };
}

export async function register(payload: RegisterPayload): Promise<Session> {
  const raw = await postAuth('/auth/register', payload, REGISTER_FAILED_MESSAGE);
  return toSession(raw);
}

// Climb the ladder (COACH or ORGANIZER). The access token carries the
// level, so refresh right after to pick up the change.
export async function upgradeLevel(
  level: AccessLevel,
  schoolId?: string,
): Promise<Session> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/me/level', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, schoolId }),
    });
  } catch {
    throw new AuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
    throw new AuthError(
      extractErrorMessage(payload, LEVEL_UPGRADE_FAILED_MESSAGE),
    );
  }
  return refreshSession();
}

export interface CoachSummary {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
}

export type SetMentorCoachBody =
  | { coachId: string }
  | { newCoach: { firstName: string; lastName: string; phone: string } };

export interface MentorCoach {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  schoolName: string | null;
  confirmed: boolean;
}

export async function getSelectableCoaches(): Promise<CoachSummary[]> {
  const response = await authorizedFetch('/users/coaches');
  if (!response.ok) {
    throw new AuthError(UNEXPECTED_SERVER_RESPONSE_MESSAGE);
  }
  return response.json() as Promise<CoachSummary[]>;
}

export async function getMyMentorCoach(): Promise<MentorCoach | null> {
  const response = await authorizedFetch('/users/me/coach');
  if (!response.ok) {
    throw new AuthError(UNEXPECTED_SERVER_RESPONSE_MESSAGE);
  }
  return response.json() as Promise<MentorCoach | null>;
}

export async function setMentorCoach(
  body: SetMentorCoachBody,
): Promise<{ coachId: string }> {
  const response = await authorizedFetch('/users/me/coach', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & { coachId: string })
    | null;
  if (!response.ok) {
    throw new AuthError(
      extractErrorMessage(payload, LEVEL_UPGRADE_FAILED_MESSAGE),
    );
  }
  return payload as { coachId: string };
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (parsed?.accessToken && parsed.refreshToken && parsed.profile) {
      return parsed as Session;
    }
  } catch {
    /* malformed — treated as logged out below */
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

// The organizer/admin management pages call this for the display name and
// as an "am I allowed here" check.
export function getStoredAdmin(): { id: string; name: string; email: string } | null {
  const session = getSession();
  if (
    !session ||
    !meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ORGANIZER)
  ) {
    return null;
  }
  const { profile } = session;
  return {
    id: profile.id,
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email ?? '',
  };
}

function getRefreshToken(): string | null {
  return getSession()?.refreshToken ?? null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function refreshSession(): Promise<Session> {
  const current = getSession();
  const refreshToken = current?.refreshToken;
  if (!current || !refreshToken) {
    throw new AuthError(NO_STORED_REFRESH_TOKEN_MESSAGE);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new AuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & RawAuthResponse)
    | null;
  if (!response.ok) {
    clearSession();
    throw new AuthError(extractErrorMessage(payload, SESSION_EXPIRED_MESSAGE));
  }

  const session = toSession(payload as RawAuthResponse);
  saveSession(session);
  return session;
}

let refreshInFlight: Promise<Session> | null = null;

function refreshOnce(): Promise<Session> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function redirectToLogin() {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const first = await send(getToken());
  if (first.status !== HTTP_STATUS_UNAUTHORIZED) return first;

  if (!getRefreshToken()) {
    redirectToLogin();
    throw new AuthError(SESSION_EXPIRED_MESSAGE);
  }

  try {
    const { accessToken } = await refreshOnce();
    return await send(accessToken);
  } catch {
    redirectToLogin();
    throw new AuthError(SESSION_EXPIRED_MESSAGE);
  }
}
