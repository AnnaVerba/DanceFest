import { Injectable } from '@nestjs/common';
import type { NominationPricing } from '../../nominations/nomination-pricing.interface';
import { dancerCount } from '../entry-amount';
import type { ChargeableEntry } from './chargeable-entry.interface';
import { EntryCharge } from './entry-charge';

@Injectable()
export class EntryChargeCalculator {
  calculate(
    entries: ChargeableEntry[],
    pricing: ReadonlyMap<string, NominationPricing>,
  ): Map<string, EntryCharge> {
    const paidByGroup = new Map<string, Set<string>>();
    const charges = new Map<string, EntryCharge>();

    for (const entry of [...entries].sort(byCreationOrder)) {
      const nominationPricing = entry.nominationId
        ? pricing.get(entry.nominationId)
        : undefined;
      const participantIds = entry.participantIds ?? [];
      const dancers = dancerCount(entry);
      const paying = new Set<string>();

      const groupKey = nominationPricing?.specialGroupKey ?? null;
      if (groupKey === null) {
        participantIds.forEach((id) => paying.add(id));
      } else {
        const paid = paidByGroup.get(groupKey) ?? new Set<string>();
        for (const id of participantIds) {
          if (paid.has(id)) continue;
          paid.add(id);
          paying.add(id);
        }
        paidByGroup.set(groupKey, paid);
      }

      charges.set(
        entry.id,
        new EntryCharge({
          price: nominationPricing?.price ?? 0,
          dancerCount: dancers,
          extraFee: Number(entry.extraFee),
          participantIds: new Set(participantIds),
          payingParticipantIds: paying,
          unidentifiedPayers: Math.max(dancers - participantIds.length, 0),
        }),
      );
    }
    return charges;
  }
}

// `id` only breaks ties between entries saved in the same millisecond (bulk
// apply), so «the first entry» is stable.
function byCreationOrder(a: ChargeableEntry, b: ChargeableEntry): number {
  return (
    a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );
}
