import { API_BASE_URL } from './api';
import { getToken } from './auth';

export type CategoryType =
  | 'participants_count'
  | 'age'
  | 'level'
  | 'direction'
  | 'discipline';

// Порядок той самий, у якому категорії показувались в редакторі шаблону
// до появи спільного довідника.
export const CATEGORY_TYPES: CategoryType[] = [
  'participants_count',
  'age',
  'level',
  'direction',
  'discipline',
];

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  participants_count: 'Кількість учасників',
  age: 'Вік',
  level: 'Рівень',
  direction: 'Напрямок',
  discipline: 'Дисципліна',
};

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  createdAt: string;
}

export class CategoryApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ErrorPayload {
  message?: string | string[];
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload?.message) return fallback;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...init?.headers,
      },
    });
  } catch {
    throw new CategoryApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new CategoryApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getCategories(type?: CategoryType): Promise<Category[]> {
  const query = type ? `?type=${type}` : '';
  return request<Category[]>(`/categories${query}`);
}

/**
 * Довідник спільний: бек повертає наявну категорію, якщо значення з такою
 * нормалізованою назвою вже є, і створює нову лише інакше.
 */
export function createCategory(name: string, type: CategoryType): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim(), type }),
  });
}
