import {
  GROUP_MAX_PARTICIPANTS,
  GROUP_MIN_HEADCOUNT,
  NO_HEADCOUNT,
} from './groupApply.constants';

// The headcount typed into the field — NO_HEADCOUNT while it is empty or is
// not a whole number.
export function parseHeadcount(raw: string): number {
  const count = Number(raw);
  return Number.isInteger(count) && count > NO_HEADCOUNT ? count : NO_HEADCOUNT;
}

// Whether this many dancers make a «Група» the server accepts.
export function isGroupSize(count: number): boolean {
  return count >= GROUP_MIN_HEADCOUNT && count <= GROUP_MAX_PARTICIPANTS;
}
