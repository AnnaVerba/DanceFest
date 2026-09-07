import { AWARD_ITEM, PERFORMANCE_ITEM } from './section-item-type';
import type { SectionItemType } from './section-item-type';

export interface ScheduleItemInput {
  id: string;
  type: SectionItemType;
  // Frozen at build / recalculate time — see ScheduleService. `award` rows
  // carry 0.
  durationSeconds: number;
  nominationGroupKey: string | null;
  isGroupImprov: boolean;
}

export interface CalculateScheduleInput {
  startTimeSeconds: number;
  pauseSeconds: number;
  items: ScheduleItemInput[];
}

export interface ScheduledItem extends ScheduleItemInput {
  startTimeSeconds: number;
}

// Walks the ordered items from the section start time.
//
// A pause follows every performance, with one exception: an improv group
// pays the pause once for the whole nomination group, after its last
// dancer, not between dancers. Manually inserted rows (break, gala) run
// for their own duration with no pause after them. The award row takes the
// running time and nothing follows it.
export function calculateSchedule(
  input: CalculateScheduleInput,
): ScheduledItem[] {
  let cursor = input.startTimeSeconds;
  const scheduled: ScheduledItem[] = [];

  input.items.forEach((item, index) => {
    scheduled.push({ ...item, startTimeSeconds: cursor });
    if (item.type === AWARD_ITEM) return;

    cursor += item.durationSeconds;
    if (item.type !== PERFORMANCE_ITEM) return;

    const next = input.items[index + 1];
    const nextIsSameImprovGroup =
      item.isGroupImprov &&
      next !== undefined &&
      next.isGroupImprov &&
      next.nominationGroupKey === item.nominationGroupKey;
    if (!nextIsSameImprovGroup) {
      cursor += input.pauseSeconds;
    }
  });

  return scheduled;
}
