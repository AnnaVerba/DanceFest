import type { Category, CategoryType } from '../../lib/categories';

// An axis value the organizer asked to remove while generated nominations
// still use it — waits for «лише з вибору» or «разом із номінаціями».
export interface PendingAxisRemoval {
  type: CategoryType;
  category: Category;
  nominationCount: number;
}
