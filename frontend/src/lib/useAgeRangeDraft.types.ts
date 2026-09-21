import type { AgeRangeDraft } from './ageRange';

/**
 * Звідки в полях «від»/«до» їхній вміст:
 * - manual — ввів користувач, хук їх не чіпає;
 * - reference — підставлено з довідника, хук має право прибрати, коли назва
 *   перестала збігатись;
 * - reference-empty — назва збіглася з наявною категорією, але меж у довіднику
 *   немає, тож підставляти нічого й користувач вводить їх сам.
 */
export type AgeRangeSource = 'manual' | 'reference' | 'reference-empty';

export interface AgeRangeDraftState {
  draft: AgeRangeDraft;
  source: AgeRangeSource;
}

export interface AgeRangeDraftController extends AgeRangeDraftState {
  // Пояснення під полями або null, коли пояснювати нічого.
  hint: string | null;
  // Межі підставив довідник і користувач їх не редагував. Для виклику це
  // означає «меж не вводили»: значення довідника підтверджувати нічим.
  isFromReference: boolean;
  setName: (name: string) => void;
  setDraft: (next: AgeRangeDraft) => void;
  reset: () => void;
}
