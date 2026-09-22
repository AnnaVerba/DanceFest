import { PRICED_AXES } from '../categories/priced-axes';
import type { Category } from '../categories/category.model';

/**
 * Ціна за осями номінації: **склад перебиває лігу**. Дует у лізі «Дебют»
 * коштує як дует, а не як «Дебют».
 *
 * Вісь без ціни пропускається, а не обнуляє результат: якщо ціни задані лише
 * по лігах, номінація з «Дуо» бере ціну своєї ліги.
 */
export function resolveAxisPrice(
  categoryIds: string[],
  categoryById: Map<string, Category>,
  priceByCategoryId: Map<string, number>,
): number | null {
  const categories = categoryIds
    .map((id) => categoryById.get(id))
    .filter((category): category is Category => category !== undefined);

  for (const axis of PRICED_AXES) {
    const value = categories.find((category) => category.type === axis);
    if (!value) continue;

    const price = priceByCategoryId.get(value.id);
    if (price !== undefined) return price;
  }
  return null;
}
