// Per-pass memo for CompetitionRulesService.resolveEffectiveLimit, keyed by
// nomination id: a caller resolving many entries at once (a section, a whole
// recalculate, an overage list) looks each nomination up only once.
export class LimitCache {
  // The duration set by hand on the nomination; null when there is none.
  readonly manual = new Map<string, number | null>();
  // The limit resolved from duration_limits (per nomination / per axis).
  readonly resolved = new Map<string, number>();
}
