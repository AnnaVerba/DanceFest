import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class TeamPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(competitionId: string): Promise<void> {
    await this.goto(ROUTES.competitionTeam(competitionId));
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.team.HEADING, level: 1 });
  }

  onlyManagerMessage() {
    return this.page.getByText(UI_TEXT.team.ONLY_MANAGER_MESSAGE);
  }

  addAdminButton() {
    return this.page.getByRole('button', { name: UI_TEXT.team.ADD_ADMIN_BUTTON });
  }

  async openAddAdminModal(): Promise<void> {
    await this.addAdminButton().click();
  }

  private modal() {
    return this.page.getByRole('dialog', { name: UI_TEXT.team.MODAL_TITLE });
  }

  async inviteAdmin(email: string, name: string): Promise<void> {
    await this.modal().getByLabel('Email').fill(email);
    await this.modal().getByLabel('ПІБ').fill(name);
    await this.modal().getByRole('button', { name: UI_TEXT.team.MODAL_SUBMIT }).click();
  }

  invitationFieldError() {
    return this.modal().getByText('Введіть коректний email');
  }
}
