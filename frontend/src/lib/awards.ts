import { apiRequest } from './http';
import type { AwardSystem, AwardsReport } from './awards.types';

export function getAwardsReport(competitionId: string): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(`/competitions/${competitionId}/awards`);
}

export function setAwardSystem(
  competitionId: string,
  awardSystem: AwardSystem,
): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(
    `/competitions/${competitionId}/awards/system`,
    { method: 'PATCH', body: JSON.stringify({ awardSystem }) },
  );
}

// leagues: null resets the list to the category template's.
export function setAllMedalLeagues(
  competitionId: string,
  leagues: string[] | null,
): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(
    `/competitions/${competitionId}/awards/all-medal-leagues`,
    { method: 'PATCH', body: JSON.stringify({ leagues }) },
  );
}

// value: null resets the line to the calculated quantity.
export function setAwardOverride(
  competitionId: string,
  key: string,
  value: number | null,
): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(
    `/competitions/${competitionId}/awards/overrides`,
    { method: 'PATCH', body: JSON.stringify({ key, value }) },
  );
}
