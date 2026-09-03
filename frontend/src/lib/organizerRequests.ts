import { authorizedFetch } from './auth';
import {
  ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  ORGANIZER_REQUEST_SUBMIT_FAILED_MESSAGE,
} from './organizerRequests.constants';

export type OrganizerRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrganizerRequest {
  id: string;
  userId: string;
  schoolId: string;
  note: string | null;
  status: OrganizerRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

interface ErrorPayload {
  message?: string | string[];
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & T)
    | null;
  if (!response.ok) {
    throw new Error(extractMessage(payload, fallback));
  }
  return payload as T;
}

export async function createOrganizerRequest(body: {
  schoolId: string;
  note?: string;
}): Promise<OrganizerRequest> {
  const response = await authorizedFetch('/organizer-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_SUBMIT_FAILED_MESSAGE,
  );
}

export async function getMyOrganizerRequests(): Promise<OrganizerRequest[]> {
  const response = await authorizedFetch('/organizer-requests/me');
  return readJson<OrganizerRequest[]>(
    response,
    ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  );
}

export async function listOrganizerRequests(
  status?: OrganizerRequestStatus,
): Promise<OrganizerRequest[]> {
  const query = status ? `?status=${status}` : '';
  const response = await authorizedFetch(`/organizer-requests${query}`);
  return readJson<OrganizerRequest[]>(
    response,
    ORGANIZER_REQUEST_LOAD_FAILED_MESSAGE,
  );
}

export async function reviewOrganizerRequest(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; decisionNote?: string },
): Promise<OrganizerRequest> {
  const response = await authorizedFetch(`/organizer-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  );
}

export async function cancelOrganizerRequest(
  id: string,
): Promise<OrganizerRequest> {
  const response = await authorizedFetch(`/organizer-requests/${id}/cancel`, {
    method: 'PATCH',
  });
  return readJson<OrganizerRequest>(
    response,
    ORGANIZER_REQUEST_REVIEW_FAILED_MESSAGE,
  );
}
