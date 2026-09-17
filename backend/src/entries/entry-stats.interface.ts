export interface LineupCount {
  label: string;
  count: number;
}

export interface EntryStats {
  performances: number;
  participants: number;
  studios: number;
  cities: number;
  nominations: number;
  lineups: LineupCount[];
}
