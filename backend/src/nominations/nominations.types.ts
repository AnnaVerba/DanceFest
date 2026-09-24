import type { CategoryType } from '../categories/category.model';

// Raw query-string parameters of the paged admin list.
export interface NominationPageQuery {
  page?: string;
  pageSize?: string;
  // Comma-separated category ids; a nomination must carry all of them.
  categoryIds?: string;
  q?: string;
  // A venue id, or UNASSIGNED_VENUE_QUERY_VALUE for nominations without one.
  venue?: string;
}

// Значення однієї осі, як його бачить форма заявки: id для фільтра, назва
// для списку, межі — щоб форма сама зрозуміла, який склад чи вік підходить.
export interface NominationAxisValue {
  id: string;
  name: string;
  rangeFrom: number | null;
  rangeTo: number | null;
  // Пояснення значення для учасника; null — пояснення немає.
  description: string | null;
}

// Осі конкурсу: значення, які реально зустрічаються в його номінаціях, по
// одному списку на вісь. Вісь без жодного значення лишається порожнім масивом.
export type NominationAxes = Record<CategoryType, NominationAxisValue[]>;

// Сирі параметри вибірки номінацій під конкретну заявку.
export interface NominationEntryQuery {
  // Одне значення осі: номінація мусить містити саме його.
  league?: string;
  ageCategory?: string;
  // Кілька значень через кому: досить, щоб номінація містила будь-яке.
  styles?: string;
  // Кількість учасників номера: склад номінації мусить її вміщати.
  // Номінація без осі складу проходить: обмежувати її нема чим.
  participants?: string;
  // Вік кожного учасника номера через кому — коли вікову категорію ще не
  // обрано й підходить більш ніж одна.
  ages?: string;
}

// Сирі параметри вибірки спецномінацій під заявника. Стилю спецномінація
// не несе; склад — лише якщо організатор його проставив.
export interface NominationSpecialsQuery {
  // Id ліги: номінація мусить нести саме її.
  league?: string;
  // Id вікової категорії, яку обрав заявник.
  ageCategory?: string;
  // Вік кожного учасника номера через кому — поки категорію
  // ще не обрано.
  ages?: string;
  // Кількість учасників номера — як у NominationEntryQuery.
  participants?: string;
}

export interface VenueSummaryRow {
  categoryId: string;
  name: string;
  total: number;
  unassigned: number;
}

// Значення складу або ліги, що зустрічається в номінаціях конкурсу, і ціна,
// яку воно там має. `price` — null, коли номінації з цим значенням коштують
// по-різному (або якійсь із них ціну ще не задали).
export interface AxisPriceRow {
  categoryId: string;
  type: CategoryType;
  name: string;
  nominationCount: number;
  price: number | null;
}

export interface AxisPriceUpdateResult {
  updated: number;
}
