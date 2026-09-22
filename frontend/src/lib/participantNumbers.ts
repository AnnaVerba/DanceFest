import {
  PARTICIPANT_NUMBERS_SEPARATOR,
  PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER,
} from './participantNumbers.constants';
import { PARTICIPANT_NUMBER_MARK } from './programNumbers.constants';

// "7" for a solo, "7, 12, 15" for a group, a dash when no dancer is linked
// (an entry an organizer typed in by hand). A dancer with no number yet
// (e.g. a legacy entry) gets its own dash in place, so the list still lines
// up one-to-one with the dancers.
export function formatParticipantNumbers(numbers: (number | null)[]): string {
  if (numbers.length === 0) return PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER;
  return numbers
    .map((n) => (n === null ? PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER : String(n)))
    .join(PARTICIPANT_NUMBERS_SEPARATOR);
}

// The same list carrying its mark, for the programme views: "№7", "№7, 12".
// An entry with no numbered dancer keeps the bare dash — a mark in front of
// a dash reads as a number that failed to load.
export function formatMarkedParticipantNumbers(
  numbers: (number | null)[],
): string {
  const text = formatParticipantNumbers(numbers);
  return text === PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER
    ? text
    : `${PARTICIPANT_NUMBER_MARK}${text}`;
}
