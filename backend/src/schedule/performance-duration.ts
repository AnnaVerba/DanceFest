// The improv seconds-per-dancer setting from competition_rules. Declared
// narrowly so this pure function never touches a Sequelize model or the
// database.
export interface ImprovDurationRules {
  improvIndividualSeconds: number;
}

export interface PerformanceDurationInput {
  improv: boolean;
  // How many dancers share the exit; a missing count counts as one.
  participantsCount: number | null;
  // Effective duration limit for the exit's nomination and round, already
  // resolved by the caller.
  limitSeconds: number;
}

const MIN_IMPROV_PARTICIPANTS = 1;

// Deterministic on-stage time for a single exit.
//
// v1 has no measured track length, so a non-improv exit always runs for its
// configured limit — the `timeSource: 'track'` rule stays inert until track
// measurement exists. Improv has no track at all: the organizer plays it,
// so its time is the organizer's seconds-per-dancer times the dancers.
export function performanceDuration(
  input: PerformanceDurationInput,
  rules: ImprovDurationRules,
): number {
  if (input.improv) {
    const dancers = Math.max(
      input.participantsCount ?? MIN_IMPROV_PARTICIPANTS,
      MIN_IMPROV_PARTICIPANTS,
    );
    return rules.improvIndividualSeconds * dancers;
  }
  return input.limitSeconds;
}
