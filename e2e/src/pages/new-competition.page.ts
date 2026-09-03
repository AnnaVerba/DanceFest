import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export interface CompetitionStep1Input {
  name: string;
  description: string;
  dateFrom: string;
  dateTo?: string;
  location: string;
  organizer: string;
  registrationFrom: string;
  registrationTo: string;
}

export interface CompetitionStep2Input {
  contactNumber: string;
  contactEmail: string;
}

export interface CompetitionStep3Input {
  recipient: string;
  account: string;
}

export class NewCompetitionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.NEW_COMPETITION);
  }

  heading() {
    return this.page.getByRole('heading', { name: UI_TEXT.wizard.HEADING, level: 1 });
  }

  /**
   * Step 1 fields are targeted by id rather than getByLabel: the banner
   * field's <label> incorrectly reuses `htmlFor="w-name"` (a pre-existing
   * duplicate-id bug in NewCompetitionPage.tsx), which makes the accessible
   * name of the actual #w-name input unreliable.
   */
  async fillStep1(input: CompetitionStep1Input): Promise<void> {
    await this.page.locator('#w-name').fill(input.name);
    await this.page.locator('#w-desc').fill(input.description);
    await this.page.locator('#w-date-from').fill(input.dateFrom);
    if (input.dateTo) {
      await this.page.locator('#w-date-to').fill(input.dateTo);
    }
    await this.page.locator('#w-place').fill(input.location);
    await this.page.locator('#w-org').fill(input.organizer);
    await this.page.locator('#w-from').fill(input.registrationFrom);
    await this.page.locator('#w-to').fill(input.registrationTo);
  }

  async fillStep2(input: CompetitionStep2Input): Promise<void> {
    await this.page.getByLabel('Контактний номер').fill(input.contactNumber);
    await this.page.getByLabel('Контактний email').fill(input.contactEmail);
  }

  async fillStep3(input: CompetitionStep3Input): Promise<void> {
    await this.page.getByLabel('Отримувач').fill(input.recipient);
    await this.page.getByLabel('Номер картки / IBAN').fill(input.account);
  }

  /**
   * Step 4: picks a specific category template by name from the dropdown
   * (default source is "Обрати готовий шаблон"). Options are labeled
   * "<name> (<nominationsCount>)" — matched here via its `value` (the
   * template id) rather than guessing the count.
   */
  async selectTemplate(templateId: string): Promise<void> {
    await this.page.getByLabel('Шаблон номінацій').selectOption(templateId);
  }

  nominationRow(name: string) {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  async goNext(): Promise<void> {
    await this.page.getByRole('button', { name: UI_TEXT.wizard.NEXT }).click();
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: UI_TEXT.wizard.SUBMIT }).click();
  }

  fieldErrorBanner() {
    return this.page.getByText(UI_TEXT.wizard.FIELD_ERROR_BANNER);
  }

  nameFieldError() {
    return this.page.getByText(UI_TEXT.wizard.NAME_REQUIRED);
  }

  currentStepTab(label: string) {
    return this.page.getByRole('tab', { name: new RegExp(label) });
  }
}
