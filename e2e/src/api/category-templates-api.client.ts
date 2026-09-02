import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BACKEND_BASE_URL } from '../constants/env.constants';

/** Thin wrapper around the category-templates REST endpoints. */
export class CategoryTemplatesApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async delete(templateId: string, accessToken: string): Promise<void> {
    await this.request.delete(`${BACKEND_BASE_URL}/category-templates/${templateId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /**
   * Only used to probe the role check itself: RolesGuard runs before the
   * validation pipe, so a caller without ADMIN gets 403 before the (here,
   * intentionally incomplete) body would ever be validated.
   */
  create(accessToken: string): Promise<APIResponse> {
    return this.request.post(`${BACKEND_BASE_URL}/category-templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'E2E RBAC probe' },
    });
  }
}
