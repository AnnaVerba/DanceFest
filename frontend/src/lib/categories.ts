import { authorizedFetch } from './auth';
import type { AgeRange } from './ageRange';

export type CategoryType = 'lineup' | 'age' | 'level' | 'style';

export const CATEGORY_TYPES: CategoryType[] = [
  'lineup',
  'age',
  'level',
  'style',
];

// Єдина вісь, значення якої несуть числові межі: з них сервер визначає
// вікову категорію учасника за датою народження.
export const AGE_CATEGORY_TYPE: CategoryType = 'age';

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  lineup: 'Склад',
  age: 'Вік',
  level: 'Ліга',
  style: 'Стиль',
};

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  ageFrom: number | null;
  ageTo: number | null;
  sortOrder: number;
  createdAt: string;
}

export const CATEGORY_API_BAD_REQUEST = 400;

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

export function createCategory(
  name: string,
  type: CategoryType,
  range?: AgeRange,
): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      type,
      ageFrom: range?.ageFrom,
      ageTo: range?.ageTo,
    }),
  });
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  ageFrom?: number;
  ageTo?: number;
}

export function createCategoriesBulk(
  categories: CreateCategoryInput[],
): Promise<Category[]> {
  return request<Category[]>('/categories/bulk', {
    method: 'POST',
    body: JSON.stringify({
      categories: categories.map((c) => ({
        name: c.name.trim(),
        type: c.type,
        ageFrom: c.ageFrom,
        ageTo: c.ageTo,
      })),
    }),
  });
}
