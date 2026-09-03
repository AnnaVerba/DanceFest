import { apiFetch } from './api';
import {
  SCHOOLS_LOAD_FAILED_MESSAGE,
  SCHOOL_CREATE_FAILED_MESSAGE,
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

export async function getSchools(): Promise<School[]> {
  const response = await apiFetch('/schools');
  if (!response.ok) {
    throw new Error(SCHOOLS_LOAD_FAILED_MESSAGE);
  }
  return response.json() as Promise<School[]>;
}

export async function createSchool(name: string): Promise<School> {
  const response = await apiFetch('/schools', {
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
