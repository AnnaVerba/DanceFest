import type { Page } from '@playwright/test';
import { FRONTEND_BASE_URL } from '../constants/env.constants';
import { SESSION_STORAGE_KEY } from '../constants/storage.constants';

/** Common navigation every page object needs; concrete pages extend this. */
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(`${FRONTEND_BASE_URL}${path}`);
  }

  async clearSession(): Promise<void> {
    await this.page.evaluate(() => window.localStorage.clear());
  }

  /** Reads the current user's access token straight out of the app's own session storage, for API-based test cleanup. */
  async getAccessToken(): Promise<string | null> {
    return this.page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return (JSON.parse(raw) as { accessToken: string }).accessToken;
    }, SESSION_STORAGE_KEY);
  }

  currentPath(): string {
    return new URL(this.page.url()).pathname;
  }
}
