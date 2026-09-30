import type { NominationProgram } from './nomination-exits';

// A single-exit nomination is an improvisation when it has a style and every
// style is one. No style means no improvisation: nothing says so.
export function isImprovisationNomination(
  programs: NominationProgram[],
): boolean {
  return (
    programs.length > 0 && programs.every((program) => program.isImprovisation)
  );
}
