import { apiRequest } from './http';

export const TIME_SOURCES = ['track', 'limit'] as const;
export type TimeSource = (typeof TIME_SOURCES)[number];

export const DURATION_ROUNDS = ['final', 'semifinal'] as const;
export type DurationRound = (typeof DURATION_ROUNDS)[number];

export interface CompetitionRules {
  id: string;
  competitionId: string;
  pauseSeconds: number;
  leagueLimits: Record<string, number>;
  timeSource: TimeSource;
  surchargesEnabled: boolean;
  coachPercent: number;
  semifinalThreshold: number;
  improvGroupSeconds: number;
  improvIndividualSeconds: number;
  quorum: number;
}

export interface RulesPatch {
  pauseSeconds?: number;
  leagueLimits?: Record<string, number>;
  timeSource?: TimeSource;
  surchargesEnabled?: boolean;
  coachPercent?: number;
  semifinalThreshold?: number;
  improvGroupSeconds?: number;
  improvIndividualSeconds?: number;
  quorum?: number;
}

export interface DurationLimit {
  id: string;
  competitionId: string;
  nominationId: string | null;
  categoryId: string | null;
  round: DurationRound;
  seconds: number;
}

export interface DurationLimitInput {
  nominationId?: string;
  categoryId?: string;
  round?: DurationRound;
  seconds: number;
}

export interface OverlimitTariff {
  id: string;
  competitionId: string;
  uptoSeconds: number;
  price: number;
}

export function getRules(competitionId: string): Promise<CompetitionRules> {
  return apiRequest<CompetitionRules>(`/competitions/${competitionId}/rules`);
}

export function patchRules(
  competitionId: string,
  patch: RulesPatch,
): Promise<CompetitionRules> {
  return apiRequest<CompetitionRules>(`/competitions/${competitionId}/rules`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function getDurationLimits(
  competitionId: string,
): Promise<DurationLimit[]> {
  return apiRequest<DurationLimit[]>(
    `/competitions/${competitionId}/duration-limits`,
  );
}

export function createDurationLimit(
  competitionId: string,
  input: DurationLimitInput,
): Promise<DurationLimit> {
  return apiRequest<DurationLimit>(
    `/competitions/${competitionId}/duration-limits`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function deleteDurationLimit(
  competitionId: string,
  limitId: string,
): Promise<void> {
  return apiRequest<void>(
    `/competitions/${competitionId}/duration-limits/${limitId}`,
    { method: 'DELETE' },
  );
}

export function getOverlimitTariffs(
  competitionId: string,
): Promise<OverlimitTariff[]> {
  return apiRequest<OverlimitTariff[]>(
    `/competitions/${competitionId}/overlimit-tariffs`,
  );
}

export function createOverlimitTariff(
  competitionId: string,
  uptoSeconds: number,
  price: number,
): Promise<OverlimitTariff> {
  return apiRequest<OverlimitTariff>(
    `/competitions/${competitionId}/overlimit-tariffs`,
    { method: 'POST', body: JSON.stringify({ uptoSeconds, price }) },
  );
}

export function deleteOverlimitTariff(
  competitionId: string,
  tariffId: string,
): Promise<void> {
  return apiRequest<void>(
    `/competitions/${competitionId}/overlimit-tariffs/${tariffId}`,
    { method: 'DELETE' },
  );
}
