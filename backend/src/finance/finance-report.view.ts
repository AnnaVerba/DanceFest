// One row of a finance breakdown — everything owed by one dancer, trainer
// or studio for a competition. `name` is null for the bucket of entries
// with no trainer/studio set.
export interface FinanceGroupRow {
  key: string;
  name: string | null;
  entriesCount: number;
  amount: number;
}

// The top of the organizer's «Фінанси» tab. Trainer and studio rows each
// add up to `total`; dancer rows do not, since every dancer in a group
// number is shown that number's full cost.
export interface FinanceSummary {
  entriesCount: number;
  total: number;
}
