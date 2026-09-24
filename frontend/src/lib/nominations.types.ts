import type { NominationInput } from './nominations';
import type { CategoryType } from './categories';

// The venue is set after a nomination exists, so it is only part of an update;
// null takes the nomination off its venue.
export type NominationUpdateInput = Partial<NominationInput> & {
  venueId?: string | null;
};

export interface NominationPageQuery {
  page: number;
  pageSize: number;
  // A nomination must carry every one of these.
  categoryIds: string[];
  q: string;
  // A venue id, UNASSIGNED_VENUE_VALUE, or undefined for any venue.
  venue?: string;
}

// Значення однієї осі конкурсу: id для фільтра номінацій, назва для списку,
// межі — щоб форма сама бачила, який склад чи вік підходить учасникам.
export interface NominationAxisValue {
  id: string;
  name: string;
  rangeFrom: number | null;
  rangeTo: number | null;
  // Пояснення значення для учасника; null — пояснення немає.
  description: string | null;
}

// Осі конкурсу — значення, що реально трапляються в його номінаціях. Вісь
// без значень приходить порожнім масивом.
export type NominationAxes = Record<CategoryType, NominationAxisValue[]>;

// Вибір, за яким форма заявки просить номінації: ліга і склад мусять
// збігтися, стиль — будь-який з обраних, вік — підійти кожному учаснику.
export interface NominationEntryFilter {
  // Точний збіг: номінація мусить нести саме це значення.
  league?: string;
  ageCategory?: string;
  // Будь-яке зі значень.
  styles: string[];
  // Кількість учасників: склад номінації мусить її вміщати. Номінація без
  // осі складу теж проходить.
  participants: number;
  // Вік кожного учасника — поки вікову категорію ще не обрано.
  ages: number[];
}

// Вибір, за яким форма заявки просить спецномінації. Стилю вони не несуть:
// ліга мусить збігтися, вік — підійти кожному учаснику номера, склад (якщо
// його проставили) — вмістити їхню кількість.
export interface NominationSpecialsFilter {
  league: string;
  // Обрана категорія: точний збіг, але номінація без вікової осі
  // проходить теж.
  ageCategory?: string;
  // Вік кожного учасника — поки категорію ще не обрано.
  ages: number[];
  participants: number;
}

export type VenueSummaryGroupBy = 'level' | 'age';

export interface VenueSummaryRow {
  categoryId: string;
  name: string;
  total: number;
  unassigned: number;
}

// Значення складу або ліги, що трапляється в номінаціях конкурсу, разом із
// ціною, яку воно там має. price — null, коли номінації з цим значенням
// коштують по-різному або ціни ще не мають.
export interface AxisPriceRow {
  categoryId: string;
  type: CategoryType;
  name: string;
  nominationCount: number;
  price: number | null;
}

export interface AxisPriceInput {
  categoryId: string;
  price: number;
}

export interface AxisPriceUpdateResult {
  updated: number;
}
