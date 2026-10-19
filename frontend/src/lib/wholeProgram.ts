import type { PublicProgramRow } from './program';
import type {
  ProgramPageSource,
  WholeProgramFilter,
} from './programPageSource.types';
import {
  WHOLE_PROGRAM_FIRST_PAGE,
  WHOLE_PROGRAM_PAGE_ROWS,
} from './wholeProgram.constants';

// Every row of the program as one list — it is shown whole, not paged —
// read page by page in the largest pages the server serves.
export async function fetchWholeProgram(
  source: ProgramPageSource,
  filter: WholeProgramFilter = {},
): Promise<PublicProgramRow[]> {
  const first = await source.fetchPage({
    ...filter,
    page: WHOLE_PROGRAM_FIRST_PAGE,
    pageSize: WHOLE_PROGRAM_PAGE_ROWS,
  });
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.pageCount - 1, 0) }, (_, index) =>
      source.fetchPage({
        ...filter,
        page: index + 1,
        pageSize: WHOLE_PROGRAM_PAGE_ROWS,
      }),
    ),
  );
  return [first, ...rest].flatMap((page) => page.rows);
}
