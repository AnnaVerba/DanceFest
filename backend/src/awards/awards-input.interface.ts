import type { AwardSystem } from './award-system';
import type { AwardPerformance } from './award-performance.interface';

export interface AwardsInput {
  awardSystem: AwardSystem;
  performances: AwardPerformance[];
}
