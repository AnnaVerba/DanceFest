import { OVERAGE_TOLERANCE_SECONDS } from './schedule.constants';
import type { PerformanceDurationResult } from './performance-duration-result';

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
  // Measured length of the uploaded track; null when none is uploaded yet.
  trackSeconds: number | null;
  // Extra time the organizer recorded as purchased for the exit.
  purchasedSeconds: number;
}

// Deterministic on-stage time for a single exit.
//
// An exit with a track runs for the track while it fits the allowed time
// (limit plus purchased extra) within OVERAGE_TOLERANCE_SECONDS; a longer
// track counts only the allowed time and reports the rest as an overage.
// Without a track the exit runs for its limit. Improv has no track at all:
// the organizer plays it, so its time comes straight from the rules.
export function performanceDuration(
  input: PerformanceDurationInput,
  rules: ImprovDurationRules,
): PerformanceDurationResult {
  if (input.improv) {
    const oneRound = input.isGroupImprov
      ? rules.improvGroupSeconds
      : rules.improvIndividualSeconds;
    return { durationSeconds: oneRound * input.improvRounds, overageSeconds: 0 };
  }
  if (input.trackSeconds === null) {
    return { durationSeconds: input.limitSeconds, overageSeconds: 0 };
  }
  const allowedSeconds = input.limitSeconds + input.purchasedSeconds;
  if (input.trackSeconds <= allowedSeconds + OVERAGE_TOLERANCE_SECONDS) {
    return { durationSeconds: input.trackSeconds, overageSeconds: 0 };
  }
  return {
    durationSeconds: allowedSeconds,
    overageSeconds: input.trackSeconds - allowedSeconds,
  };
}
