import type { Category, CategoryType } from './categories';

// Ціна задається лише на цих двох осях. Порядок важливий: перша, що знайшлась,
// перемагає, тому склад стоїть попереду ліги.
export const PRICED_AXES: CategoryType[] = ['lineup', 'level'];

export const AXIS_PRICE_KEY_SEPARATOR = ':';

// { "lineup:<id>": "700", "level:<id>": "450" } — ключ несе вісь, бо id значень
// різних осей ніде більше не зустрічаються поруч, і без осі мапа читалась би
// як випадковий набір uuid.
export type AxisPriceMap = Record<string, string>;

export function axisPriceKey(type: CategoryType, categoryId: string): string {
  return `${type}${AXIS_PRICE_KEY_SEPARATOR}${categoryId}`;
}

/**
 * Ціна номінації за її складом осей: **склад завжди перебиває лігу**. Дует у
 * лізі Debut коштує як дует, а не як Debut — інакше організатор мусив би
 * виправляти руками кожну парну номінацію.
 *
 * Ціни живуть у конкурсі, не в категорії: `categories` — спільний довідник, і
 * ціна на рядку «Дуо» стала б ціною дуету в усіх організаторів одразу.
 */
export function resolvePrice(
  categories: Category[],
  prices: AxisPriceMap,
): string {
  for (const axis of PRICED_AXES) {
    const value = categories.find((c) => c.type === axis);
    if (!value) continue;

    const price = prices[axisPriceKey(axis, value.id)]?.trim();
    if (price) return price;
  }
  return '';
}
