import { apiRequest } from './http';
import { formatEntryAmount } from './entryAmount';
import {
  OVERAGE_FEE_MULTIPLY_SIGN,
  OVERAGE_FEE_TOTAL_SIGN,
} from './overages.constants';

// One row of the organizer's overage working list — an entry whose measured
// track duration exceeds its effective time limit. An overage without
// purchasedSec stays a warning; it never blocks the performance.
export interface OverageEntry {
  entryId: string;
  number: number;
  dancerName: string;
  nomination: string;
  limitSec: number;
  durationSec: number;
  overageSec: number;
  purchasedSec: number;
  // The fee is per dancer: the entry owes it for each of them.
  extraFee: number;
  // How many dance in the number.
  dancers: number;
}

// «× 5 = 500 грн» — what a per-dancer fee comes to for the whole number.
export function formatOverageFeeTotal(fee: number, dancers: number): string {
  return `${OVERAGE_FEE_MULTIPLY_SIGN} ${dancers} ${OVERAGE_FEE_TOTAL_SIGN} ${formatEntryAmount(fee * dancers)}`;
}

export interface OveragesResponse {
  items: OverageEntry[];
}

export function getOverages(competitionId: string): Promise<OveragesResponse> {
  return apiRequest<OveragesResponse>(
    `/competitions/${competitionId}/overages`,
  );
}
