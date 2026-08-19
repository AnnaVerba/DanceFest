import { authorizedFetch } from './auth';

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
}

export interface PersonInput {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export type RegistrationStatus = 'draft' | 'submitted' | 'confirmed' | 'cancelled';
export type PerformanceRound = 'final' | 'semifinal';
export type PerformanceStatus = 'scheduled' | 'absent' | 'withdrawn';

export interface RegistrationPerformance {
  id: string;
  programName: string | null;
  round: PerformanceRound;
  status: PerformanceStatus;
}

export interface Registration {
  id: string;
  competitionId: string;
  nominationId: string;
  routineName: string | null;
  choreographer: string | null;
  studioName: string | null;
  city: string | null;
  improv: boolean;
  status: RegistrationStatus;
  coach: Person | null;
  submittedBy: Person | null;
  participants: Person[];
  performances: RegistrationPerformance[];
  createdAt: string;
}

export interface RegistrationInput {
  nominationId: string;
  routineName?: string;
  coach?: PersonInput;
  submittedBy?: PersonInput;
  choreographer?: string;
  studioName?: string;
  city?: string;
  improv?: boolean;
  participants: PersonInput[];
}

export class RegistrationApiError extends Error {
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
    throw new RegistrationApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new RegistrationApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function createRegistration(
  competitionId: string,
  input: RegistrationInput,
): Promise<Registration> {
  return request<Registration>(`/competitions/${competitionId}/registrations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getRegistrations(competitionId: string): Promise<Registration[]> {
  return request<Registration[]>(`/competitions/${competitionId}/registrations`);
}

export function updateRegistrationStatus(
  competitionId: string,
  registrationId: string,
  status: RegistrationStatus,
): Promise<Registration> {
  return request<Registration>(
    `/competitions/${competitionId}/registrations/${registrationId}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export function updatePerformanceStatus(
  competitionId: string,
  registrationId: string,
  performanceId: string,
  status: PerformanceStatus,
): Promise<Registration> {
  return request<Registration>(
    `/competitions/${competitionId}/registrations/${registrationId}/performances/${performanceId}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export function deleteRegistration(
  competitionId: string,
  registrationId: string,
): Promise<void> {
  return request(`/competitions/${competitionId}/registrations/${registrationId}`, {
    method: 'DELETE',
  });
}
