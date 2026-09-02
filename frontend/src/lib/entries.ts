import { API_BASE_URL } from './api';
import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

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

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new EntryApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new EntryApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getEntries(competitionId: string): Promise<Entry[]> {
  return request<Entry[]>(`/competitions/${competitionId}/entries`);
}

export async function getEntriesCount(competitionId: string): Promise<number> {
  const response = await fetch(
    `${API_BASE_URL}/competitions/${competitionId}/entries/count`,
  );
  if (!response.ok) {
    throw new EntryApiError(
      'Не вдалося завантажити кількість заявок',
      response.status,
    );
  }
  const payload = (await response.json()) as { count: number };
  return payload.count;
}

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
