import type { CompetitionRules } from './competitionRules';
import type { Nomination, NominationExit } from './nominations';
import { MIN_IMPROVISATION_ROUNDS } from './improvisationDuration.constants';

// Mirrors the schedule (performanceDuration): the timings screen writes one
// value into both improv fields; a per-program exit is one improvisation, a
// single exit dances all of its nomination's programs in a row (Battle Queen).
export function improvisationSecondsOf(
  rules: CompetitionRules,
  nomination: Nomination,
  exit: NominationExit,
): number {
  const rounds =
    exit.programId !== null
      ? MIN_IMPROVISATION_ROUNDS
      : Math.max(nomination.programs.length, MIN_IMPROVISATION_ROUNDS);
  return rules.improvGroupSeconds * rounds;
}
