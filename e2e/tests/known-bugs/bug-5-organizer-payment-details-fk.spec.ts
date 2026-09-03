import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { OPEN_COMPETITION_DATES } from '../../src/constants/test-data.constants';

/**
 * BUG-5 (found live while e2e-testing the competition wizard, 2026-09-03):
 * `payment_details.adminId` still has a hard DB foreign key to `admins`
 * (`backend/src/payment-details/payment-details.model.ts`), but
 * `PaymentDetailsService.upsert` unconditionally sets `adminId` to the
 * *requester's* id — which is an Organizer's id, not an Admin's, when an
 * Organizer owns the competition. `competitions.ownerId` was deliberately
 * relaxed to a polymorphic column for exactly this reason (see
 * `backend/migrations/20260901093000-relax-competitions-owner-fk.ts` and the
 * comment on `Competition.ownerId`), but that same relaxation was never
 * applied to `payment_details.adminId`.
 *
 * Effect: `PUT /competitions/:id/payment-details` 500s for any
 * Organizer-owned competition, which makes step 3 ("Оплата") of the
 * `/competitions/new` wizard — a mandatory step, not skippable — impossible
 * to complete for every self-registered Organizer account. This is the
 * project's primary paid-competition-creation flow, so it is effectively
 * blocked end-to-end for Organizers.
 *
 * `test.fail()` marks this as known-failing until the FK is relaxed the same
 * way `competitions.ownerId` was.
 */
test.describe('BUG-5 — an Organizer cannot save payment details for a competition they own', () => {
  test.fail();

  test('PUT /competitions/:id/payment-details succeeds for an Organizer-owned competition', async ({
    request,
    registerPage,
  }) => {
    const organizer = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(organizer);
    const accessToken = await registerPage.getAccessToken();

    const createResponse = await request.post(`${BACKEND_BASE_URL}/competitions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: `BUG-5 probe ${Date.now()}`,
        description: 'e2e regression probe for the payment_details FK bug.',
        location: 'м. Київ',
        organizer: organizer.firstName,
        dateFrom: OPEN_COMPETITION_DATES.DATE_FROM,
        dateTo: OPEN_COMPETITION_DATES.DATE_TO,
        registrationFrom: OPEN_COMPETITION_DATES.REGISTRATION_FROM,
        registrationTo: OPEN_COMPETITION_DATES.REGISTRATION_TO,
        contactNumber: organizer.phone,
        contactEmail: organizer.email,
      },
    });
    expect(createResponse.status()).toBe(201);
    const competition = (await createResponse.json()) as { id: string };

    const paymentResponse = await request.put(
      `${BACKEND_BASE_URL}/competitions/${competition.id}/payment-details`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { beneficiary: 'ФОП Е2Е Тест', account: 'UA123456780000026007233566001' },
      },
    );

    expect(paymentResponse.status()).toBe(200);
  });
});
