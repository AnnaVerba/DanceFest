import {
  axisPriceEntries,
  axisPriceKey,
  isValidAxisPrice,
} from './nominationPricing';
import type { AxisPriceMap } from './nominationPricing';
import { isDraftCategory } from './nominationSet';
import type {
  TemplateCategoryPrice,
  TemplateCategoryPriceInput,
} from './categoryTemplates';
import type { Category } from './categories';
import {
  AXIS_PRICE_CATEGORY_PLACEHOLDER,
  INVALID_AXIS_PRICE_MESSAGE_TEMPLATE,
} from './templateCategoryPrices.constants';

// Сервер тримає ціни рядками таблиці, форма — мапою «вісь:категорія → ціна».
// Переклад між ними живе тут, щоб жодна сторінка не знала обох форм одразу.
export function toAxisPriceMap(prices: TemplateCategoryPrice[]): AxisPriceMap {
  return prices.reduce<AxisPriceMap>((map, price) => {
    map[axisPriceKey(price.type, price.categoryId)] = String(price.price);
    return map;
  }, {});
}

/**
 * Ціна може стояти на значенні осі, якого на сервері ще немає — його id тоді
 * draft-ний. `idByDraftId` — результат resolveDraftCategories: щойно створені
 * категорії вже мають справжні id. Ціна на чернетці, яку так і не створили
 * (жодна номінація її не використала), відкидається — прив'язати її нема до чого.
 */
export function toCategoryPriceInputs(
  prices: AxisPriceMap,
  idByDraftId: Map<string, string>,
): TemplateCategoryPriceInput[] {
  return axisPriceEntries(prices)
    .map(({ categoryId, price }) => ({
      categoryId: idByDraftId.get(categoryId) ?? categoryId,
      price: Number(price),
    }))
    .filter((entry) => !isDraftCategory(entry.categoryId));
}

/**
 * Ціна за значенням осі, яку не можна зберегти. Повертає готове повідомлення,
 * бо жодна зі сторінок не має іншої причини знати будову мапи цін.
 */
export function findInvalidAxisPriceMessage(
  prices: AxisPriceMap,
  knownCategories: Category[],
): string | null {
  const bad = axisPriceEntries(prices).find(
    (entry) => !isValidAxisPrice(entry.price),
  );
  if (!bad) return null;

  const name =
    knownCategories.find((category) => category.id === bad.categoryId)?.name ??
    bad.categoryId;
  return INVALID_AXIS_PRICE_MESSAGE_TEMPLATE.replace(
    AXIS_PRICE_CATEGORY_PLACEHOLDER,
    name,
  );
}
