import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BACKEND_BASE_URL } from '../constants/env.constants';

export interface CreateCompetitionPayload {
  name: string;
  description: string;
  location: string;
  organizer: string;
  dateFrom: string;
  dateTo: string;
  registrationFrom: string;
  registrationTo: string;
  contactNumber: string;
  contactEmail: string;
}

/**
 * Thin wrapper around the competition REST endpoints, used to seed a
 * competition (and its nominations) for specs that test a downstream page —
 * TeamPage, CompetitionEditPage, ApplyPage — without re-driving the full
 * /competitions/new wizard, which already has its own dedicated coverage
 * (tests/wizard/create-competition.spec.ts).
 */
export class CompetitionsApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async create(accessToken: string, payload: CreateCompetitionPayload): Promise<{ id: string }> {
    const response = await this.request.post(`${BACKEND_BASE_URL}/competitions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: payload,
    });
    return response.json() as Promise<{ id: string }>;
  }

  addNomination(accessToken: string, competitionId: string, name: string): Promise<APIResponse> {
    return this.request.post(`${BACKEND_BASE_URL}/competitions/${competitionId}/nominations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name },
    });
  }
}
