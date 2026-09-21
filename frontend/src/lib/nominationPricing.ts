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

export interface AxisPriceEntry {
  type: CategoryType;
  categoryId: string;
  price: string;
}

// Розбирає мапу назад у пари «категорія → ціна». Порожнє поле пропускається:
// воно означає «ціни немає», а не нуль. Некоректні значення лишаються — їх
// знаходить isValidAxisPrice, бо мовчки викинута ціна і є те, чого не можна.
export function axisPriceEntries(prices: AxisPriceMap): AxisPriceEntry[] {
  const entries: AxisPriceEntry[] = [];

  for (const [key, raw] of Object.entries(prices)) {
    const price = raw?.trim();
    if (!price) continue;

    const separator = key.indexOf(AXIS_PRICE_KEY_SEPARATOR);
    if (separator === -1) continue;
    entries.push({
      type: key.slice(0, separator) as CategoryType,
      categoryId: key.slice(separator + 1),
      price,
    });
  }
  return entries;
}

/**
 * Ціна номінації за її складом осей: **склад завжди перебиває лігу**. Дует у
 * лізі Debut коштує як дует, а не як Debut — інакше організатор мусив би
 * виправляти руками кожну парну номінацію.
 *
 * Ціни не живуть у категорії: `categories` — спільний довідник без власника,
 * і ціна на рядку «Дуо» стала б ціною дуету в усіх організаторів одразу. Вони
 * належать шаблону (template_category_prices) або конкурсу.
 */
export function isValidAxisPrice(price: string): boolean {
  return Number(price) >= 0;
}

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
