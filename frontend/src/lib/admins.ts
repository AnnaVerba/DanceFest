import { authorizedFetch } from './auth';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';
import { ADMIN_CREATE_FAILED_MESSAGE } from './admins.constants';

export interface AdminSummary {
  id: string;
  name: string;
  email: string;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

export class AdminApiError extends Error {
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

export async function createAdmin(input: CreateAdminInput): Promise<AdminSummary> {
  let response: Response;
  try {
    response = await authorizedFetch('/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AdminApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorPayload & AdminSummary)
    | null;

  if (!response.ok) {
    throw new AdminApiError(
      extractMessage(payload, ADMIN_CREATE_FAILED_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as AdminSummary;
}
