import { authorizedFetch } from './auth';

export type ExitMode = 'single' | 'per_program';

export interface TemplateNomination {
  id: string;
  name: string;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  exitMode: ExitMode;
  sortOrder: number;
}

export interface TemplateNominationInput {
  name: string;
  allowsImprovisation?: boolean;
  categoryIds?: string[];
  isSpecial?: boolean;
  exitMode?: ExitMode;
  sortOrder?: number;
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
  forkedFromId: string | null;
  author: CategoryTemplateAuthor | null;
  createdAt: string;
  nominationsCount: number;
}

export interface CategoryTemplateDetail extends CategoryTemplate {
  nominations: TemplateNomination[];
}

export interface CategoryTemplateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  nominations: TemplateNominationInput[];
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

export function getCategoryTemplate(id: string): Promise<CategoryTemplateDetail> {
  return request<CategoryTemplateDetail>(`/category-templates/${id}`);
}

export function createCategoryTemplate(
  input: CategoryTemplateInput,
): Promise<CategoryTemplateDetail> {
  return request<CategoryTemplateDetail>('/category-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCategoryTemplate(
  id: string,
  input: Partial<CategoryTemplateInput>,
): Promise<CategoryTemplateDetail> {
  return request<CategoryTemplateDetail>(`/category-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function forkCategoryTemplate(
  id: string,
  name: string,
): Promise<CategoryTemplateDetail> {
  return request<CategoryTemplateDetail>(`/category-templates/${id}/fork`, {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  });
}

export function deleteCategoryTemplate(id: string): Promise<void> {
  return request(`/category-templates/${id}`, { method: 'DELETE' });
}
