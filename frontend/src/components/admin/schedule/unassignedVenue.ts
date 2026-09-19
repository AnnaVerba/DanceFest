import type { UnassignedExit } from '../../../lib/schedule';

// The venue of the first selected exit found among the loaded pool rows —
// undefined when none of the selection is on screen (e.g. «Обрати все»
// reached other pages). The server checks the whole selection anyway.
export function unassignedVenueOf(
  exits: UnassignedExit[],
  selectedIds: string[],
): string | null | undefined {
  const selected = new Set(selectedIds);
  return exits.find((exit) => selected.has(exit.id))?.venueId;
}
