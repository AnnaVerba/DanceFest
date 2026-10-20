import type { EntryParticipant } from './entryEdit.types';
import {
  ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER,
  ENTRY_PARTICIPANTS_SEPARATOR,
} from './entryParticipants.constants';

// "Прізвище Ім'я" for one dancer.
export function formatParticipantName(participant: EntryParticipant): string {
  return `${participant.lastName} ${participant.firstName}`.trim();
}

// The performers of an entry: its dancers, or — for a group registered by
// headcount, which names none — the group's own name.
export function formatEntryPerformers(entry: {
  participants: EntryParticipant[];
  routineName: string;
}): string {
  return entry.participants.length > 0
    ? formatParticipants(entry.participants)
    : entry.routineName;
}

// "Прізвище Ім'я" per dancer; a group lists all of them.
export function formatParticipants(participants: EntryParticipant[]): string {
  if (participants.length === 0) return ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER;
  return participants
    .map((p) => formatParticipantName(p))
    .join(ENTRY_PARTICIPANTS_SEPARATOR);
}
