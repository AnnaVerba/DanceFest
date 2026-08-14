import { API_BASE_URL } from './api';
import { getToken } from './auth';

export interface Judge {
  id: string;
  name: string;
  email: string;
  addedAt: string;
}

export interface CreatedJudge extends Judge {
  tempPassword: string;
}

export class JudgeApiError extends Error {
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

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...init?.headers,
      },
    });
  } catch {
    throw new JudgeApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  if (!response.ok) {
    throw new JudgeApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }
  return payload as unknown as T;
}

export function getJudges(competitionId: string): Promise<Judge[]> {
  return request<Judge[]>(`/competitions/${competitionId}/judges`);
}

export function createJudge(
  competitionId: string,
  name: string,
  email: string,
): Promise<CreatedJudge> {
  return request<CreatedJudge>(`/competitions/${competitionId}/judges`, {
    method: 'POST',
    body: JSON.stringify({ name: name.trim(), email: email.trim() }),
  });
}

export function deleteJudge(competitionId: string, judgeId: string): Promise<void> {
  return request(`/competitions/${competitionId}/judges/${judgeId}`, {
    method: 'DELETE',
  });
}
