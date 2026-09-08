import { authorizedFetch, getSession, refreshSession } from './auth';
import type { SetMentorCoachBody } from './auth';
import type { AccessLevel } from './roles';
import type { OrganizerSummary } from './organizerSummary';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

export interface MyProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  birthDate: string | null;
  accessLevel: AccessLevel;
  schoolId: string | null;
  schoolName: string | null;
  coachId: string | null;
  profileComplete: boolean;
}

// A mentor-coach choice plus, for a coach, the school they work at.
export type CompleteProfileBody = SetMentorCoachBody & { schoolId?: string };

export class UserApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

export async function getMyProfile(): Promise<MyProfile> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/me');
  } catch {
    throw new UserApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & MyProfile)
    | null;
  if (!response.ok) {
    const message = payload?.message
      ? Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message
      : GENERIC_REQUEST_ERROR_MESSAGE;
    throw new UserApiError(message, response.status);
  }
  return payload as MyProfile;
}

// Fill in the mandatory fields, then refresh the stored session so its
// schoolId / coachId are current (the completion gate reads them).
export async function completeProfile(
  body: CompleteProfileBody,
): Promise<void> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new UserApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ErrorPayload
      | null;
    const message = payload?.message
      ? Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message
      : GENERIC_REQUEST_ERROR_MESSAGE;
    throw new UserApiError(message, response.status);
  }
  await refreshSession();
}

export function organizerDisplayName(organizer: OrganizerSummary): string {
  return `${organizer.lastName} ${organizer.firstName}`.trim();
}

// Typeahead: [] until the caller sends 2+ letters.
export async function getSelectableOrganizers(
  q: string,
): Promise<OrganizerSummary[]> {
  if (q.trim().length < 2) return [];
  let response: Response;
  try {
    response = await authorizedFetch(
      `/users/organizers?q=${encodeURIComponent(q.trim())}`,
    );
  } catch {
    throw new UserApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  if (!response.ok) {
    throw new UserApiError(GENERIC_REQUEST_ERROR_MESSAGE, response.status);
  }
  return response.json() as Promise<OrganizerSummary[]>;
}

// Organizer names matching a typed query, with the current user's own name
// moved first when it matches.
export async function getOrganizerSuggestions(q: string): Promise<string[]> {
  const organizers = await getSelectableOrganizers(q);
  const names = organizers.map(organizerDisplayName);
  const selfId = getSession()?.profile.id;
  const selfIndex = organizers.findIndex((o) => o.id === selfId);
  if (selfIndex > 0) {
    const [self] = names.splice(selfIndex, 1);
    names.unshift(self);
  }
  return names;
}
