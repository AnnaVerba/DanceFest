import type { FinanceSectionConfig } from './FinancePanel.types';

export const FINANCE_LOAD_ERROR_MESSAGE = 'Не вдалося завантажити фінанси.';
export const FINANCE_EMPTY_MESSAGE = 'На цей конкурс ще не подано жодної заявки.';
export const FINANCE_NO_MATCHES_MESSAGE = 'Нічого не знайдено.';
export const FINANCE_TOTAL_LABEL = 'Загальна сума по конкурсу';
export const FINANCE_UNSPECIFIED_NAME = 'Не вказано';
export const FINANCE_ENTRIES_COUNT_LABEL = 'Заявок';
export const FINANCE_AMOUNT_LABEL = 'Сума';

// Name, Заявок, Сума — spans the "no matches" row across the table.
export const FINANCE_COLUMN_COUNT = 3;
export const FINANCE_PAGE_SIZE = 20;
export const FINANCE_SEARCH_DEBOUNCE_MS = 300;

export const FINANCE_SECTIONS: FinanceSectionConfig[] = [
  {
    group: 'studios',
    title: 'Студії',
    nameLabel: 'Студія',
    searchPlaceholder: 'Пошук студії...',
  },
  {
    group: 'trainers',
    title: 'Керівники',
    nameLabel: 'Керівник',
    searchPlaceholder: 'Пошук керівника...',
  },
  {
    group: 'participants',
    title: 'Учасники',
    nameLabel: 'Учасник',
    searchPlaceholder: 'Пошук учасника...',
  },
];
