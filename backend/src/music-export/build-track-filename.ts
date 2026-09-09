// `participantNumber_FirstName_LastName_League_Style.mp3` — per the ticket.
// "participantNumber" is the entry's own number (§8.3's "наскрізний номер"),
// not a per-dancer participant number: a group number has several dancers,
// so there's no single one to number by. For a solo, FirstName_LastName is
// the dancer's own name; for a group there's no single dancer either, so
// the routine name stands in for it (Developer's call — see chat).
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function sanitize(value: string): string {
  return value.replace(UNSAFE_FILENAME_CHARS, '').trim();
}

export interface TrackFileNameInput {
  entryNumber: number;
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

  const parts = [String(input.entryNumber), namePart, input.league, input.style]
    .filter((part): part is string => Boolean(part))
    .map(sanitize)
    .filter(Boolean);

  return `${parts.join('_')}.${input.extension}`;
}
