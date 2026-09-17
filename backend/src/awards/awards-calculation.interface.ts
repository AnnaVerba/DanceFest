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
  // One 1st place per category of the special nomination.
  winners: number;
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
