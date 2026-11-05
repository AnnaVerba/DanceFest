import type { EntryParticipant } from './entry-participant.interface';

// A dancer on the staff edit form — the birth date lets the form work out the
// age category of a group that names its dancers.
export interface StaffEntryParticipant extends EntryParticipant {
  birthDate: string | null;
}
