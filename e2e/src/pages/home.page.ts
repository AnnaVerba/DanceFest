import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.HOME);
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.home.HEADING, level: 1 });
  }

  competitionCard(name: string) {
    return this.page.getByRole('link', { name: new RegExp(name) });
  }

  async openCompetition(name: string): Promise<void> {
    await this.competitionCard(name).click();
  }

  loginLink() {
    return this.page.getByRole('link', { name: 'Увійти' });
  }
}
