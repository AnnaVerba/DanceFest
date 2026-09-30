import { buildNominationLabel } from './nomination-naming';
import { isImprovisationNomination } from './is-improvisation-nomination';

export type ExitMode = 'single' | 'per_program';

export const EXIT_MODES: ExitMode[] = ['single', 'per_program'];
export const DEFAULT_EXIT_MODE: ExitMode = EXIT_MODES[0];

export interface NominationProgram {
  id: string;
  name: string;
  isImprovisation: boolean;
}

export interface NominationExitPlanInput {
  label: string;
  exitMode: ExitMode;
  programs: NominationProgram[];
  durationLimitSeconds: number | null;
  programLimits: Record<string, number>;
}

export interface NominationExit {
  programId: string | null;
  programName: string | null;
  label: string;
  isImprovisation: boolean;
  // null for an improvisation: it runs for the competition's improvisation
  // duration, not for a limit of its own.
  durationLimitSeconds: number | null;
}

function sumProgramLimits(
  programs: NominationProgram[],
  programLimits: Record<string, number>,
): number | null {
  const known = programs
    .map((p) => programLimits[p.id])
    .filter((seconds): seconds is number => typeof seconds === 'number');
  if (known.length === 0) return null;
  return known.reduce((sum, seconds) => sum + seconds, 0);
}

export function planNominationExits(
  input: NominationExitPlanInput,
): NominationExit[] {
  const { label, exitMode, programs, durationLimitSeconds, programLimits } =
    input;

  if (exitMode === 'per_program' && programs.length > 0) {
    return programs.map((program) => ({
      programId: program.id,
      programName: program.name,
      label: buildNominationLabel({
        axisNames: [label],
        programName: program.name,
      }),
      isImprovisation: program.isImprovisation,
      durationLimitSeconds: program.isImprovisation
        ? null
        : (programLimits[program.id] ?? durationLimitSeconds ?? null),
    }));
  }

  const isImprovisation = isImprovisationNomination(programs);
  return [
    {
      programId: null,
      programName: null,
      label,
      isImprovisation,
      durationLimitSeconds: isImprovisation
        ? null
        : (durationLimitSeconds ?? sumProgramLimits(programs, programLimits)),
    },
  ];
}
