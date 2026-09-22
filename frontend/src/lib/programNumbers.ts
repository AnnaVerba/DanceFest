import { NOMINATION_NUMBER_MARK } from './programNumbers.constants';

// A nomination block's number as both programmes print it: "F2".
export function formatMarkedNominationNumber(number: number): string {
  return `${NOMINATION_NUMBER_MARK}${number}`;
}
