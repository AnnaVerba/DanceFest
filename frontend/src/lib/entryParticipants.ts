import type { EntryParticipant } from './entryEdit.types';
import {
  ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER,
  ENTRY_PARTICIPANTS_SEPARATOR,
} from './entryParticipants.constants';

// "Прізвище Ім'я" per dancer; a group lists all of them.
export function formatParticipants(participants: EntryParticipant[]): string {
  if (participants.length === 0) return ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER;
  return participants
    .map((p) => `${p.lastName} ${p.firstName}`.trim())
    .join(ENTRY_PARTICIPANTS_SEPARATOR);
}
