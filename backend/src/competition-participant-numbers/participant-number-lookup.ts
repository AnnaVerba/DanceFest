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

  // One element per `personId`, in the same order — `null` for a person who
  // has no number yet, so a caller displaying a group entry never has a
  // later number silently shift into an earlier dancer's slot.
  numbersFor(competitionId: string, personIds: string[]): (number | null)[] {
    return personIds.map(
      (personId) => this.numbers.get(this.key(competitionId, personId)) ?? null,
    );
  }

  private key(competitionId: string, personId: string): string {
    return `${competitionId}:${personId}`;
  }
}
