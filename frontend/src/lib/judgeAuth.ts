import { API_BASE_URL } from './api';

export interface JudgeProfile {
  id: string;
  name: string;
  email: string;
  competitionId: string;
  competitionName: string;
}

export interface JudgePerformance {
  id: string;
  number: number;
  routineName: string | null;
  nomination: string;
  round: 'final' | 'semifinal';
  studioName: string | null;
  choreographer: string | null;
  participants: string[];
  score: number | null;
}

export class JudgeAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

const TOKEN_KEY = 'dansefest.judge.accessToken';
const PROFILE_KEY = 'dansefest.judge.profile';

export function getJudgeToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredJudge(): JudgeProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as JudgeProfile) : null;
}

export function clearJudgeSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

function judgeAuthHeaders(): HeadersInit {
  const token = getJudgeToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...judgeAuthHeaders(),
        ...init?.headers,
      },
    });
  } catch {
    throw new JudgeAuthError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 401) {
    clearJudgeSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/judge') {
      window.location.assign('/judge');
    }
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new JudgeAuthError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export async function judgeLogin(email: string, password: string): Promise<JudgeProfile> {
  const data = await request<{ accessToken: string; judge: JudgeProfile }>(
    '/judges/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data.judge));
  return data.judge;
}

export function getJudgePerformances(): Promise<JudgePerformance[]> {
  return request<JudgePerformance[]>('/judges/me/performances');
}

export function submitJudgeScore(performanceId: string, value: number): Promise<void> {
  return request(`/judges/me/performances/${performanceId}/score`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}
