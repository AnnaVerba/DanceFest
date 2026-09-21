import { LEAGUE_CATEGORY_TYPE, LINEUP_CATEGORY_TYPE } from './category.model';
import type { CategoryType } from './category.model';

// Осі, на значеннях яких задається ціна. Порядок значущий: перша знайдена
// перемагає, тому склад стоїть попереду ліги — дует у лізі «Дебют» коштує як
// дует, інакше організатор мусив би виправляти руками кожну парну номінацію.
export const PRICED_AXES: CategoryType[] = [
  LINEUP_CATEGORY_TYPE,
  LEAGUE_CATEGORY_TYPE,
];

export function isPricedAxis(type: CategoryType): boolean {
  return PRICED_AXES.includes(type);
}
