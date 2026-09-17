// How place medals are counted for individual performances (соло, дует,
// тріо). standard — only leagues a template marks «медаль кожному» spread
// medals over the whole category, the rest award places 1–3 only.
// medal_standings — «медальний залік»: every category spreads medals.
export const AWARD_SYSTEMS = ['standard', 'medal_standings'] as const;
export type AwardSystem = (typeof AWARD_SYSTEMS)[number];

export const STANDARD_AWARD_SYSTEM: AwardSystem = 'standard';
export const MEDAL_STANDINGS_AWARD_SYSTEM: AwardSystem = 'medal_standings';
