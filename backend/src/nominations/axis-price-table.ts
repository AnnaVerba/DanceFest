import { PRICED_AXES } from '../categories/priced-axes';
import type { CategoryType } from '../categories/category.model';

export interface AxisPricedCategory {
  categoryId: string;
  type: CategoryType;
  price: number;
}

/**
 * Ціни, задані на значеннях осей, у вигляді, придатному для пошуку ціни
 * номінації. Правило одне на весь застосунок: перемагає перша вісь із
 * PRICED_AXES, тобто склад перебиває лігу — дует у лізі «Дебют» коштує як
 * дует, інакше організатор мусив би виправляти руками кожну парну номінацію.
 */
export class AxisPriceTable {
  private readonly byAxis = new Map<CategoryType, Map<string, number>>();

  constructor(prices: AxisPricedCategory[]) {
    for (const { categoryId, type, price } of prices) {
      const axis = this.byAxis.get(type) ?? new Map<string, number>();
      axis.set(categoryId, price);
      this.byAxis.set(type, axis);
    }
  }

  /** Ціна номінації з такими значеннями осей, або null, якщо жодна не задана. */
  priceFor(categoryIds: string[]): number | null {
    for (const axis of PRICED_AXES) {
      const prices = this.byAxis.get(axis);
      if (!prices) continue;

      for (const categoryId of categoryIds) {
        const price = prices.get(categoryId);
        if (price !== undefined) return price;
      }
    }
    return null;
  }
}
