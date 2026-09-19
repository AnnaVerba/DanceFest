import type { EntryParticipant } from './entryEdit.types';

export interface PricedEntry {
  participants: EntryParticipant[];
  amount: number;
}

export interface ParticipantAmount {
  participant: string;
  amount: number;
}
