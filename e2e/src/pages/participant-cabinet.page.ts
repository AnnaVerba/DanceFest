import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants/routes.constants';
import { UI_TEXT } from '../constants/ui-text.constants';

export class ParticipantCabinetPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ROUTES.PROFILE);
  }

  /** Scoped to <main> — PublicTopBar's own cabinet nav link repeats this exact text. */
  eyebrow() {
    return this.page.locator('main').getByText(UI_TEXT.cabinets.PARTICIPANT_EYEBROW);
  }

  noOpenCompetitionsMessage() {
    return this.page.getByText(UI_TEXT.cabinets.NO_OPEN_COMPETITIONS);
  }

  competitionCard(name: string) {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }

  applyLink(competitionName: string) {
    return this.competitionCard(competitionName).getByRole('link', {
      name: UI_TEXT.publicCompetition.APPLY_LINK,
    });
  }
}
