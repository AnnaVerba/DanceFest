import type { CompetitionRule } from './competition-rule.model';
import type { NominationDurationAxes } from './nomination-duration-axes.interface';
import { resolveLeagueDurationSeconds } from './resolve-league-duration';

// A lineup value (Дуо, Тріо, Крю…) outranks the league, the same order the
// schedule resolves an entry's limit in (resolveEffectiveLimit).
export function resolveNominationDurationSeconds(
  rules: Pick<CompetitionRule, 'leagueLimits' | 'lineupLimits'>,
  axes: NominationDurationAxes,
): number | null {
  for (const lineupName of axes.lineupNames) {
    const seconds = resolveLeagueDurationSeconds(rules.lineupLimits, lineupName);
    if (seconds !== null) return seconds;
  }
  return resolveLeagueDurationSeconds(rules.leagueLimits, axes.leagueName);
}
