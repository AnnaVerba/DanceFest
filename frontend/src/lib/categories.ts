import { authorizedFetch } from './auth';
import type { AgeRange } from './ageRange';
import type { CategoryRange } from './categoryRange';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

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

// Вісь, значення якої — ліги (Дебют, Перші кроки, Професійна ліга).
export const LEAGUE_CATEGORY_TYPE: CategoryType = 'level';

// Вісь складу: Соло, Дуо, Тріо, Група. Її значення несуть кількість людей
// у номері — ту саму числову пару, що вік несе для вікової осі.
export const LINEUP_CATEGORY_TYPE: CategoryType = 'lineup';

// Вісь програм: Естрада, Хіп-хоп, Народний. Її значення — те, що заявка
// називає стилем.
export const STYLE_CATEGORY_TYPE: CategoryType = 'style';

// Осі, значення яких мають числові межі.
export const RANGED_CATEGORY_TYPES: CategoryType[] = [
  AGE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
];

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
  rangeFrom: number | null;
  rangeTo: number | null;
  sortOrder: number;
  // Пояснення для учасника у формі заявки; null — пояснення немає.
  description: string | null;
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
    throw new CategoryApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new CategoryApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
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
  range?: CategoryRange,
): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      type,
      rangeFrom: range?.rangeFrom,
      rangeTo: range?.rangeTo,
    }),
  });
}

export function updateCategoryAgeRange(
  id: string,
  range: AgeRange,
): Promise<Category> {
  return request<Category>(`/categories/${id}/age-range`, {
    method: 'PATCH',
    body: JSON.stringify(range),
  });
}

export function updateCategoryDescription(
  id: string,
  description: string | null,
): Promise<Category> {
  return request<Category>(`/categories/${id}/description`, {
    method: 'PATCH',
    body: JSON.stringify({ description }),
  });
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  rangeFrom?: number;
  rangeTo?: number;
  // Лише адмін: від решти сервер поле відхиляє.
  description?: string;
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
        rangeFrom: c.rangeFrom,
        rangeTo: c.rangeTo,
        description: c.description,
      })),
    }),
  });
}
