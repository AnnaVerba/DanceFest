export const AWARD_SYSTEM = {
  STANDARD: 'standard',
  MEDAL_STANDINGS: 'medal_standings',
} as const;

export const AWARD_LINE_KIND = {
  FIRST_PLACE_MEDALS: 'first_place_medals',
  SECOND_PLACE_MEDALS: 'second_place_medals',
  THIRD_PLACE_MEDALS: 'third_place_medals',
  PARTICIPATION_MEDALS: 'participation_medals',
  CUPS: 'cups',
  DIPLOMAS: 'diplomas',
  SPECIAL_WINNERS: 'special_winners',
  SPECIAL_PARTICIPATIONS: 'special_participations',
} as const;

export const SPECIAL_LINE_KINDS: readonly string[] = [
  AWARD_LINE_KIND.SPECIAL_WINNERS,
  AWARD_LINE_KIND.SPECIAL_PARTICIPATIONS,
];

export const MIN_AWARD_QUANTITY = 0;
export const AWARD_QUANTITY_STEP = 1;
export const HTTP_FORBIDDEN = 403;
