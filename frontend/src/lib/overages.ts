import { apiRequest } from './http';

// One row of the organizer's overage working list — an entry whose measured
// track duration exceeds its effective time limit. An overage without
// purchasedSec stays a warning; it never blocks the performance.
export interface OverageEntry {
  entryId: string;
  number: number;
  dancerName: string;
  league: string | null;
  limitSec: number;
  durationSec: number;
  overageSec: number;
  purchasedSec: number;
  extraFee: number;
}

export interface OveragesResponse {
  items: OverageEntry[];
}

export function getOverages(competitionId: string): Promise<OveragesResponse> {
  return apiRequest<OveragesResponse>(
    `/competitions/${competitionId}/overages`,
  );
}
