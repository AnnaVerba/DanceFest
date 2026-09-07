import { authorizedFetch } from './auth';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { API_BASE_URL } from './api';

export class ApiError extends Error {
  status: number;
  // Whatever the backend put alongside `message` (e.g. the `assigned` list
  // a 409 carries). Callers that need it cast to the shape they expect.
  payload: unknown;

  constructor(message: string, status: number, payload: unknown = null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

function messageOf(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message)
    ? payload.message.join(', ')
    : payload.message;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & Record<string, unknown>)
    | null;
  if (!response.ok) {
    throw new ApiError(
      messageOf(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
      payload,
    );
  }
  return payload as unknown as T;
}

// Authenticated JSON call. Refreshes the token and redirects to login on
// its own (see authorizedFetch).
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  return parse<T>(response);
}

// Plain JSON call with no session — for endpoints a logged-out visitor
// may read (the public program, for one).
export async function publicRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }
  return parse<T>(response);
}
