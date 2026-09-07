import {
  PARTICIPANT_NUMBERS_SEPARATOR,
  PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER,
} from './participantNumbers.constants';

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
