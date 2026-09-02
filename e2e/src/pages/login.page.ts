import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { ROLE_LABELS } from '../constants/roles.constants';
import { UI_TEXT } from '../constants/ui-text.constants';
import type { Role } from '../types/role.type';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.LOGIN);
  }

  async selectRole(role: Role): Promise<void> {
    await this.page.getByRole('tab', { name: ROLE_LABELS[role] }).click();
  }

  async login(email: string, password: string, role: Role): Promise<void> {
    await this.selectRole(role);
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Пароль').fill(password);
    await this.page.getByRole('button', { name: UI_TEXT.login.SUBMIT_IDLE }).click();
  }

  errorMessage() {
    return this.page.getByText(UI_TEXT.login.INVALID_CREDENTIALS);
  }
}
