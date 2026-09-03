import { apiFetch } from './api';
import { ROLE } from './roles';
import type { Role } from './roles';
import {
  SESSION_STORAGE_KEY,
  UNEXPECTED_SERVER_RESPONSE_MESSAGE,
  CANNOT_CONNECT_TO_SERVER_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  REGISTER_FAILED_MESSAGE,
  NO_STORED_REFRESH_TOKEN_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from './auth.constants';
import { HTTP_STATUS_UNAUTHORIZED } from './api.constants';

export interface ParticipantProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  coachId: string | null;
}

export interface CoachProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolId: string;
}

export interface OrganizerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

export type AuthProfile = ParticipantProfile | CoachProfile | OrganizerProfile | AdminProfile;

export interface Session {
  role: Role;
  accessToken: string;
  refreshToken: string;
  profile: AuthProfile;
}

export interface RegisterPayload {
  role: Role;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  schoolId?: string;
}

export class AuthError extends Error {}

interface ErrorPayload {
  message?: string | string[];
}

interface RawAuthResponse {
  accessToken: string;
  refreshToken: string;
  admin?: AdminProfile;
  user?: AuthProfile;
}

function extractErrorMessage(payload: ErrorPayload | null, fallback: string) {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

function toSession(role: Role, raw: RawAuthResponse): Session {
  const profile = role === ROLE.ADMIN ? raw.admin : raw.user;
  if (!profile) {
    throw new AuthError(UNEXPECTED_SERVER_RESPONSE_MESSAGE);
  }
  return {
    role,
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    profile,
  };
}

async function postAuth(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<RawAuthResponse> {
  let response: Response;
  try {
    response = await apiFetch(path, {
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

export async function login(
  email: string,
  password: string,
  role: Role,
): Promise<Session> {
  const raw = await postAuth(
    '/auth/login',
    { email, password, role },
    LOGIN_FAILED_MESSAGE,
  );
  return toSession(role, raw);
}

export async function register(payload: RegisterPayload): Promise<Session> {
  const raw = await postAuth(
    '/auth/register',
    payload,
    REGISTER_FAILED_MESSAGE,
  );
  return toSession(payload.role, raw);
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

// Used by pages that compare "is this record mine" (competition/template
// ownership) against the logged-in user, regardless of role — ADMIN and
// ORGANIZER both own competitions, so this can't be admin-only.
export function getCurrentUserId(): string | null {
  return getSession()?.profile.id ?? null;
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
    response = await apiFetch('/auth/refresh', {
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

  const session = toSession(current.role, payload as RawAuthResponse);
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
    apiFetch(path, {
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
