import { isGroupLineup } from '../entries/lineup';
import { CompetitionParticipantNumber } from './competition-participant-number.model';

// What the lookup needs of an entry, so it never depends on the Entry model.
export interface NumberedEntry {
  competitionId: string;
  participantIds: string[] | null;
  lineup: string | null;
  groupNumber: number | null;
}

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

  // The number(s) an entry is shown under: a group performance has just its
  // own number, a solo its dancer's.
  numbersForEntry(entry: NumberedEntry): (number | null)[] {
    if (isGroupLineup(entry.lineup)) return [entry.groupNumber];
    return this.numbersFor(entry.competitionId, entry.participantIds ?? []);
  }

  private key(competitionId: string, personId: string): string {
    return `${competitionId}:${personId}`;
  }
}
