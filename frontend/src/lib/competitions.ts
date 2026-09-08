import { API_BASE_URL } from './api';
import { authorizedFetch } from './auth';
import { COMPETITION_STATUS } from './competitionStatus';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import {
  COMPETITION_SAVE_FAILED_MESSAGE,
  COMPETITION_DELETE_FAILED_MESSAGE,
} from './competitions.constants';
import type { CompetitionStatus } from './competitionStatus';
import type { PaymentDetails } from './paymentDetails';

export interface CompetitionOwner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Competition {
  id: string;
  image: string | null;
  name: string;
  description: string;
  location: string;
  organizers: string[];
  dateFrom: string;
  dateTo: string;
  registrationFrom: string;
  registrationTo: string;
  contactNumber: string;
  contactEmail: string;
  paymentDetails: PaymentDetails | null;
  ownerId: string;
  owner: CompetitionOwner | null;
}

export class CompetitionApiError extends Error {
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

export interface CompetitionsQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  year?: number;
}

export interface PagedCompetitions {
  rows: Competition[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getCompetitions(
  query: CompetitionsQuery = {},
): Promise<PagedCompetitions> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.year != null) params.set('year', String(query.year));
  const suffix = params.toString() ? `?${params}` : '';
  const response = await fetch(`${API_BASE_URL}/competitions${suffix}`);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити конкурси');
  }
  return response.json() as Promise<PagedCompetitions>;
}

export async function getCompetitionYears(): Promise<number[]> {
  const response = await fetch(`${API_BASE_URL}/competitions/years`);
  if (!response.ok) return [];
  return response.json() as Promise<number[]>;
}

export async function getCompetition(id: string): Promise<Competition> {
  const response = await fetch(`${API_BASE_URL}/competitions/${id}`);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити конкурс');
  }
  return response.json() as Promise<Competition>;
}

export interface CompetitionInput {
  image?: string;
  name: string;
  description: string;
  location: string;
  organizers: string[];
  dateFrom: string;
  dateTo: string;
  registrationFrom: string;
  registrationTo: string;
  contactNumber: string;
  contactEmail: string;
}

async function submitCompetition(
  path: string,
  method: 'POST' | 'PATCH',
  input: CompetitionInput,
): Promise<Competition> {
  let response: Response;
  try {
    response = await authorizedFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new CompetitionApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & Competition)
    | null;

  if (!response.ok) {
    throw new CompetitionApiError(
      extractMessage(payload, COMPETITION_SAVE_FAILED_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as Competition;
}

export function createCompetition(input: CompetitionInput): Promise<Competition> {
  return submitCompetition('/competitions', 'POST', input);
}

export function updateCompetition(
  id: string,
  input: CompetitionInput,
): Promise<Competition> {
  return submitCompetition(`/competitions/${id}`, 'PATCH', input);
}

export async function deleteCompetition(id: string): Promise<void> {
  let response: Response;
  try {
    response = await authorizedFetch(`/competitions/${id}`, { method: 'DELETE' });
  } catch {
    throw new CompetitionApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.ok) return;

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  throw new CompetitionApiError(
    extractMessage(payload, COMPETITION_DELETE_FAILED_MESSAGE),
    response.status,
  );
}

export function formatOrganizers(organizers: string[]): string {
  return organizers.join(', ');
}

export function getCompetitionStatus(c: Competition): CompetitionStatus {
  const now = new Date();
  const registrationFrom = new Date(c.registrationFrom);
  const registrationTo = new Date(c.registrationTo);
  const dateFrom = new Date(c.dateFrom);
  const dateTo = new Date(c.dateTo);

  if (now < registrationFrom) return COMPETITION_STATUS.PLANNED;
  if (now <= registrationTo) return COMPETITION_STATUS.REGISTRATION_OPEN;
  if (now < dateFrom) return COMPETITION_STATUS.REGISTRATION_CLOSED;
  if (now <= dateTo) return COMPETITION_STATUS.ONGOING;
  return COMPETITION_STATUS.FINISHED;
}

export const APPLY_BLOCKED_COMPETITION_OVER =
  'Конкурс завершено — подання заявок закрите.';
export const APPLY_BLOCKED_REGISTRATION_OVER =
  'Реєстрацію на цей конкурс закрито.';

// Deadlines are whole calendar days — dates are stored without a time. A
// day counts as "passed" once the current UTC date is strictly after it,
// so the deadline day itself is still open.
function dayHasPassed(dateStr: string): boolean {
  return new Date().toISOString().slice(0, 10) > String(dateStr).slice(0, 10);
}

export interface ApplyEligibility {
  allowed: boolean;
  /** User-facing reason when not allowed. */
  reason: string | null;
}

// Can this actor still start / submit an application to this competition?
// - competition day passed → no one (organizers included)
// - registration day passed → only organizers / admins
export function getApplyEligibility(
  c: Pick<Competition, 'registrationTo' | 'dateTo'>,
  opts: { isOrganizer: boolean },
): ApplyEligibility {
  if (dayHasPassed(c.dateTo)) {
    return { allowed: false, reason: APPLY_BLOCKED_COMPETITION_OVER };
  }
  if (dayHasPassed(c.registrationTo) && !opts.isOrganizer) {
    return { allowed: false, reason: APPLY_BLOCKED_REGISTRATION_OVER };
  }
  return { allowed: true, reason: null };
}
