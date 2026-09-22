import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { MAX_NOMINATIONS_PER_BULK_REQUEST } from './nominations.constants';

import type { ExitMode } from './categoryTemplates';
import type {
  AxisPriceInput,
  AxisPriceRow,
  AxisPriceUpdateResult,
  NominationAxes,
  NominationEntryFilter,
  NominationPageQuery,
  NominationUpdateInput,
  VenueSummaryGroupBy,
  VenueSummaryRow,
} from './nominations.types';
import { withPageParams } from './pagination';
import type { Paged } from './pagination';
import { LIST_QUERY_SEPARATOR } from './nominations.constants';

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

// Іменований числовий діапазон значення осі: для віку це межі віку, для
// складу — кількість людей у номері. rangeTo = null означає «без верхньої
// межі», обидві null — межі не задані.
export interface NominationCategoryRange {
  name: string;
  rangeFrom: number | null;
  rangeTo: number | null;
}

export interface Nomination {
  id: string;
  templateId: string | null;
  venueId: string | null;
  name: string;
  price: number | null;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  specialName: string | null;
  exitMode: ExitMode;
  durationLimitSeconds: number | null;
  durationOverridden: boolean;
  programLimits: Record<string, number>;
  programs: NominationProgram[];
  leagues: string[];
  lineups: NominationCategoryRange[];
  ageCategories: NominationCategoryRange[];
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
  specialName?: string;
  exitMode?: ExitMode;
  durationLimitSeconds?: number;
  programLimits?: Record<string, number>;
}

export class NominationApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Thrown by createNominationsBulk when one of its batches fails partway
// through: `created` is what the server already saved, `unsaved` is the
// failed batch plus every batch after it, so a caller can retry just that.
export class NominationsBulkPartialFailureError extends NominationApiError {
  created: Nomination[];
  unsaved: NominationInput[];
  constructor(
    message: string,
    status: number,
    created: Nomination[],
    unsaved: NominationInput[],
    code: string | null = null,
  ) {
    super(message, status, code);
    this.created = created;
    this.unsaved = unsaved;
  }
}

interface ErrorPayload {
  message?: string | string[];
  code?: string;
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
    throw new NominationApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new NominationApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
      payload?.code ?? null,
    );
  }

  return payload as unknown as T;
}

export function getNominations(
  competitionId: string,
  q?: string,
): Promise<Nomination[]> {
  const suffix = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return request<Nomination[]>(
    `/competitions/${competitionId}/nominations${suffix}`,
  );
}

// Осі конкурсу замість усіх його номінацій: випадні списки форми заявки
// будуються з десятка значень, а не з шести тисяч рядків.
export function getNominationAxes(
  competitionId: string,
): Promise<NominationAxes> {
  return request<NominationAxes>(`/competitions/${competitionId}/nominations/axes`);
}

// Спецномінації показуються всі й без фільтрів, тож їдуть окремо.
export function getSpecialNominations(
  competitionId: string,
): Promise<Nomination[]> {
  return request<Nomination[]>(
    `/competitions/${competitionId}/nominations/specials`,
  );
}

// Номінації під конкретний вибір заявника. Сервер сам перевіряє, що вікова
// категорія номінації підходить кожному учаснику номера.
export function getNominationsForEntry(
  competitionId: string,
  filter: NominationEntryFilter,
): Promise<Nomination[]> {
  const params = new URLSearchParams();
  if (filter.league) params.set('league', filter.league);
  if (filter.ageCategory) params.set('ageCategory', filter.ageCategory);
  if (filter.styles.length > 0) {
    params.set('styles', filter.styles.join(LIST_QUERY_SEPARATOR));
  }
  if (filter.lineups.length > 0) {
    params.set('lineups', filter.lineups.join(LIST_QUERY_SEPARATOR));
  }
  if (filter.ages.length > 0) {
    params.set('ages', filter.ages.join(LIST_QUERY_SEPARATOR));
  }
  return request<Nomination[]>(
    `/competitions/${competitionId}/nominations/for-entry?${params.toString()}`,
  );
}

export function getNominationsPage(
  competitionId: string,
  query: NominationPageQuery,
): Promise<Paged<Nomination>> {
  const params = withPageParams(new URLSearchParams(), query.page, query.pageSize);
  if (query.categoryIds.length > 0) {
    params.set('categoryIds', query.categoryIds.join(LIST_QUERY_SEPARATOR));
  }
  if (query.q.trim()) params.set('q', query.q.trim());
  if (query.venue) params.set('venue', query.venue);
  return request<Paged<Nomination>>(
    `/competitions/${competitionId}/nominations/paged?${params.toString()}`,
  );
}

export function getVenueSummary(
  competitionId: string,
  groupBy: VenueSummaryGroupBy,
): Promise<VenueSummaryRow[]> {
  return request<VenueSummaryRow[]>(
    `/competitions/${competitionId}/nominations/venue-summary?groupBy=${groupBy}`,
  );
}

// Ціни за складом і лігою в межах одного конкурсу — шаблон вони не чіпають.
export function getAxisPrices(competitionId: string): Promise<AxisPriceRow[]> {
  return request<AxisPriceRow[]>(
    `/competitions/${competitionId}/nominations/axis-prices`,
  );
}

export function setAxisPricesBulk(
  competitionId: string,
  prices: AxisPriceInput[],
): Promise<AxisPriceUpdateResult> {
  return request<AxisPriceUpdateResult>(
    `/competitions/${competitionId}/nominations/bulk-price`,
    { method: 'PATCH', body: JSON.stringify({ prices }) },
  );
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
  input: NominationUpdateInput,
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

// The server caps a single bulk-create request at MAX_NOMINATIONS_PER_BULK_REQUEST
// nominations, so a template with more than that is sent in sequential batches.
export async function createNominationsBulk(
  competitionId: string,
  nominations: NominationInput[],
): Promise<Nomination[]> {
  const created: Nomination[] = [];
  for (
    let start = 0;
    start < nominations.length;
    start += MAX_NOMINATIONS_PER_BULK_REQUEST
  ) {
    const batch = nominations.slice(start, start + MAX_NOMINATIONS_PER_BULK_REQUEST);
    try {
      const batchCreated = await request<Nomination[]>(
        `/competitions/${competitionId}/nominations/bulk`,
        {
          method: 'POST',
          body: JSON.stringify({
            nominations: batch.map((n) => ({
              ...n,
              name: n.name.trim(),
            })),
          }),
        },
      );
      created.push(...batchCreated);
    } catch (err) {
      throw new NominationsBulkPartialFailureError(
        err instanceof NominationApiError ? err.message : GENERIC_REQUEST_ERROR_MESSAGE,
        err instanceof NominationApiError ? err.status : 0,
        created,
        nominations.slice(start),
        err instanceof NominationApiError ? err.code : null,
      );
    }
  }
  return created;
}

export interface NominationBulkFilter {
  categoryIds?: string[];
  q?: string;
  // null matches nominations without a venue.
  venueId?: string | null;
}

// Either a hand-picked set of ids, or a filter the backend resolves itself —
// the filter is how "every improvisation nomination" reaches the server
// without listing hundreds of ids in the request body.
export type NominationBulkSelector =
  | { nominationIds: string[] }
  | { filter: NominationBulkFilter };

export function setImprovisationBulk(
  competitionId: string,
  selector: NominationBulkSelector,
  allowsImprovisation: boolean,
): Promise<Nomination[]> {
  return request<Nomination[]>(
    `/competitions/${competitionId}/nominations/bulk-improvisation`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...selector, allowsImprovisation }),
    },
  );
}

export function assignVenueBulk(
  competitionId: string,
  selector: NominationBulkSelector,
  venueId: string | null,
): Promise<Nomination[]> {
  return request<Nomination[]>(
    `/competitions/${competitionId}/nominations/bulk-venue`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...selector, venueId }),
    },
  );
}

export function deleteNomination(
  competitionId: string,
  nominationId: string,
): Promise<void> {
  return request(`/competitions/${competitionId}/nominations/${nominationId}`, {
    method: 'DELETE',
  });
}
