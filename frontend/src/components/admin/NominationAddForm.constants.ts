import {
  CATEGORY_TYPES,
  LEAGUE_CATEGORY_TYPE,
  STYLE_CATEGORY_TYPE,
} from '../../lib/categories';
import type { CategoryType } from '../../lib/categories';

// Без ліги й стилю форма заявки номінацію не покаже: вона питає номінації
// лише під обрані лігу та стиль.
export const REQUIRED_AXES: CategoryType[] = [LEAGUE_CATEGORY_TYPE, STYLE_CATEGORY_TYPE];
export const AXIS_REQUIRED_MESSAGE_PREFIX = 'Вкажіть значення осі';

// Порожній ввід осей форми «Додати»: '' — значення осі не задане.
export const EMPTY_AXIS_NAMES: Record<CategoryType, string> = CATEGORY_TYPES.reduce(
  (acc, type) => {
    acc[type] = '';
    return acc;
  },
  {} as Record<CategoryType, string>,
);

export const AXIS_ARIA_LABEL_SUFFIX = ' номінації';
export const AXIS_SUGGESTIONS_ID_PREFIX = 'nomination-add-suggestions-';
export const NOMINATION_ADD_FAILED_MESSAGE =
  'Не вдалося додати номінацію. Спробуйте ще раз.';
export const NOMINATION_DURATION_INVALID_MESSAGE =
  'Некоректна тривалість. Пишіть «2:30» або «150».';
export const NOMINATION_ADD_LABEL = 'Додати';
export const NOMINATION_ADDING_LABEL = 'Додавання…';
