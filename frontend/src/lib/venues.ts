import { API_BASE_URL } from './api';
import { getToken } from './auth';

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
    throw new VenueApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new VenueApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getVenues(competitionId: string): Promise<Venue[]> {
  return request<Venue[]>(`/competitions/${competitionId}/venues`);
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
