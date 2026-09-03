import {
  PARTICIPANT_NUMBERS_SEPARATOR,
  PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER,
} from './participantNumbers.constants';

// "7" for a solo, "7, 12, 15" for a group, a dash when no dancer is linked
// (an entry an organizer typed in by hand).
export function formatParticipantNumbers(numbers: number[]): string {
  if (numbers.length === 0) return PARTICIPANT_NUMBER_EMPTY_PLACEHOLDER;
  return numbers.join(PARTICIPANT_NUMBERS_SEPARATOR);
}
