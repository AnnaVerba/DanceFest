import { API_BASE_URL } from './api';
import {
  GENERIC_REQUEST_ERROR_MESSAGE,
  HTTP_STATUS_UNAUTHORIZED,
} from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import {
  JUDGE_TOKEN_STORAGE_KEY,
  JUDGE_PROFILE_STORAGE_KEY,
} from './judgeAuth.constants';

export interface JudgeProfile {
  id: string;
  name: string;
  email: string;
  competitionId: string;
  competitionName: string;
}

export interface JudgeEntry {
  id: string;
  number: number;
  routineName: string;
  nomination: string;
  ageCategory: string | null;
  league: string | null;
  program: string | null;
  participantsCount: number | null;
  studioName: string | null;
  choreographer: string | null;
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

export function getJudgeToken(): string | null {
  return localStorage.getItem(JUDGE_TOKEN_STORAGE_KEY);
}

export function getStoredJudge(): JudgeProfile | null {
  const raw = localStorage.getItem(JUDGE_PROFILE_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as JudgeProfile) : null;
}

export function clearJudgeSession(): void {
  localStorage.removeItem(JUDGE_TOKEN_STORAGE_KEY);
  localStorage.removeItem(JUDGE_PROFILE_STORAGE_KEY);
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
    throw new JudgeAuthError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === HTTP_STATUS_UNAUTHORIZED) {
    clearJudgeSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/judge') {
      window.location.assign('/judge');
    }
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new JudgeAuthError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
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
  localStorage.setItem(JUDGE_TOKEN_STORAGE_KEY, data.accessToken);
  localStorage.setItem(JUDGE_PROFILE_STORAGE_KEY, JSON.stringify(data.judge));
  return data.judge;
}

export function getJudgeEntries(): Promise<JudgeEntry[]> {
  return request<JudgeEntry[]>('/judges/me/entries');
}

export function submitJudgeScore(entryId: string, value: number): Promise<void> {
  return request(`/judges/me/entries/${entryId}/score`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}
