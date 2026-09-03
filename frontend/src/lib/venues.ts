import { API_BASE_URL } from './api';
import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export class VenueApiError extends Error {
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
    throw new VenueApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new VenueApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as T;
}

// Venues are public — no session needed to view them.
export async function getVenues(competitionId: string): Promise<Venue[]> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/competitions/${competitionId}/venues`,
    );
  } catch {
    throw new VenueApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & Venue[])
    | null;
  if (!response.ok) {
    throw new VenueApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }
  return (payload ?? []) as Venue[];
}

export function createVenue(
  competitionId: string,
  name: string,
  description: string,
): Promise<Venue> {
  return request<Venue>(`/competitions/${competitionId}/venues`, {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      description: description.trim() || undefined,
    }),
  });
}

export function deleteVenue(competitionId: string, venueId: string): Promise<void> {
  return request(`/competitions/${competitionId}/venues/${venueId}`, {
    method: 'DELETE',
  });
}
