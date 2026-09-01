import { authorizedFetch } from './auth';

import type { ExitMode } from './categoryTemplates';

export type { ExitMode };

export interface NominationProgram {
  id: string;
  name: string;
}

export interface NominationExit {
  programId: string | null;
  programName: string | null;
  label: string;
  durationLimitSeconds: number | null;
}

export interface Nomination {
  id: string;
  templateId: string | null;
  name: string;
  price: number | null;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  exitMode: ExitMode;
  durationLimitSeconds: number | null;
  programLimits: Record<string, number>;
  programs: NominationProgram[];
  exits: NominationExit[];
  createdAt: string;
}

export interface NominationInput {
  // Шаблон, з якого згенерована номінація: за ним сервер розуміє, що шаблон
  // зайнятий, і не дає його видалити.
  templateId?: string;
  name: string;
  price?: number;
  allowsImprovisation?: boolean;
  categoryIds?: string[];
  isSpecial?: boolean;
  exitMode?: ExitMode;
  durationLimitSeconds?: number;
  programLimits?: Record<string, number>;
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
  input: NominationInput,
): Promise<Nomination> {
  return request<Nomination>(`/competitions/${competitionId}/nominations`, {
    method: 'POST',
    body: JSON.stringify({ ...input, name: input.name.trim() }),
  });
}

export function updateNomination(
  competitionId: string,
  nominationId: string,
  input: Partial<NominationInput>,
): Promise<Nomination> {
  return request<Nomination>(
    `/competitions/${competitionId}/nominations/${nominationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        input.name === undefined ? input : { ...input, name: input.name.trim() },
      ),
    },
  );
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
