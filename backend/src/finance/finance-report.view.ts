// One row of a finance breakdown — everything owed by one dancer, trainer
// or studio for a competition. `name` is null for the bucket of entries
// with no trainer/studio set.
export interface FinanceGroupRow {
  key: string;
  name: string | null;
  entriesCount: number;
  amount: number;
  // A trainer (head) row only: what the head's own dancers and each of the
  // studio's trainers' dancers owe, adding up to the row. A null name is
  // the head's own dancers. Absent when no entry of the row has a trainer.
  trainers?: FinanceGroupRow[];
}

// The top of the organizer's «Фінанси» tab. Trainer, studio and dancer rows
// each add up to `total`.
export interface FinanceSummary {
  entriesCount: number;
  total: number;
}
