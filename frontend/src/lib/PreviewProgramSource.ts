import { getProgramPreview } from './program';
import type { PublicProgramQuery, PublicProgramRow } from './program';
import type { RowPaged } from './pagination';
import type { ProgramPageSource } from './programPageSource.types';

// The live running order — the organizer's «Публічна» preview.
export class PreviewProgramSource implements ProgramPageSource {
  private readonly competitionId: string;

  constructor(competitionId: string) {
    this.competitionId = competitionId;
  }

  fetchPage(query: PublicProgramQuery): Promise<RowPaged<PublicProgramRow>> {
    return getProgramPreview(this.competitionId, query);
  }
}
