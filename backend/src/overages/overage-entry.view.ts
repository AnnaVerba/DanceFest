// One row of the organizer's overage working list — an entry whose measured
// track duration exceeds its effective time limit.
export interface OverageEntryView {
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

export interface OveragesResponse {
  items: OverageEntryView[];
}
