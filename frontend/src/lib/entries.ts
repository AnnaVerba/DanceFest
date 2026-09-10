import { API_BASE_URL } from './api';
import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { publicRequest } from './http';
import { withPageParams } from './pagination';
import type { Paged } from './pagination';

export interface Entry {
  id: string;
  nominationId: string | null;
  participantId: string | null;
  participantIds: string[];
  // One per dancer in `participantIds` order: the per-competition
  // participant number issued at registration, or null if that dancer
  // has none yet.
  participantNumbers: (number | null)[];
  number: number;
  routineName: string;
  nomination: string;
  ageCategory: string | null;
  league: string | null;
  program: string | null;
  participantsCount: number | null;
  lineup: string | null;
  studioName: string | null;
  choreographer: string | null;
  city?: string | null;
  improv?: boolean;
  paymentMethod?: 'cash' | 'card' | null;
  musicName?: string | null;
  musicUrl?: string | null;
  score: number | null;
  scoresCount?: number;
  createdAt: string;
}

export interface EntryInput {
  routineName?: string;
  nominationId: string;
  participantId?: string;
  participantIds?: string[];
  participantsCount?: number;
  studioName?: string;
  choreographer?: string;
  city?: string;
  improv?: boolean;
  paymentMethod?: 'cash' | 'card';
  musicName?: string;
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

export interface PagedEntries {
  rows: Entry[];
  total: number;
  page: number;
  pageSize: number;
}

export function getEntries(
  competitionId: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<PagedEntries> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  const suffix = params.toString() ? `?${params}` : '';
  return request<PagedEntries>(
    `/competitions/${competitionId}/entries${suffix}`,
  );
}

export interface MyEntry extends Entry {
  competitionId: string;
  competitionName: string | null;
  competitionDateFrom: string | null;
}

export function getMyEntries(): Promise<MyEntry[]> {
  return request<MyEntry[]>('/me/entries');
}

export interface TrackUploadResult {
  musicUrl: string;
  // Renamed per the competition's naming convention
  // (№_Ім'я_Прізвище_Ліга_Стиль), not the file's original name.
  fileName: string;
  durationSec: number;
  limitSec: number;
  overageSec: number;
}

// Uploads (or replaces) the actual audio file for one of the user's own
// entries and stores it in OCP object storage.
export async function uploadEntryTrack(
  entryId: string,
  file: File,
): Promise<TrackUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await authorizedFetch(`/entries/${entryId}/music`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new EntryApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (TrackUploadResult & ErrorPayload)
    | null;

  if (!response.ok) {
    throw new EntryApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as TrackUploadResult;
}

// The view-only row a logged-out visitor gets from the public listing — no
// payment method, choreographer, studio, city, or music file.
export interface PublicEntry {
  id: string;
  number: number;
  participantNumbers: (number | null)[];
  nomination: string;
  ageCategory: string | null;
  league: string | null;
  lineup: string | null;
  improv: boolean;
  hasMusic: boolean;
}

export function getPublicEntries(
  competitionId: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<Paged<PublicEntry>> {
  const params = withPageParams(new URLSearchParams(), query.page, query.pageSize);
  const suffix = params.toString() ? `?${params}` : '';
  return publicRequest<Paged<PublicEntry>>(
    `/competitions/${competitionId}/entries/public${suffix}`,
  );
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

// One application, many nominations: all inserted in a single transaction —
// if one fails, none are created.
export function createEntriesBulk(
  competitionId: string,
  inputs: EntryInput[],
): Promise<Entry[]> {
  return request<Entry[]>(`/competitions/${competitionId}/entries/bulk`, {
    method: 'POST',
    body: JSON.stringify({ entries: inputs }),
  });
}

export function deleteEntry(competitionId: string, entryId: string): Promise<void> {
  return request(`/competitions/${competitionId}/entries/${entryId}`, {
    method: 'DELETE',
  });
}
