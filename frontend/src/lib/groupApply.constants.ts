export const LINEUP_MODE = {
  COUNT: 'count',
  NAMED: 'named',
} as const;

export const LINEUP_MODE_LABEL = {
  [LINEUP_MODE.COUNT]: 'Лише кількість',
  [LINEUP_MODE.NAMED]: 'Внести учасників',
} as const;

// A group has no minimum size of its own — one dancer is the least a number has.
export const GROUP_MIN_HEADCOUNT = 1;
// The server's cap on the dancers of one number (MAX_ENTRY_PARTICIPANTS).
export const GROUP_MAX_PARTICIPANTS = 200;
// The server's cap on a number's name (the routineName column).
export const GROUP_NAME_MAX_LENGTH = 255;
// What a typed headcount reads as while it is empty or not a whole number.
export const NO_HEADCOUNT = 0;

export const GROUP_NAME_LABEL = 'Назва колективу';
export const GROUP_NAME_PLACEHOLDER = 'Наприклад, «Аміра» — старша група';
export const GROUP_HEADCOUNT_LABEL = 'Кількість учасників';
export const GROUP_LINEUP_LABEL = 'Склад';
// This tab registers groups only, so the line-up always reads «Група».
export const GROUP_LINEUP_VALUE = 'Група';
export const GROUP_EMPTY_VALUE_LABEL = '—';
export const GROUP_LINEUP_HINT =
  'Визначається автоматично за кількістю учасників.';
export const GROUP_PARTICIPANTS_LABEL = 'Учасники колективу';

export const GROUP_NOMINATIONS_NONE_SELECTED_HINT = 'Номінації не обрані.';
export const NO_GROUP_NOMINATIONS_MESSAGE =
  'Немає номінацій для цієї кількості учасників.';

export const GROUP_NAME_REQUIRED_MESSAGE = 'Вкажіть назву колективу.';
export const GROUP_NAME_TAKEN_MESSAGE =
  'Колектив з такою назвою вже існує в цьому конкурсі.';
export const GROUP_HEADCOUNT_REQUIRED_MESSAGE = `Вкажіть кількість учасників.`;
export const GROUP_PARTICIPANTS_REQUIRED_MESSAGE = `Оберіть хоча б одного учасника.`;
