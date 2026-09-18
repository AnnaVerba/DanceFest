import { roundMoney } from '../entries/entry-amount';
import type { FinanceGroupRow } from './finance-report.view';

// Sums entry amounts per group key. Rows keep the order their first entry
// was added in — the caller feeds entries by createdAt.
export class FinanceGroupAccumulator {
  private readonly rows = new Map<string, FinanceGroupRow>();

  add(key: string, name: string | null, amount: number): void {
    const row = this.rows.get(key) ?? {
      key,
      name,
      entriesCount: 0,
      amount: 0,
    };
    row.entriesCount += 1;
    row.amount = roundMoney(row.amount + amount);
    this.rows.set(key, row);
  }

  toRows(): FinanceGroupRow[] {
    return [...this.rows.values()];
  }
}
