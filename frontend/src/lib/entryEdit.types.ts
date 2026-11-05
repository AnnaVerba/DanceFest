import type { Entry } from './entries';

export type PaymentMethod = NonNullable<Entry['paymentMethod']>;

// A dancer named on an entry, as the staff edit form shows them.
export interface EntryParticipant {
  id: string;
  firstName: string;
  lastName: string;
}

// One entry as staff open it for editing: the row plus its dancers' names.
export interface EntryDetails extends Entry {
  participants: EntryParticipant[];
}

// Only the fields sent change; `participantIds` replaces the whole lineup.
export interface EntryUpdateInput {
  routineName?: string;
  routineTitle?: string;
  nominationId?: string;
  participantIds?: string[];
  // A group's headcount when its dancers are not named.
  participantsCount?: number;
  studioId?: string;
  trainerId?: string;
  city?: string;
  paymentMethod?: PaymentMethod;
}
