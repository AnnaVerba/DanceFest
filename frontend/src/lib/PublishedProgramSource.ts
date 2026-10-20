import { getPublicProgram } from './program';
import type { PublicProgramQuery, PublicProgramRow } from './program';
import type { RowPaged } from './pagination';
import type { ProgramPageSource } from './programPageSource.types';

// The published snapshot — what every viewer reads.
export class PublishedProgramSource implements ProgramPageSource {
  private readonly competitionId: string;

  constructor(competitionId: string) {
    this.competitionId = competitionId;
  }

  fetchPage(query: PublicProgramQuery): Promise<RowPaged<PublicProgramRow>> {
    return getPublicProgram(this.competitionId, query);
  }
}
