import { API_BASE_URL } from './api';

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
  const response = await fetch(`${API_BASE_URL}/schools`);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити список шкіл');
  }
  return response.json() as Promise<School[]>;
}

export async function createSchool(name: string): Promise<School> {
  const response = await fetch(`${API_BASE_URL}/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json().catch(() => null)) as (ErrorPayload & School) | null;
  if (!response.ok) {
    throw new Error(extractMessage(payload, 'Не вдалося створити школу'));
  }
  return payload as unknown as School;
}
