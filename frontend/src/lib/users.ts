import { authorizedFetch, getSession } from './auth';
import type { AccessLevel } from './roles';
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
}

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

export interface OrganizerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export function organizerDisplayName(organizer: OrganizerSummary): string {
  return `${organizer.lastName} ${organizer.firstName}`.trim();
}

export async function getSelectableOrganizers(): Promise<OrganizerSummary[]> {
  let response: Response;
  try {
    response = await authorizedFetch('/users/organizers');
  } catch {
    throw new UserApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  if (!response.ok) {
    throw new UserApiError(GENERIC_REQUEST_ERROR_MESSAGE, response.status);
  }
  return response.json() as Promise<OrganizerSummary[]>;
}

// Names to suggest in the organizers field, with the current user's own
// name moved first — they may not be an organizer of this particular
// competition, but picking themselves should be a click away.
export async function getOrganizerSuggestions(): Promise<string[]> {
  const organizers = await getSelectableOrganizers();
  const names = organizers.map(organizerDisplayName);
  const selfId = getSession()?.profile.id;
  const selfIndex = organizers.findIndex((o) => o.id === selfId);
  if (selfIndex > 0) {
    const [self] = names.splice(selfIndex, 1);
    names.unshift(self);
  }
  return names;
}
