export interface PlaceMedals {
  first: number;
  second: number;
  third: number;
}

export interface CupCount {
  label: string;
  count: number;
}

export interface SpecialAwardSummary {
  name: string;
  // 1st, 2nd and 3rd places: one per category of the special nomination,
  // fewer places when the category has fewer than three performers.
  winners: number;
  secondPlaces: number;
  thirdPlaces: number;
  participations: number;
}

export interface AwardsCalculation {
  performancesInProgram: number;
  placeMedals: PlaceMedals;
  participationMedals: number;
  cups: CupCount[];
  diplomas: number;
  specials: SpecialAwardSummary[];
}
