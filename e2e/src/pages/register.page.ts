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
    await this.page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await this.page.getByLabel('Повторіть пароль').fill(account.password);
  }

  private async fillParticipantFields(): Promise<void> {
    await this.page.getByLabel('Дата народження').fill(PLACEHOLDER_BIRTH_DATE);
  }

  /** Creates a fresh school inline via "+ Немає потрібної школи — створити" — the flow QA confirmed working. */
  private async createSchoolInline(schoolName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Немає потрібної школи — створити' }).click();
    await this.page.getByPlaceholder('Назва школи/студії').fill(schoolName);
    await this.page.getByRole('button', { name: 'Додати' }).click();
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
    if (account.role === 'PARTICIPANT') {
      await this.fillParticipantFields();
    }
    if (account.role === 'COACH') {
      await this.createSchoolInline(`E2E School ${account.email}`);
    }
    await this.submit();
    await this.page.waitForURL(ROUTES.HOME);
  }

  passwordMismatchError() {
    return this.page.getByText(UI_TEXT.register.PASSWORD_MISMATCH);
  }
}
