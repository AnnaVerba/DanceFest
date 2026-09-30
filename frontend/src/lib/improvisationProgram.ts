import type { NominationExit } from './nominations';

// A nomination is entered once per exit, so it produces only improvisation
// entries when every one of its exits is an improvisation (the server
// derives the flag from the styles). Those entries take no track — the
// organiser plays the music.
export function exitsAreAllImprovisation(exits: NominationExit[]): boolean {
  return exits.length > 0 && exits.every((exit) => exit.isImprovisation);
}
