// One row of the organizer's overage working list — an entry whose measured
// track duration exceeds its effective time limit.
export interface OverageEntryView {
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
  items: OverageEntryView[];
}
