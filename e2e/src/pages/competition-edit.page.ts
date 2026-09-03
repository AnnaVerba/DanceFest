import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class CompetitionEditPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(competitionId: string): Promise<void> {
    await this.goto(ROUTES.competitionEdit(competitionId));
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.competitionEdit.HEADING, level: 1 });
  }

  nameInput() {
    return this.page.getByLabel('Назва конкурсу');
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: UI_TEXT.competitionEdit.SUBMIT }).click();
  }
}
