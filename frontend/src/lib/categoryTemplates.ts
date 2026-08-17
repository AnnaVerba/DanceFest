import { API_BASE_URL } from './api';
import { getToken } from './auth';

export interface CategoryTemplateAxis {
  name: string;
  values: string[];
}

export interface CategoryTemplateAuthor {
  id: string;
  name: string;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  axes: CategoryTemplateAxis[];
  author: CategoryTemplateAuthor | null;
  createdAt: string;
}

export interface CategoryTemplateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  axes: CategoryTemplateAxis[];
}

export class CategoryTemplateApiError extends Error {
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
    throw new CategoryTemplateApiError("Не вдалося з'єднатися з сервером", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new CategoryTemplateApiError(
      extractMessage(payload, 'Щось пішло не так. Спробуйте ще раз.'),
      response.status,
    );
  }

  return payload as unknown as T;
}

export function getCategoryTemplates(): Promise<CategoryTemplate[]> {
  return request<CategoryTemplate[]>('/category-templates');
}

export function createCategoryTemplate(
  input: CategoryTemplateInput,
): Promise<CategoryTemplate> {
  return request<CategoryTemplate>('/category-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteCategoryTemplate(id: string): Promise<void> {
  return request(`/category-templates/${id}`, { method: 'DELETE' });
}
