import { buildNominationLabel } from './nomination-naming';

// Скільки разів учасник виходить на сцену. Має сенс лише для спецкатегорій:
// 'single' — усі програми танцюються підряд, без сходження зі сцени.
export type ExitMode = 'single' | 'per_program';

export const EXIT_MODES: ExitMode[] = ['single', 'per_program'];

export interface NominationProgram {
  id: string;
  name: string;
}

export interface NominationExitPlanInput {
  // Назва номінації як вона збережена: осі плюс назва спецкатегорії.
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

/**
 * Скільки разів учасник вийде на сцену за однією заявкою і що буде написано
 * в програмі проти кожного виходу.
 *
 * Один вихід — усі програми танцюються підряд, тому й ліміт один на всіх:
 * сума лімітів програм, якщо організатор не задав власний. Окремий вихід —
 * кожна програма зі своїм лімітом.
 */
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
      durationLimitSeconds:
        programLimits[program.id] ?? durationLimitSeconds ?? null,
    }));
  }

  return [
    {
      programId: null,
      programName: null,
      label,
      durationLimitSeconds:
        durationLimitSeconds ?? sumProgramLimits(programs, programLimits),
    },
  ];
}
