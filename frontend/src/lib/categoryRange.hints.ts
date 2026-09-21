import { AGE_CATEGORY_TYPE, LINEUP_CATEGORY_TYPE } from './categories';
import type { CategoryType } from './categories';

export const CATEGORY_RANGE_FROM_REFERENCE_HINT = 'межі з довідника';

// Значення є в довіднику, але без меж — пояснення різне для осей, бо
// користувач вводить різні речі.
export const CATEGORY_RANGE_REFERENCE_EMPTY_HINTS: Partial<
  Record<CategoryType, string>
> = {
  [AGE_CATEGORY_TYPE]:
    'У довіднику ця вікова категорія без меж — вкажіть їх, і вони збережуться.',
  [LINEUP_CATEGORY_TYPE]:
    'У довіднику цей склад без кількості людей — вкажіть її, і вона збережеться.',
};
