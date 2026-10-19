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
  // Trainer (head) rows only: what the head's own dancers (null name) and
  // each studio trainer's dancers owe. Absent when the head has no trainer
  // in the competition.
  trainers?: FinanceGroupRow[];
}

// Trainer, studio and dancer rows each add up to `total`.
export interface FinanceSummary {
  entriesCount: number;
  total: number;
}

export interface FinanceGroupQuery {
  page: number;
  pageSize: number;
  search?: string;
}
