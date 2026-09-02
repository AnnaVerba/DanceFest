import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

/** Any freeform axis value works — NominationSetBuilder accepts arbitrary text (see frontend/src/lib/nominationSet.ts draftCategory). */
const COMPOSITION_AXIS_LABEL = 'Значення категорії «Склад»';
const PLACEHOLDER_COMPOSITION_VALUE = 'E2E Solo';

export class CategoryTemplateFormPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openNew(): Promise<void> {
    await this.goto(ROUTES.CATEGORY_TEMPLATE_NEW);
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByLabel('Назва шаблону *').fill(name);
  }

  /** Adds one "Склад" axis value and generates the resulting nomination set — the minimum needed for a valid submit. */
  async addOneCompositionValueAndGenerate(): Promise<void> {
    await this.page.getByLabel(COMPOSITION_AXIS_LABEL).fill(PLACEHOLDER_COMPOSITION_VALUE);
    await this.page.getByRole('button', { name: 'Додати значення' }).first().click();
    await this.page.getByRole('button', { name: 'Згенерувати номінації' }).click();
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: UI_TEXT.categoryTemplateForm.SUBMIT }).click();
  }

  serverErrorMessage() {
    return this.page.getByText(UI_TEXT.categoryTemplateForm.SERVER_ERROR_500);
  }
}
