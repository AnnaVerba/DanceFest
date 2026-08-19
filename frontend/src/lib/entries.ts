import { API_BASE_URL } from './api';
import { getToken } from './auth';

export interface Entry {
  id: string;
  nominationId: string | null;
  number: number;
  routineName: string;
  nomination: string;
  ageCategory: string | null;
  league: string | null;
  program: string | null;
  participantsCount: number | null;
  studioName: string | null;
  choreographer: string | null;
  city?: string | null;
  improv?: boolean;
  paymentMethod?: 'cash' | 'card' | null;
  score: number | null;
  scoresCount?: number;
  createdAt: string;
}

export interface EntryInput {
  routineName: string;
  nominationId: string;
  participantsCount?: number;
  studioName?: string;
  choreographer?: string;
  city?: string;
  improv?: boolean;
  paymentMethod?: 'cash' | 'card';
}

export class EntryApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
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
    throw new EntryApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new EntryApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getEntries(competitionId: string): Promise<Entry[]> {
  return request<Entry[]>(`/competitions/${competitionId}/entries`);
}

/**
 * Повертає масив: спецкатегорія з окремим виходом на кожну програму дає по
 * заявці на вихід, кожну зі своїм наскрізним номером.
 */
export function createEntry(
  competitionId: string,
  input: EntryInput,
): Promise<Entry[]> {
  return request<Entry[]>(`/competitions/${competitionId}/entries`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteEntry(competitionId: string, entryId: string): Promise<void> {
  return request(`/competitions/${competitionId}/entries/${entryId}`, {
    method: 'DELETE',
  });
}
