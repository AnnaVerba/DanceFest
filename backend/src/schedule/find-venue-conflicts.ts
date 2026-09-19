import { PERFORMANCE_ITEM } from './section-item-type';
import type { SectionView } from './section-view';
import type {
  ConflictSlot,
  ParticipantSlot,
  VenueConflictView,
} from './venue-conflict';

// Every venue runs its own program at the same time, so one dancer booked
// on two venues whose performances overlap on the same day cannot make both
// (TASK-14). Only on-stage time counts; sections without a venue are
// skipped — they have no place to clash with.
export function findVenueConflicts(
  sections: SectionView[],
): VenueConflictView[] {
  const byParticipant = new Map<string, ParticipantSlot[]>();
  for (const section of sections) {
    if (!section.venueId) continue;
    for (const item of section.items) {
      if (item.type !== PERFORMANCE_ITEM || !item.exit) continue;
      const start = item.startTimeSeconds;
      const end = start + (item.durationSeconds ?? 0);
      item.exit.participantIds.forEach((participantId, index) => {
        const slots = byParticipant.get(participantId) ?? [];
        slots.push({
          participantNumber: item.exit!.participantNumbers[index] ?? null,
          dayId: section.dayId,
          venueId: section.venueId!,
          start,
          end,
          sectionName: section.name,
          time: item.time,
          routineName: item.exit!.routineName,
        });
        byParticipant.set(participantId, slots);
      });
    }
  }

  const conflicts: VenueConflictView[] = [];
  for (const slots of byParticipant.values()) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const clash =
          a.dayId === b.dayId &&
          a.venueId !== b.venueId &&
          a.start < b.end &&
          b.start < a.end;
        if (!clash) continue;
        const [first, second] = a.start <= b.start ? [a, b] : [b, a];
        conflicts.push({
          participantNumber: a.participantNumber,
          dayId: a.dayId,
          first: toConflictSlot(first),
          second: toConflictSlot(second),
        });
      }
    }
  }
  return conflicts;
}

function toConflictSlot(slot: ParticipantSlot): ConflictSlot {
  return {
    venueId: slot.venueId,
    sectionName: slot.sectionName,
    time: slot.time,
    routineName: slot.routineName,
  };
}
