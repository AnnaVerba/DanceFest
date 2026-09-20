import type { FinanceGroup } from '../../lib/finance.types';

// One collapsible breakdown on the «Фінанси» tab.
export interface FinanceSectionConfig {
  group: FinanceGroup;
  title: string;
  nameLabel: string;
  searchPlaceholder: string;
  note?: string;
}
