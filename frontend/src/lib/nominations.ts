import { authorizedFetch } from './auth';

export interface Nomination {
  id: string;
  name: string;
  price: number | null;
  allowsImprovisation: boolean;
  categoryIds: string[];
  createdAt: string;
}

export interface NominationInput {
  name: string;
  price?: number;
  allowsImprovisation?: boolean;
  categoryIds?: string[];
}

export class NominationApiError extends Error {
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
    throw new NominationApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new NominationApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getNominations(competitionId: string): Promise<Nomination[]> {
  return request<Nomination[]>(`/competitions/${competitionId}/nominations`);
}

export function createNomination(
  competitionId: string,
  name: string,
  price?: number,
): Promise<Nomination> {
  return request<Nomination>(`/competitions/${competitionId}/nominations`, {
    method: 'POST',
    body: JSON.stringify({ name: name.trim(), price }),
  });
}

export function createNominationsBulk(
  competitionId: string,
  nominations: NominationInput[],
): Promise<Nomination[]> {
  return request<Nomination[]>(`/competitions/${competitionId}/nominations/bulk`, {
    method: 'POST',
    body: JSON.stringify({
      nominations: nominations.map((n) => ({
        ...n,
        name: n.name.trim(),
      })),
    }),
  });
}

export function deleteNomination(
  competitionId: string,
  nominationId: string,
): Promise<void> {
  return request(`/competitions/${competitionId}/nominations/${nominationId}`, {
    method: 'DELETE',
  });
}
