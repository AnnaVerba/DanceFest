// Narrow view of an Entry needed to count the improvisations its exit holds
// (see CompetitionRulesService.improvisationRoundsOf).
export interface ImprovisationRoundsInput {
  nominationId: string | null;
  program: string | null;
}
