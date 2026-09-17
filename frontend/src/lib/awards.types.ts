import type { AWARD_LINE_KIND, AWARD_SYSTEM } from './awards.constants';

export type AwardSystem = (typeof AWARD_SYSTEM)[keyof typeof AWARD_SYSTEM];
export type AwardLineKind =
  (typeof AWARD_LINE_KIND)[keyof typeof AWARD_LINE_KIND];

export interface AwardLine {
  key: string;
  kind: AwardLineKind;
  subject: string | null;
  calculated: number;
  override: number | null;
}

export interface AwardsReport {
  awardSystem: AwardSystem;
  performancesInProgram: number;
  /** League names the competition's nominations use. */
  leagues: string[];
  /** «Медаль кожному» leagues in effect for this competition. */
  allMedalLeagues: string[];
  /** The same list as the category template has it. */
  templateAllMedalLeagues: string[];
  /** True once the organizer changed the list for this competition. */
  allMedalLeaguesCustomized: boolean;
  lines: AwardLine[];
}
