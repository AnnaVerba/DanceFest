import { CompetitionParticipantNumber } from './competition-participant-number.model';

// In-memory index of issued numbers, keyed by competition and person, so a
// list of entries can be decorated without one query per row.
export class ParticipantNumberLookup {
  private readonly numbers = new Map<string, number>();

  constructor(rows: CompetitionParticipantNumber[]) {
    for (const row of rows) {
      this.numbers.set(this.key(row.competitionId, row.personId), row.number);
    }
  }

  numbersFor(competitionId: string, personIds: string[]): number[] {
    return personIds
      .map((personId) => this.numbers.get(this.key(competitionId, personId)))
      .filter((number): number is number => number !== undefined);
  }

  private key(competitionId: string, personId: string): string {
    return `${competitionId}:${personId}`;
  }
}
