import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

/** Arbitrary valid birth date — the form only requires a date, same placeholder as register.page.ts. */
const PLACEHOLDER_BIRTH_DATE = '2012-01-01';

export interface NewParticipantInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}

export class CoachCabinetPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.COACH);
  }

  /** Scoped to <main> — PublicTopBar's own cabinet nav link repeats this exact text. */
  eyebrow() {
    return this.page.locator('main').getByText(UI_TEXT.cabinets.COACH_EYEBROW);
  }

  async openCompetitionsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: UI_TEXT.cabinets.COACH_TAB_COMPETITIONS }).click();
  }

  async openParticipantsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: UI_TEXT.cabinets.COACH_TAB_PARTICIPANTS }).click();
  }

  noOpenCompetitionsMessage() {
    return this.page.getByText(UI_TEXT.cabinets.NO_OPEN_COMPETITIONS);
  }

  noParticipantsMessage() {
    return this.page.getByText(UI_TEXT.cabinets.NO_PARTICIPANTS);
  }

  /** Fills and submits the "Мої учасники" add-participant form; assumes that tab is already open. */
  async addParticipant(input: NewParticipantInput): Promise<void> {
    await this.page.getByLabel("Ім'я").fill(input.firstName);
    await this.page.getByLabel('Прізвище').fill(input.lastName);
    await this.page.getByLabel('Телефон').fill(input.phone);
    await this.page.getByLabel('Email').fill(input.email);
    await this.page.getByLabel('Дата народження').fill(PLACEHOLDER_BIRTH_DATE);
    await this.page.getByLabel('Пароль для входу учасника').fill(input.password);
    await this.page.getByRole('button', { name: UI_TEXT.cabinets.ADD_PARTICIPANT_BUTTON }).click();
  }

  participantRow(fullName: string) {
    return this.page.getByRole('row').filter({ hasText: fullName });
  }
}
