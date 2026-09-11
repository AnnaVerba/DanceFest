// Narrow view of an Entry needed to resolve its effective on-stage time
// limit (see CompetitionRulesService.resolveEffectiveLimit) — keeps this
// service decoupled from the Entry model itself.
export interface EntryLimitInput {
  league: string | null;
  nominationId: string | null;
}
