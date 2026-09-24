import type { OrganizerChip } from './organizerChip';
import { NO_ACCOUNT_ORGANIZER_ID } from './organizerChip.constants';

// A competition stores organizer names and, at the same index, the account id.
export function toOrganizerChips(
  names: string[],
  ids: string[] = [],
): OrganizerChip[] {
  return names.map((name, index) => ({
    name,
    id: ids[index] ?? NO_ACCOUNT_ORGANIZER_ID,
  }));
}

export function organizerNames(chips: OrganizerChip[]): string[] {
  return chips.map((chip) => chip.name);
}

export function organizerIds(chips: OrganizerChip[]): string[] {
  return chips.map((chip) => chip.id);
}
