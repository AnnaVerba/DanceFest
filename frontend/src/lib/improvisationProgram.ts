import type { NominationExit } from './nominations';
import { IMPROVISATION_PROGRAM_NAME_STEM } from './improvisationProgram.constants';

export function isImprovisationProgram(programName: string): boolean {
  return programName
    .trim()
    .toLowerCase()
    .startsWith(IMPROVISATION_PROGRAM_NAME_STEM);
}

// A nomination is entered once per exit, so it produces only improvisation
// entries when every one of its exits is an improvisation program. Those
// entries take no track — the organiser plays the music.
export function exitsAreAllImprovisation(exits: NominationExit[]): boolean {
  return (
    exits.length > 0 &&
    exits.every(
      (exit) =>
        exit.programName !== null && isImprovisationProgram(exit.programName),
    )
  );
}
