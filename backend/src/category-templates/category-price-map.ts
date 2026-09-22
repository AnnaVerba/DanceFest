export interface CategoryPriceRow {
  categoryId: string;
  price: number;
}

// DECIMAL приїжджає з бази рядком, тому Number() тут, а не на місці виклику:
// інакше ціна порівнювалась би як текст і «700» не дорівнювало б 700.
export function priceMapOf(rows: CategoryPriceRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.categoryId, Number(row.price)]));
}
