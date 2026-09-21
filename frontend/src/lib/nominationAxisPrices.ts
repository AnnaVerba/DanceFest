import { axisPriceEntries, axisPriceKey } from './nominationPricing';
import type { AxisPriceMap } from './nominationPricing';
import type { AxisPriceInput, AxisPriceRow } from './nominations.types';

// Сервер тримає ціни рядками «значення осі → ціна», форма — мапою полів.
// Переклад між ними живе тут, щоб панель не знала обох форм одразу.
export function axisPricesFromRows(rows: AxisPriceRow[]): AxisPriceMap {
  return rows.reduce<AxisPriceMap>((map, row) => {
    if (row.price !== null) {
      map[axisPriceKey(row.type, row.categoryId)] = String(row.price);
    }
    return map;
  }, {});
}

// Порожнє поле означає «не чіпати це значення», тому до сервера йдуть лише
// заповнені — їх і відбирає axisPriceEntries.
export function axisPriceInputs(prices: AxisPriceMap): AxisPriceInput[] {
  return axisPriceEntries(prices).map(({ categoryId, price }) => ({
    categoryId,
    price: Number(price),
  }));
}
