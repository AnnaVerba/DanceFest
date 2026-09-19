// Who a finance breakdown sums the entry amounts by — mirrors the server's
// FinanceGroup path segment.
export type FinanceGroup = 'participants' | 'trainers' | 'studios';

// Everything owed by one dancer, trainer or studio for a competition.
// `name` is null for entries with no trainer/studio set.
export interface FinanceGroupRow {
  key: string;
  name: string | null;
  entriesCount: number;
  amount: number;
}

// Trainer and studio rows each add up to `total`; dancer rows do not —
// every dancer in a group number is shown that number's full cost.
export interface FinanceSummary {
  entriesCount: number;
  total: number;
}

export interface FinanceGroupQuery {
  page: number;
  pageSize: number;
  search?: string;
}
