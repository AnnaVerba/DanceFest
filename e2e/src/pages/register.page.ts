import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { ROLE_LABELS } from '../constants/roles.constants';
import { UI_TEXT } from '../constants/ui-text.constants';
import type { TestAccount } from '../types/test-account.interface';

/** Arbitrary valid birth date for PARTICIPANT registration; the form only requires a date. */
const PLACEHOLDER_BIRTH_DATE = '2000-01-01';

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.REGISTER);
  }

  async selectRole(role: TestAccount['role']): Promise<void> {
    await this.page.getByRole('tab', { name: ROLE_LABELS[role] }).click();
  }

  private async fillCommonFields(account: TestAccount): Promise<void> {
    await this.selectRole(account.role);
    await this.page.getByLabel("Ім'я").fill(account.firstName);
    await this.page.getByLabel('Прізвище').fill(account.lastName);
    await this.page.getByLabel('Телефон').fill(account.phone);
    await this.page.getByLabel('Email').fill(account.email);
    await this.page.getByLabel('Дата народження').fill(PLACEHOLDER_BIRTH_DATE);
    await this.page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await this.page.getByLabel('Повторіть пароль').fill(account.password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: UI_TEXT.register.SUBMIT_IDLE }).click();
  }

  /**
   * Registers the account and waits for the app's own post-register redirect
   * to "/" to land — the click only waits for the click itself, not for the
   * async register() call + saveSession() it kicks off, so callers that don't
   * wait for this would otherwise race a following navigation against it.
   */
  async registerAccount(account: TestAccount): Promise<void> {
    await this.fillCommonFields(account);
    await this.submit();
    await this.passProfileCompletionGate(account);
  }

  /**
   * A participant or coach is held on /complete-profile until the required
   * fields are set: a coach names their school and a mentor coach, a
   * participant just a mentor coach. Other roles land on the home page.
   */
  private async passProfileCompletionGate(account: TestAccount): Promise<void> {
    if (account.role !== 'PARTICIPANT' && account.role !== 'COACH') {
      await this.page.waitForURL(ROUTES.HOME);
      return;
    }
    await this.page.waitForURL(`**${ROUTES.COMPLETE_PROFILE}`);
    if (account.role === 'COACH') {
      await this.page
        .getByPlaceholder('…або впишіть нову назву')
        .fill(`E2E School ${account.email}`);
      // "exact" — MentorCoachPicker's "Додати нового" is also on this page.
      await this.page
        .getByRole('button', { name: 'Додати', exact: true })
        .click();
    }
    await this.page.getByRole('button', { name: 'Додати нового' }).click();
    const tag = `${Date.now()}`.slice(-7);
    await this.page.getByPlaceholder('Імʼя').fill('Ментор');
    await this.page.getByPlaceholder('Прізвище').fill(`Тренер${tag}`);
    await this.page.getByPlaceholder('Телефон').fill(`+38066${tag}`);
    await this.page
      .getByRole('button', { name: 'Зберегти та продовжити' })
      .click();
    await this.page.waitForURL(`**${ROUTES.PROFILE}`);
  }

  passwordMismatchError() {
    return this.page.getByText(UI_TEXT.register.PASSWORD_MISMATCH);
  }
}
