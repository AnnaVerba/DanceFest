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

// Порядок показу критеріїв — той самий, що й порядок частин у назві
// номінації: Вік · Стиль · Ліга · Склад. Виводити його з CATEGORY_TYPES не
// можна: там порядок оголошення enum, і Ліга стоїть попереду Стилю.
// 'direction' — остання, бо не використовується жодним екраном.
export const CRITERIA_ORDER: CategoryType[] = [
  'age',
  'style',
  'level',
  'lineup',
  'direction',
];
