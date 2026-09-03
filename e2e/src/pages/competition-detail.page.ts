import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class CompetitionDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(competitionId: string): Promise<void> {
    await this.goto(ROUTES.competitionDetail(competitionId));
  }

  heading(name: string) {
    return this.page.getByRole('heading', { name, level: 1 });
  }

  async openTab(label: string): Promise<void> {
    await this.page.getByRole('tab', { name: label }).click();
  }

  editLink() {
    return this.page.getByRole('link', { name: UI_TEXT.competitionDetail.EDIT_LINK });
  }

  deleteButton() {
    return this.page.getByRole('button', { name: UI_TEXT.competitionDetail.DELETE_BUTTON });
  }

  async confirmDelete(): Promise<void> {
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: UI_TEXT.competitionDetail.DELETE_BUTTON })
      .click();
  }

  loadErrorMessage() {
    return this.page.getByText(UI_TEXT.competitionDetail.LOAD_ERROR);
  }

  /** Номінації tab: adds a plain (non-special) nomination via its inline form. */
  async addNomination(name: string): Promise<void> {
    await this.page.getByLabel('Назва номінації').fill(name);
    await this.page.getByRole('button', { name: 'Додати', exact: true }).click();
  }

  nominationRow(name: string) {
    return this.page.getByText(name, { exact: true });
  }

  /** Майданчики tab: adds a venue via its inline form. */
  async addVenue(name: string): Promise<void> {
    await this.page.getByLabel('Назва майданчика').fill(name);
    await this.page.getByRole('button', { name: 'Додати майданчик' }).click();
  }

  venueRow(name: string) {
    return this.page.getByText(name, { exact: true });
  }

  applyFormLink() {
    return this.page.getByRole('link', { name: 'Форма подачі заявки ↗' });
  }
}
