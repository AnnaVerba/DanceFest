import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from './api.constants';
import { reportServerError } from './serverError';

export const API_BASE_URL = 'http://localhost:4000';

// Single chokepoint for every request the app makes. Callers keep handling
// their own status codes and error messages as before; this only adds the
// one thing that must be the same everywhere: any 5xx pops the shared
// ServerErrorModal.
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (response.status >= HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    reportServerError();
  }
  return response;
}
