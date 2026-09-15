export const AWARD_LINE_KINDS = [
  'first_place_medals',
  'second_place_medals',
  'third_place_medals',
  'participation_medals',
  'cups',
  'diplomas',
  'special_winners',
  'special_participations',
] as const;
export type AwardLineKind = (typeof AWARD_LINE_KINDS)[number];

export const FIRST_PLACE_MEDALS: AwardLineKind = 'first_place_medals';
export const SECOND_PLACE_MEDALS: AwardLineKind = 'second_place_medals';
export const THIRD_PLACE_MEDALS: AwardLineKind = 'third_place_medals';
export const PARTICIPATION_MEDALS: AwardLineKind = 'participation_medals';
export const CUPS: AwardLineKind = 'cups';
export const DIPLOMAS: AwardLineKind = 'diplomas';
export const SPECIAL_WINNERS: AwardLineKind = 'special_winners';
export const SPECIAL_PARTICIPATIONS: AwardLineKind = 'special_participations';
