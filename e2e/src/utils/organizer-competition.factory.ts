import type { APIRequestContext } from '@playwright/test';
import { TestAccountFactory } from './test-account.factory';
import { CompetitionsApiClient } from '../api/competitions-api.client';
import { OPEN_COMPETITION_DATES } from '../constants/test-data.constants';
import type { RegisterPage } from '../pages/register.page';
import type { TestAccount } from '../types/test-account.interface';

export interface OrganizerCompetitionFixture {
  organizer: TestAccount;
  competitionId: string;
}

/**
 * Registers a fresh Organizer via the UI (so `page`'s session is set to it)
 * and seeds one competition for it via the API — skipping the full 7-step
 * wizard, which has its own dedicated coverage
 * (tests/wizard/create-competition.spec.ts). Used by specs whose subject is a
 * downstream page (Team, Edit, Apply) that just needs a competition to exist.
 *
 * Deliberately does not set payment details — an Organizer-owned competition
 * currently 500s on that endpoint (see
 * tests/known-bugs/bug-5-organizer-payment-details-fk.spec.ts).
 */
export class OrganizerCompetitionFactory {
  static async create(
    registerPage: RegisterPage,
    request: APIRequestContext,
    competitionName: string,
  ): Promise<OrganizerCompetitionFixture> {
    const organizer = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(organizer);
    const accessToken = await registerPage.getAccessToken();

    const competition = await new CompetitionsApiClient(request).create(accessToken!, {
      name: competitionName,
      description: 'Створено e2e-тестом для перевірки сторінки конкурсу.',
      location: 'м. Одеса, Театр',
      organizer: `${organizer.firstName} ${organizer.lastName}`,
      dateFrom: OPEN_COMPETITION_DATES.DATE_FROM,
      dateTo: OPEN_COMPETITION_DATES.DATE_TO,
      registrationFrom: OPEN_COMPETITION_DATES.REGISTRATION_FROM,
      registrationTo: OPEN_COMPETITION_DATES.REGISTRATION_TO,
      contactNumber: organizer.phone,
      contactEmail: organizer.email,
    });

    return { organizer, competitionId: competition.id };
  }
}
