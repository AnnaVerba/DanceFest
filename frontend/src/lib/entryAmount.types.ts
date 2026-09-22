import type { EntryParticipant } from './entryEdit.types';

// One dancer's own part of a single entry, as /me/entries reports it.
export interface EntryParticipantAmount {
  participantId: string;
  amount: number;
}

export interface PricedEntry {
  participants: EntryParticipant[];
  amount: number;
  participantAmounts: EntryParticipantAmount[];
}

// Everything one performer owes across a competition's entries. `key` is the
// dancer's id — two dancers may share a name, `participant` is display only.
export interface ParticipantAmount {
  key: string;
  participant: string;
  amount: number;
}
