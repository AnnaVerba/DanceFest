import { authorizedFetch } from './auth';
import type { CategoryType } from './categories';
import { GENERIC_REQUEST_ERROR_MESSAGE } from './api.constants';
import { CANNOT_CONNECT_TO_SERVER_MESSAGE } from './auth.constants';

export type ExitMode = 'single' | 'per_program';

// Ціна значення цінової осі («Дуо», «Дебют») у межах шаблону — помічник
// заповнення: з неї береться ціна при генерації номінацій. Точна ціна живе на
// самій номінації і правка осі вже згенерованих рядків не чіпає.
export interface TemplateCategoryPrice {
  categoryId: string;
  type: CategoryType;
  price: number;
}

export interface TemplateCategoryPriceInput {
  categoryId: string;
  price: number;
}

export interface TemplateNomination {
  id: string;
  name: string;
  // Власна ціна рядка. null — ціну не виставляли, діє ціна осі.
  price: number | null;
  // Ціна, що діє: власна, а якщо її немає — ціна складу або ліги. Саме вона
  // показується й саме вона їде в конкурс при імпорті.
  effectivePrice: number | null;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  specialName: string | null;
  exitMode: ExitMode;
  sortOrder: number;
}

export interface TemplateNominationInput {
  name: string;
  price?: number;
  allowsImprovisation?: boolean;
  categoryIds?: string[];
  isSpecial?: boolean;
  specialName?: string;
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
  allMedalLeagues: string[];
  forkedFromId: string | null;
  author: CategoryTemplateAuthor | null;
  createdAt: string;
  nominationsCount: number;
}

export interface CategoryTemplateDetail extends CategoryTemplate {
  categoryPrices: TemplateCategoryPrice[];
  nominations: TemplateNomination[];
}

export interface CategoryTemplateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  allMedalLeagues?: string[];
  categoryPrices?: TemplateCategoryPriceInput[];
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
    throw new CategoryTemplateApiError(CANNOT_CONNECT_TO_SERVER_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new CategoryTemplateApiError(
      extractMessage(payload, GENERIC_REQUEST_ERROR_MESSAGE),
      response.status,
    );
  }

  return payload as unknown as T;
}

export interface PagedCategoryTemplates {
  rows: CategoryTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

export function getCategoryTemplates(
  query: { page?: number; pageSize?: number; search?: string } = {},
): Promise<PagedCategoryTemplates> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.search?.trim()) params.set('search', query.search.trim());
  const suffix = params.toString() ? `?${params}` : '';
  return request<PagedCategoryTemplates>(`/category-templates${suffix}`);
}

export function getCategoryTemplate(id: string): Promise<CategoryTemplateDetail> {
  return request<CategoryTemplateDetail>(`/category-templates/${id}`);
}

// Header only — never loads the nomination rows, so it stays cheap for a
// large template. Used by the template detail page.
export function getCategoryTemplateMeta(id: string): Promise<CategoryTemplate> {
  return request<CategoryTemplate>(`/category-templates/${id}/meta`);
}

export interface PagedTemplateNominations {
  rows: TemplateNomination[];
  total: number;
  page: number;
  pageSize: number;
}

export function getCategoryTemplateNominations(
  id: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<PagedTemplateNominations> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  const suffix = params.toString() ? `?${params}` : '';
  return request<PagedTemplateNominations>(
    `/category-templates/${id}/nominations${suffix}`,
  );
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
