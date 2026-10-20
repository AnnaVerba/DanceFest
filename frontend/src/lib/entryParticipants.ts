import type { EntryParticipant } from './entryEdit.types';
import {
  ENTRY_PARTICIPANTS_EMPTY_PLACEHOLDER,
  ENTRY_PARTICIPANTS_SEPARATOR,
  GROUP_NAME_DANCERS_SEPARATOR,
  MIN_ENTRY_PARTICIPANTS,
  SOLO_LINEUP_LABEL,
} from './entryParticipants.constants';

// "Прізвище Ім'я" for one dancer.
export function formatParticipantName(participant: EntryParticipant): string {
  return `${participant.lastName} ${participant.firstName}`.trim();
}

// The performers of an entry. A dancer sees the number under the name the
// program prints for it — a group's collective name even when its dancers are
// named, so each of them finds the number in their own cabinet. `showDancers`
// is for a coach or head who keeps the roster: a group then shows its name and
// who dances in it, and a solo, duo or trio named after its dancers lists them
// in full. A group registered by headcount names no dancers, so its name is
// all there is.
export function formatEntryPerformers(
  entry: {
    participants: EntryParticipant[];
    routineName: string;
    lineup?: string | null;
  },
  showDancers = false,
): string {
  if (!showDancers || entry.participants.length === 0) {
    return entry.routineName;
  }
  const isGroupNumber = !!entry.lineup && entry.lineup !== SOLO_LINEUP_LABEL;
  const nameOfApplicant = entry.routineName !== surnamesOf(entry.participants);
  if (!isGroupNumber || !nameOfApplicant) {
    return formatParticipants(entry.participants);
  }
  return `${entry.routineName}${GROUP_NAME_DANCERS_SEPARATOR}${formatParticipants(entry.participants)}`;
}

// How many dance in the number: its recorded headcount — the only record for
// a group registered by headcount — or, without one, the dancers named on it.
export function countEntryParticipants(entry: {
  participantsCount: number | null;
  participants: EntryParticipant[];
}): number {
  return Math.max(
    entry.participantsCount ?? entry.participants.length,
    MIN_ENTRY_PARTICIPANTS,
  );
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
