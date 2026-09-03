import { authorizedFetch } from './auth';
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
