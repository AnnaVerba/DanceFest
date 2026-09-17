import type { AwardSystem } from './award-system';
import type { AwardLine } from './award-line.interface';

export interface AwardsReport {
  awardSystem: AwardSystem;
  performancesInProgram: number;
  // League names the competition's nominations use — the organizer's choices.
  leagues: string[];
  // «Медаль кожному» leagues in effect: the organizer's list for this
  // competition, else the category template's.
  allMedalLeagues: string[];
  // The same list as the category template has it.
  templateAllMedalLeagues: string[];
  // True once the organizer changed the list for this competition.
  allMedalLeaguesCustomized: boolean;
  lines: AwardLine[];
}
