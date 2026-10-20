import type { EntryParticipant } from "./entryEdit.types";
import {
  ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER,
  ENTRY_PARTICIPANTS_SEPARATOR,
  SOLO_LINEUP_LABEL,
} from "./entryParticipants.constants";

// "Прізвище Ім'я" for one dancer.
export function formatParticipantName(participant: EntryParticipant): string {
  return `${participant.lastName} ${participant.firstName}`.trim();
}

// The performers of an entry. A group number goes by the name the applicant
// gave the collective — even when its dancers are named, so each of them finds
// the number in their own cabinet under that name. A group registered by
// headcount names no dancers, so its name is all there is. Solo entries, and
// duos or trios the form named after their dancers, list the dancers.
export function formatEntryPerformers(entry: {
  participants: EntryParticipant[];
  routineName: string;
  lineup?: string | null;
}): string {
  if (entry.participants.length === 0) return entry.routineName;
  const isGroupNumber = !!entry.lineup && entry.lineup !== SOLO_LINEUP_LABEL;
  const nameOfApplicant = entry.routineName !== surnamesOf(entry.participants);
  return isGroupNumber && nameOfApplicant
    ? entry.routineName
    : formatParticipants(entry.participants);
}

// What the server calls a number made of several dancers when nobody named it.
function surnamesOf(participants: EntryParticipant[]): string {
  return participants
    .map((participant) => participant.lastName)
    .join(ENTRY_PARTICIPANTS_SEPARATOR);
}

// "Прізвище Ім'я" per dancer; a group lists all of them.
export function formatParticipants(participants: EntryParticipant[]): string {
  if (participants.length === 0) return ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER;
  return participants
    .map((p) => formatParticipantName(p))
    .join(ENTRY_PARTICIPANTS_SEPARATOR);
}
