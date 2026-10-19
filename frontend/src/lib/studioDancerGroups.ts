import type { StudioDancer } from './participants';
import type { TrainerDancerGroup } from './studioDancerGroups.types';
import {
  TRAINER_GROUP_COLLATOR_LOCALE,
  UNKNOWN_TRAINER_KEY,
} from './studioDancerGroups.constants';

// A head's view of their trainers' dancers, one group per trainer, by
// trainer name; dancers keep the server's order within a group.
export function groupDancersByTrainer(
  dancers: StudioDancer[],
): TrainerDancerGroup[] {
  const groups = new Map<string, TrainerDancerGroup>();
  for (const dancer of dancers) {
    const key = dancer.trainerId ?? UNKNOWN_TRAINER_KEY;
    const group = groups.get(key);
    if (group) {
      group.dancers.push(dancer);
    } else {
      groups.set(key, {
        trainerId: key,
        trainerName: dancer.trainerName,
        dancers: [dancer],
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    (a.trainerName ?? '').localeCompare(
      b.trainerName ?? '',
      TRAINER_GROUP_COLLATOR_LOCALE,
    ),
  );
}
