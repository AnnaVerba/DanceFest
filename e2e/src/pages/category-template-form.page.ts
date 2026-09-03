import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';
import { BACKEND_BASE_URL } from '../constants/env.constants';

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

  /** Switches the template to "Публічний" so other roles can see/use it (default is "Приватний"). */
  async makePublic(): Promise<void> {
    await this.page.getByRole('button', { name: 'Публічний' }).click();
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

  /** Submits and returns the created template's id from the POST response, for tests that need to reference it afterward (e.g. preselecting it in the wizard). */
  async submitAndGetId(): Promise<string> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url() === `${BACKEND_BASE_URL}/category-templates` && r.request().method() === 'POST',
      ),
      this.submit(),
    ]);
    const body = (await response.json()) as { id: string };
    return body.id;
  }

  serverErrorMessage() {
    return this.page.getByText(UI_TEXT.categoryTemplateForm.SERVER_ERROR_500);
  }
}
