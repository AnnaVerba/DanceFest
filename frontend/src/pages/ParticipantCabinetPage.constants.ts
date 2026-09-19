// Column headings of the entries table. Each cell repeats its heading as
// `data-label`, which the phone layout shows beside the value.
export const ENTRY_COLUMN_LABEL = {
  NUMBER: '№',
  PARTICIPANT: 'Учасник',
  PARTICIPANT_NUMBERS: '№ учасника',
  NOMINATION: 'Номінація',
  LEAGUE: 'Ліга',
  LINEUP: 'Склад',
  AGE_CATEGORY: 'Вік. кат.',
  MUSIC: 'Музика',
  AMOUNT: 'Вартість',
} as const;

// Number of columns before AMOUNT — how far the total row's label cell spans.
export const ENTRY_COLUMN_COUNT_BEFORE_AMOUNT =
  Object.keys(ENTRY_COLUMN_LABEL).length - 1;

export const ENTRY_TOTAL_LABEL = 'Разом';
export const ENTRY_PARTICIPANT_TOTALS_LABEL = 'Сума по учасниках';
export const ENTRY_GRAND_TOTAL_LABEL = 'Загальна сума';
