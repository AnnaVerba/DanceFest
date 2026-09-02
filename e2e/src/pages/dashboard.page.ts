import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.DASHBOARD);
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.dashboard.HEADING, level: 1 });
  }

  competitionRow(name: string) {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  searchBox() {
    return this.page.getByRole('searchbox', { name: 'Пошук конкурсів' });
  }

  async searchFor(query: string): Promise<void> {
    await this.searchBox().fill(query);
  }

  noResultsMessage() {
    return this.page.getByText(UI_TEXT.dashboard.NO_RESULTS);
  }
}
