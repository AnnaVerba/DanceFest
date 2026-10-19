import { authorizedFetch } from './auth';
import { publicRequest } from './http';
import {
  SCHOOL_CREATE_FAILED_MESSAGE,
  SCHOOL_TYPEAHEAD_MIN_CHARS,
} from './schools.constants';

export interface School {
  id: string;
  name: string;
}

interface ErrorPayload {
  message?: string | string[];
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

// Typeahead: returns [] until the caller sends enough letters.
export async function searchSchools(q: string): Promise<School[]> {
  const query = q.trim();
  if (query.length < SCHOOL_TYPEAHEAD_MIN_CHARS) return [];
  // Public: the register page searches before there is a session.
  return publicRequest<School[]>(`/schools?q=${encodeURIComponent(query)}`);
}

export async function getSchool(id: string): Promise<School> {
  return publicRequest<School>(`/schools/${id}`);
}

export async function createSchool(name: string): Promise<School> {
  const response = await authorizedFetch(`/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json().catch(() => null)) as (ErrorPayload & School) | null;
  if (!response.ok) {
    throw new Error(extractMessage(payload, SCHOOL_CREATE_FAILED_MESSAGE));
  }
  return payload as unknown as School;
}
