export const NOMINATION_NOT_FOUND_MESSAGE = 'Номінацію не знайдено';
export const NOMINATION_NOT_IN_COMPETITION_MESSAGE =
  'Цю номінацію не знайдено серед номінацій конкурсу';
export const NOMINATION_LEAGUE_REQUIRED_MESSAGE =
  'Кожна номінація повинна мати лігу. Без ліги';
export const SOME_NOMINATIONS_NOT_IN_COMPETITION_MESSAGE =
  'Деякі номінації не знайдено серед номінацій конкурсу';
export const NOMINATION_BULK_SELECTOR_REQUIRED_MESSAGE =
  'Вкажіть список номінацій або фільтр — але не обидва й не жодного';
export const NO_NOMINATIONS_MATCHED_MESSAGE =
  'Жодна номінація не відповідає вибору';
export const VENUE_NOT_IN_COMPETITION_MESSAGE =
  'Цей майданчик не знайдено серед майданчиків конкурсу';

export const DEFAULT_NOMINATIONS_PAGE_SIZE = 50;
export const MAX_NOMINATIONS_PAGE_SIZE = 200;
export const LIST_QUERY_SEPARATOR = ',';
export const UNASSIGNED_VENUE_QUERY_VALUE = 'none';

export const SPECIAL_NAME_WHITESPACE_PATTERN = /\s+/g;
export const SPECIAL_NAME_NON_BLANK_PATTERN = /\S/;
export const SPECIAL_GROUP_KEY_SEPARATOR = '|';
export const SPECIAL_NAME_REQUIRED_MESSAGE =
  'Вкажіть назву спеціальної номінації';
export const SPECIAL_NAME_PRICE_CONFLICT_MESSAGE =
  'Для спеціальної номінації вказано різні ціни';
export const SPECIAL_PRICE_CONFLICT_NAME_PLACEHOLDER = '{name}';
export const SPECIAL_PRICE_CONFLICT_PRICE_PLACEHOLDER = '{price}';
export const SPECIAL_PRICE_CONFLICT_MESSAGE_TEMPLATE =
  'Для «{name}» уже задано ціну {price} грн. Вкажіть таку саму ціну або змініть її для всіх номінацій із цією назвою в наявній номінації.';

// Ціни за складом і лігою, задані руками для одного конкурсу.
export const MIN_AXIS_PRICE = 0;
export const MAX_AXIS_PRICES_PER_REQUEST = 200;
export const AXIS_PRICE_WRONG_AXIS_MESSAGE =
  'Ціну можна задати лише за складом або лігою';
export const AXIS_PRICE_DUPLICATE_MESSAGE =
  'Для одного значення вказано дві різні ціни';
export const AXIS_PRICE_NOT_IN_COMPETITION_MESSAGE =
  'Це значення не використовує жодна номінація конкурсу';
