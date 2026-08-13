import { API_BASE_URL } from './api';
import { getToken } from './auth';

export interface CompetitionOwner {
  id: string;
  name: string;
}

export interface Competition {
  id: string;
  image: string | null;
  name: string;
  description: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  registrationFrom: string;
  registrationTo: string;
  contactNumber: string;
  contactEmail: string;
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

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCompetitions(): Promise<Competition[]> {
  const response = await fetch(`${API_BASE_URL}/competitions`);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити конкурси');
  }
  return response.json() as Promise<Competition[]>;
}

export async function deleteCompetition(id: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  } catch {
    throw new CompetitionApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.ok) return;

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  throw new CompetitionApiError(
    extractMessage(payload, 'Не вдалося видалити конкурс'),
    response.status,
  );
}

/** Бекенд не зберігає статус — рахуємо його з дат на льоту. */
export function getCompetitionStatus(c: Competition): string {
  const now = new Date();
  const registrationFrom = new Date(c.registrationFrom);
  const registrationTo = new Date(c.registrationTo);
  const dateFrom = new Date(c.dateFrom);
  const dateTo = new Date(c.dateTo);

  if (now < registrationFrom) return 'Заплановано';
  if (now <= registrationTo) return 'Реєстрація відкрита';
  if (now < dateFrom) return 'Реєстрація закрита';
  if (now <= dateTo) return 'Триває';
  return 'Завершено';
}
