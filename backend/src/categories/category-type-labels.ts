import { CATEGORY_TYPES } from './category.model';
import type { CategoryType } from './category.model';

// Підписи осей живуть тут, а не в таблиці: значень рівно стільки, скільки
// членів enum, і окрема таблиця на них — це enum із зайвим join.
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  age: 'Вік',
  style: 'Стиль',
  level: 'Ліга',
  lineup: 'Склад',
  direction: 'Напрямок',
};

// Порядок показу критеріїв у шаблоні — той самий, що й у назві номінації.
export const CRITERIA_ORDER: CategoryType[] = [...CATEGORY_TYPES];
