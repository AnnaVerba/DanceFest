// The improv-seconds pair from competition_rules. Declared narrowly so this
// pure function never touches a Sequelize model or the database.
export interface ImprovDurationRules {
  improvGroupSeconds: number;
  improvIndividualSeconds: number;
}

export interface PerformanceDurationInput {
  improv: boolean;
  isGroupImprov: boolean;
  // Effective duration limit for the exit's nomination and round, already
  // resolved by the caller.
  limitSeconds: number;
  // Improvisations the exit holds back to back (Battle Queen: two).
  improvRounds: number;
}

// Deterministic on-stage time for a single exit.
//
// v1 has no measured track length, so a non-improv exit always runs for its
// configured limit — the `timeSource: 'track'` rule stays inert until track
// measurement exists. Improv has no track at all: the organizer plays it,
// so its time comes straight from the rules.
export function performanceDuration(
  input: PerformanceDurationInput,
  rules: ImprovDurationRules,
): number {
  if (input.improv) {
    const oneRound = input.isGroupImprov
      ? rules.improvGroupSeconds
      : rules.improvIndividualSeconds;
    return oneRound * input.improvRounds;
  }
  return input.limitSeconds;
}
