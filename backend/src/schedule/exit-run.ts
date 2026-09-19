import type { CreationAttributes } from 'sequelize';
import type { SectionItem } from './section-item.model';

// New performance rows that go in, in order, right after one existing row
// of a section — `afterSortOrder` is that row's position, -1 for the top.
export interface ExitRun {
  sectionId: string;
  afterSortOrder: number;
  // A run that opens new nomination blocks shares its anchor with the block
  // ending there; it must land after that block's own new rows.
  opensBlocks: boolean;
  mergedGroupLabel: string | null;
  rows: CreationAttributes<SectionItem>[];
}
