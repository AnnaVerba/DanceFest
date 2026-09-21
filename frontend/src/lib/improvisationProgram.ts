import { IMPROVISATION_PROGRAM_NAME_STEM } from './improvisationProgram.constants';

export function isImprovisationProgram(programName: string): boolean {
  return programName
    .trim()
    .toLowerCase()
    .startsWith(IMPROVISATION_PROGRAM_NAME_STEM);
}
