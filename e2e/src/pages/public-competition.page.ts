import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class PublicCompetitionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(competitionId: string): Promise<void> {
    await this.goto(ROUTES.competitionDetail(competitionId));
  }

  applyLink() {
    return this.page.getByRole('link', { name: UI_TEXT.publicCompetition.APPLY_LINK });
  }

  heading(name: string) {
    return this.page.getByRole('heading', { name, level: 1 });
  }
}
