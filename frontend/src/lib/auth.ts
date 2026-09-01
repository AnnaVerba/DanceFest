import { API_BASE_URL } from './api';
import type { Role } from './roles';

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
  const profile = role === 'ADMIN' ? raw.admin : raw.user;
  if (!profile) {
    throw new AuthError('Сервер повернув неочікувану відповідь');
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
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError("Не вдалося з'єднатися з сервером");
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
    'Не вдалося увійти. Перевірте email, пароль та роль.',
  );
  return toSession(role, raw);
}

export async function register(payload: RegisterPayload): Promise<Session> {
  const raw = await postAuth(
    '/auth/register',
    payload,
    'Не вдалося зареєструватися. Спробуйте ще раз.',
  );
  return toSession(payload.role, raw);
}

const SESSION_KEY = 'dansefest.session';

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

// Used by the existing admin-only pages (dashboard, competition management),
// which only ever run in an ADMIN session.
export function getStoredAdmin(): AdminProfile | null {
  const session = getSession();
  return session?.role === 'ADMIN' ? (session.profile as AdminProfile) : null;
}

function getRefreshToken(): string | null {
  return getSession()?.refreshToken ?? null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function refreshSession(): Promise<Session> {
  const current = getSession();
  const refreshToken = current?.refreshToken;
  if (!current || !refreshToken) {
    throw new AuthError('Немає збереженого refresh-токена');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new AuthError("Не вдалося з'єднатися з сервером");
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & RawAuthResponse)
    | null;
  if (!response.ok) {
    clearSession();
    throw new AuthError(extractErrorMessage(payload, 'Сесія закінчилась, увійдіть знову.'));
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
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const first = await send(getToken());
  if (first.status !== 401) return first;

  if (!getRefreshToken()) {
    redirectToLogin();
    throw new AuthError('Сесія закінчилась, увійдіть знову.');
  }

  try {
    const { accessToken } = await refreshOnce();
    return await send(accessToken);
  } catch {
    redirectToLogin();
    throw new AuthError('Сесія закінчилась, увійдіть знову.');
  }
}
