import { authorizedFetch } from './auth';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import {
  PARTICIPANTS_LOAD_FAILED_MESSAGE,
  PARTICIPANT_CREATE_FAILED_MESSAGE,
} from './participants.constants';

export interface ParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  coachId: string | null;
}

export interface CreateParticipantInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
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

export async function getMyParticipants(): Promise<ParticipantSummary[]> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/participants');
  } catch {
    throw new ParticipantApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & ParticipantSummary[])
    | null;

  if (!response.ok) {
    throw new ParticipantApiError(
      extractMessage(payload as ErrorPayload | null, PARTICIPANTS_LOAD_FAILED_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as ParticipantSummary[];
}

export async function createParticipant(
  input: CreateParticipantInput,
): Promise<ParticipantSummary> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ParticipantApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & ParticipantSummary)
    | null;

  if (!response.ok) {
    throw new ParticipantApiError(
      extractMessage(payload, PARTICIPANT_CREATE_FAILED_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as ParticipantSummary;
}
