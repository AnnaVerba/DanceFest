// Per-pass memo for CompetitionRulesService.resolveEffectiveLimit, keyed by
// nomination id: a caller resolving many entries at once (a section, a whole
// recalculate, an overage list) looks each nomination up only once.
export class LimitCache {
  // The duration set by hand on the nomination; null when there is none.
  readonly manual = new Map<string, number | null>();
  // Names of the lineup categories a nomination carries (Mega Crew, Duo…).
  readonly lineupNames = new Map<string, string[]>();
  // The limit resolved from duration_limits (per nomination / per axis).
  readonly resolved = new Map<string, number>();
  // Improvisations one single-exit nomination holds: its style count.
  readonly rounds = new Map<string, number>();
}
