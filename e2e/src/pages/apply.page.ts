import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';

export class ApplyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(competitionId: string): Promise<void> {
    await this.goto(ROUTES.competitionApply(competitionId));
  }

  async openWithNoCompetition(): Promise<void> {
    await this.goto('/apply');
  }

  titleInput() {
    return this.page.getByLabel('Назва номеру *');
  }

  nominationSelect() {
    return this.page.getByLabel('Номінація *');
  }

  async fillAndSubmit(routineName: string, nominationName: string): Promise<void> {
    await this.titleInput().fill(routineName);
    await this.nominationSelect().selectOption({ label: nominationName });
    await this.page.getByRole('button', { name: 'Надіслати заявку' }).click();
  }

  successMessage() {
    return this.page.getByText(/Заявку надіслано/);
  }

  chooseCompetitionMessage() {
    return this.page.getByRole('heading', { name: 'Оберіть конкурс' });
  }
}
