import type {
  MyEntriesBlockSummary,
  MyEntriesGroupView,
  MyEntriesPage,
} from './myEntriesPage.types';

// The page's rows, already in display order, cut into competitions and
// their blocks, each block with its whole-list totals.
export function groupMyEntriesPage(
  page: MyEntriesPage,
): MyEntriesGroupView[] {
  const summaries = new Map<string, Map<string, MyEntriesBlockSummary>>();
  for (const block of page.blocks) {
    const byKey = summaries.get(block.competitionId) ?? new Map();
    byKey.set(block.blockKey, block);
    summaries.set(block.competitionId, byKey);
  }

  const groups: MyEntriesGroupView[] = [];
  for (const row of page.rows) {
    let group = groups.at(-1);
    if (!group || group.competitionId !== row.competitionId) {
      group = {
        competitionId: row.competitionId,
        competitionName: row.competitionName,
        competitionDateFrom: row.competitionDateFrom,
        competitionDateTo: row.competitionDateTo,
        blocks: [],
      };
      groups.push(group);
    }
    let block = group.blocks.at(-1);
    if (!block || block.key !== row.blockKey) {
      const summary = summaries.get(row.competitionId)?.get(row.blockKey);
      block = {
        key: row.blockKey,
        trainerName: summary?.trainerName ?? null,
        rows: [],
        summary,
      };
      group.blocks.push(block);
    }
    block.rows.push(row);
  }
  return groups;
}
