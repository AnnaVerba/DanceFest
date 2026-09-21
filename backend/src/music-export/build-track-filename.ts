// `participantNumber_FirstName_LastName_League_Style.mp3` — per the ticket.
// "participantNumber" is the dancer's competition participant number (see
// CompetitionParticipantNumbersService). A group has several dancers, so its
// numbers are joined. For a solo, FirstName_LastName is the dancer's own
// name; for a group there's no single dancer, so the routine name stands in.
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const TRACK_NUMBER_SEPARATOR = '-';

function sanitize(value: string): string {
  return value.replace(UNSAFE_FILENAME_CHARS, '').trim();
}

export interface TrackFileNameInput {
  numberLabel: string;
  soloParticipant: { firstName: string; lastName: string } | null;
  routineName: string;
  league: string | null;
  style: string | null;
  extension: string;
}

export function buildTrackFileName(input: TrackFileNameInput): string {
  const namePart = input.soloParticipant
    ? `${sanitize(input.soloParticipant.firstName)}_${sanitize(input.soloParticipant.lastName)}`
    : sanitize(input.routineName);

  const parts = [input.numberLabel, namePart, input.league, input.style]
    .filter((part): part is string => Boolean(part))
    .map(sanitize)
    .filter(Boolean);

  return `${parts.join('_')}.${input.extension}`;
}

export function buildTrackNumberLabel(
  participantNumbers: (number | null)[],
): string {
  return participantNumbers
    .filter((value): value is number => value !== null)
    .join(TRACK_NUMBER_SEPARATOR);
}
