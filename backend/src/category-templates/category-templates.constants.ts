export const TEMPLATE_NOT_FOUND_MESSAGE = 'Шаблон не знайдено';
export const TEMPLATE_EDIT_AUTHOR_ONLY_MESSAGE =
  'Редагувати шаблон може лише його автор. Створіть власну копію.';
export const TEMPLATE_DELETE_AUTHOR_ONLY_MESSAGE =
  'Видалити шаблон може лише його автор';
export const TEMPLATE_CANNOT_BE_EMPTY_MESSAGE = 'Шаблон не може бути порожнім';
export const FORK_NAME_MUST_DIFFER_MESSAGE =
  'Назва копії має відрізнятися від назви оригіналу';
export const UNKNOWN_CATEGORIES_MESSAGE_PREFIX = 'Невідомі категорії';

// A generous ceiling above the largest template this app is sized for
// (5000 nominations) — the real guard against an unbounded payload, since
// the JSON body-size limit alone is just a byte count, not a business rule.
export const MAX_TEMPLATE_NOMINATIONS = 6000;

export const DEFAULT_TEMPLATE_NOMINATIONS_PAGE_SIZE = 20;
export const MAX_TEMPLATE_NOMINATIONS_PAGE_SIZE = 100;
