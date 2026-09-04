import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string;
  hasPassword: boolean;
  coachId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewParticipant {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
}

export class ParticipantApiError extends Error {
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
    throw new ParticipantApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new ParticipantApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as T;
}

// A name query is required for organizers (it searches every participant);
// a coach may omit it to get their full roster.
export function getParticipants(query?: string): Promise<Participant[]> {
  const q = query?.trim();
  const suffix = q ? `?q=${encodeURIComponent(q)}` : '';
  return request<Participant[]>(`/users/participants${suffix}`);
}

export function createParticipant(input: NewParticipant): Promise<Participant> {
  return request<Participant>('/users/participants', {
    method: 'POST',
    body: JSON.stringify({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      birthDate: input.birthDate,
    }),
  });
}
