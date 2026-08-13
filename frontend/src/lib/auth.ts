import { API_BASE_URL } from './api';

export interface AuthAdmin {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  admin: AuthAdmin;
}

export class AuthError extends Error {}

interface ErrorPayload {
  message?: string | string[];
}

function extractErrorMessage(payload: ErrorPayload | null, fallback: string) {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

async function postAuth(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<AuthResponse> {
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

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new AuthError(extractErrorMessage(payload, fallbackMessage));
  }

  return payload as unknown as AuthResponse;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return postAuth(
    '/auth/login',
    { email, password },
    'Не вдалося увійти. Перевірте email та пароль.',
  );
}

export function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return postAuth(
    '/auth/register',
    { name, email, password },
    'Не вдалося зареєструватися. Спробуйте ще раз.',
  );
}

const TOKEN_KEY = 'dansefest.accessToken';
const ADMIN_KEY = 'dansefest.admin';

export function saveSession({ accessToken, admin }: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredAdmin(): AuthAdmin | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  return raw ? (JSON.parse(raw) as AuthAdmin) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}
