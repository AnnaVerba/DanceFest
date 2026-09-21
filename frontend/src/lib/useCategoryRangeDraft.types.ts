import type { CategoryRangeDraft } from './categoryRange';

/**
 * Звідки в полях меж їхній вміст:
 * - manual — ввів користувач, хук їх не чіпає;
 * - reference — підставлено з довідника, хук має право прибрати, коли назва
 *   перестала збігатись;
 * - reference-empty — назва збіглася з наявним значенням, але меж у довіднику
 *   немає, тож підставляти нічого й користувач вводить їх сам.
 */
export type CategoryRangeSource = 'manual' | 'reference' | 'reference-empty';

export interface CategoryRangeDraftState {
  draft: CategoryRangeDraft;
  source: CategoryRangeSource;
}

export interface CategoryRangeDraftController extends CategoryRangeDraftState {
  // Пояснення під полями або null, коли пояснювати нічого.
  hint: string | null;
  // Межі підставив довідник і користувач їх не редагував. Для виклику це
  // означає «меж не вводили»: значення довідника підтверджувати нічим.
  isFromReference: boolean;
  setName: (name: string) => void;
  setDraft: (next: CategoryRangeDraft) => void;
  reset: () => void;
}
