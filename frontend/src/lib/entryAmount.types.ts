import type { EntryParticipant } from './entryEdit.types';

export interface PricedEntry {
  participants: EntryParticipant[];
  price: number | null;
}

export interface ParticipantAmount {
  participant: string;
  amount: number;
}
