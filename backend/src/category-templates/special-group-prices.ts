import { BadRequestException } from '@nestjs/common';
import { SPECIAL_NAME_PRICE_CONFLICT_MESSAGE } from '../nominations/nominations.constants';
import { normalizeSpecialName, specialNameLookupKey } from '../nominations/special-name';

export interface SpecialPriceDraft {
  isSpecial?: boolean;
  specialName?: string | null;
  price?: number | null;
}

/**
 * Ціна спецкатегорії належить її **групі**, а не окремому рядку: «Корона
 * Шехеризади» коштує однаково в усіх своїх номінаціях. Конкурс тримає це
 * правило в SpecialNominationGroups; шаблон мусить тримати його теж, інакше
 * імпорт у конкурс валиться посеред набору з SPECIAL_PRICE_CONFLICT.
 *
 * Порожня ціна не конфліктує — вона успадковує ціну групи.
 */
export function specialGroupPrices(
  nominations: SpecialPriceDraft[],
): Map<string, number> {
  const byName = new Map<string, number>();

  for (const nomination of nominations) {
    if (!nomination.isSpecial || !nomination.specialName) continue;
    if (nomination.price === null || nomination.price === undefined) continue;

    const key = specialNameLookupKey(nomination.specialName);
    const known = byName.get(key);
    if (known !== undefined && known !== nomination.price) {
      throw new BadRequestException(
        `${SPECIAL_NAME_PRICE_CONFLICT_MESSAGE} «${normalizeSpecialName(nomination.specialName)}»`,
      );
    }
    byName.set(key, nomination.price);
  }

  return byName;
}

export function specialGroupPrice(
  prices: Map<string, number>,
  specialName: string | null | undefined,
): number | null {
  if (!specialName) return null;
  return prices.get(specialNameLookupKey(specialName)) ?? null;
}
