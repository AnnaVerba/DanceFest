import type { APIRequestContext } from '@playwright/test';
import { BACKEND_BASE_URL } from '../constants/env.constants';

/** Thin wrapper around the category-templates REST endpoints, used only for test-data cleanup. */
export class CategoryTemplatesApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async delete(templateId: string, accessToken: string): Promise<void> {
    await this.request.delete(`${BACKEND_BASE_URL}/category-templates/${templateId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
