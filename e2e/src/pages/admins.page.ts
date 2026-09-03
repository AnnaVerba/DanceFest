import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export interface NewAdminInput {
  name: string;
  email: string;
  password: string;
}

export class AdminsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.ADMINS);
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.admins.HEADING, level: 1 });
  }

  async createAdmin(input: NewAdminInput): Promise<void> {
    await this.page.getByLabel('ПІБ').fill(input.name);
    await this.page.getByLabel('Email').fill(input.email);
    await this.page.getByLabel('Пароль').fill(input.password);
    await this.page.getByRole('button', { name: UI_TEXT.admins.SUBMIT }).click();
  }

  successMessage(email: string) {
    return this.page.getByText(`Адміністратора ${email} створено.`);
  }

  errorMessage() {
    return this.page.locator('p').filter({ hasText: /Пароль має містити|Не вдалося створити/ });
  }
}
